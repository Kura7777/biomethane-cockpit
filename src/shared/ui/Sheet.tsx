import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useIsMobile } from '../hooks/useMediaQuery';

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Mobile (<768px) presentation. Default 'bottom'. */
  variant?: 'bottom' | 'full';
  /** >=768px presentation. Default 'center'. 'inline' renders children in place with no overlay when open. */
  desktop?: 'center' | 'right' | 'inline';
  /** Sticky footer (actions). */
  footer?: React.ReactNode;
  ariaLabel?: string;
  testId?: string;
  children: React.ReactNode;
}

// Nested/overlapping sheets share one lock counter so the last one to close is the one that
// restores scroll.
let lockCount = 0;
function lockScroll() {
  lockCount += 1;
  if (lockCount === 1) {
    document.body.style.overflow = 'hidden';
    const main = document.getElementById('main-content') as HTMLElement | null;
    if (main) {
      main.dataset.sheetLocked = main.style.overflow || 'auto';
      main.style.overflow = 'hidden';
    }
  }
}
function unlockScroll() {
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = '';
    const main = document.getElementById('main-content') as HTMLElement | null;
    if (main) {
      main.style.overflow = main.dataset.sheetLocked || '';
      delete main.dataset.sheetLocked;
    }
  }
}

const DRAG_CLOSE_THRESHOLD = 80;

/**
 * Shared dialog/sheet primitive. Below 768px it presents as a bottom (or full-screen) sheet
 * with a drag handle; at 768px+ it presents as a centered or right-docked dialog (or, with
 * desktop="inline", as plain in-place content with no overlay at all). Used by NavSheet and
 * DeskSheet today; feature agents can reach for it for any modal/drawer pattern.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  variant = 'bottom',
  desktop = 'center',
  footer,
  ariaLabel,
  testId,
  children,
}: SheetProps) {
  const isMobile = useIsMobile();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [dragY, setDragY] = useState(0);
  const dragging = useRef(false);
  const dragStartY = useRef(0);

  const inlineDesktop = desktop === 'inline' && !isMobile;

  // Scroll lock + focus management for the portal-based (non-inline) presentation only.
  useEffect(() => {
    if (inlineDesktop) return;
    if (!open) return;

    lockScroll();
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const focusTimer = setTimeout(() => panelRef.current?.focus(), 10);

    return () => {
      clearTimeout(focusTimer);
      unlockScroll();
      previouslyFocused.current?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inlineDesktop]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setDragY(0);
  }, [open]);

  if (!open) return null;

  const isBottomOnMobile = isMobile && variant === 'bottom';

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isBottomOnMobile) return;
    dragging.current = true;
    dragStartY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - dragStartY.current;
    setDragY(Math.max(0, delta));
  };
  const handlePointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;
    if (dragY > DRAG_CLOSE_THRESHOLD) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  if (inlineDesktop) {
    return (
      <div className="sheet-inline" data-testid={testId} aria-label={ariaLabel}>
        {(title || subtitle) && (
          <div className="sheet-header sheet-header--inline">
            <div>
              {title && <div className="sheet-title">{title}</div>}
              {subtitle && <div className="sheet-subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    );
  }

  const desktopVariant = isMobile ? 'bottom' : desktop === 'inline' ? 'center' : desktop;
  const effectiveVariant = isMobile ? variant : 'dialog';

  return createPortal(
    <div
      className="sheet-overlay"
      onMouseDown={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className={`sheet-panel sheet-panel--${effectiveVariant === 'dialog' ? `desktop-${desktopVariant}` : effectiveVariant}`}
        style={isBottomOnMobile && dragY ? { transform: `translateY(${dragY}px)`, transition: 'none' } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || (typeof title === 'string' ? title : undefined)}
        data-testid={testId}
        tabIndex={-1}
      >
        {variant === 'bottom' && isMobile && (
          <div
            className="sheet-drag-handle-wrap"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <div className="sheet-drag-handle" aria-hidden="true" />
          </div>
        )}
        {(title || subtitle) && (
          <div className="sheet-header">
            <div className="sheet-header-text">
              {title && <div className="sheet-title">{title}</div>}
              {subtitle && <div className="sheet-subtitle">{subtitle}</div>}
            </div>
            <button type="button" className="sheet-close" onClick={onClose} aria-label="Close">
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
