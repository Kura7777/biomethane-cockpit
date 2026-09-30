import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../shared/hooks/useMediaQuery';

export interface ToastOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** Auto-dismiss delay in ms. Toasts with an action stay put unless this is given. */
  durationMs?: number;
}

interface ToastState {
  message: string;
  variant?: string;
  options?: ToastOptions;
}

type ToastListener = (message: string, variant?: string, options?: ToastOptions) => void;
const listeners = new Set<ToastListener>();

/**
 * Shows a toast. Backwards compatible with the original 1-2 arg call; the optional 3rd
 * argument adds an action button (e.g. "Reload") and/or a custom auto-dismiss delay. A toast
 * with an action does not auto-dismiss unless durationMs is also given.
 */
export function showToast(message: string, variant?: string, options?: ToastOptions) {
  listeners.forEach(fn => fn(message, variant, options));
}

const DEFAULT_DURATION_MS = 3600;

export function DeskToastContainer() {
  const [toast, setToast] = useState<ToastState | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const handleToast: ToastListener = (message, variant, options) => {
      if (timer) clearTimeout(timer);
      setToast({ message, variant, options });

      const hasAction = !!options?.actionLabel;
      const duration = options?.durationMs ?? (hasAction ? null : DEFAULT_DURATION_MS);
      if (duration !== null) {
        timer = setTimeout(() => setToast(null), duration);
      }
    };

    listeners.add(handleToast);
    return () => {
      listeners.delete(handleToast);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        // Compact layout: the toast rides under the header, never over the tab bar or a sticky
        // action bar's buttons.
        ...(isMobile ? { top: 'calc(52px + env(safe-area-inset-top))' } : { bottom: '44px' }),
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1100, // matches --z-toast in index.css
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: isMobile ? 'calc(100vw - 32px)' : undefined,
        padding: '10px 16px',
        background: 'var(--color-text)',
        color: 'var(--color-bg)',
        boxShadow: 'var(--shadow-lg)',
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ width: '8px', height: '8px', background: 'var(--color-accent)', flex: 'none' }} />
      <span style={{ fontSize: '13px', fontWeight: 600, whiteSpace: isMobile ? 'normal' : 'nowrap', wordBreak: 'break-word' }}>
        {toast.message}
      </span>
      {toast.options?.actionLabel && (
        <button
          type="button"
          onClick={() => {
            toast.options?.onAction?.();
            setToast(null);
          }}
          style={{
            flex: 'none',
            background: 'none',
            border: 'none',
            padding: 0,
            marginLeft: '4px',
            color: 'var(--color-accent-400, #ee7b6e)',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          {toast.options.actionLabel}
        </button>
      )}
    </div>
  );
}
