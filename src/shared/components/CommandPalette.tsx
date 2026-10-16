import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { showToast } from '../../app/DeskToastContainer';
import { NAV_GROUPS, ASK_NAV_ITEM } from '../../app/navConfig';

interface PaletteItem {
  id: string;
  kind: 'Screen' | 'Action';
  label: string;
  hint: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { dispatch } = useAppState();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  const allItems: PaletteItem[] = useMemo(() => [
    // Screens come from the same nav config as the header menus, so the palette never drifts.
    ...[...NAV_GROUPS.flatMap(g => g.items), ASK_NAV_ITEM].map<PaletteItem>(item => ({
      kind: 'Screen',
      label: item.label,
      hint: item.keyHint,
      id: `s-${item.to}`,
      run: () => { navigate(item.to); onClose(); },
    })),
    {
      kind: 'Action',
      label: 'Price certificates and molecules on bid',
      hint: '',
      id: 'a-bid',
      run: () => {
        dispatch({ type: 'SET_PRICING_SIDE', side: 'bid' });
        showToast('Pricing side switched to Bid');
        onClose();
      },
    },
    {
      kind: 'Action',
      label: 'Price certificates and molecules on mid',
      hint: '',
      id: 'a-mid',
      run: () => {
        dispatch({ type: 'SET_PRICING_SIDE', side: 'mid' });
        showToast('Pricing side switched to Mid');
        onClose();
      },
    },
    {
      kind: 'Action',
      label: 'Price certificates and molecules on offer',
      hint: '',
      id: 'a-offer',
      run: () => {
        dispatch({ type: 'SET_PRICING_SIDE', side: 'offer' });
        showToast('Pricing side switched to Offer');
        onClose();
      },
    },
  ], [navigate, onClose, dispatch]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allItems;
    return allItems.filter(i => i.label.toLowerCase().includes(q) || i.kind.toLowerCase().includes(q));
  }, [allItems, query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].run();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="scrim m-dialog-scrim"
      style={{
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '88px 24px',
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={onClose}
    >
      <div
        className="panel m-dialog"
        style={{
          width: 'min(620px, 100%)',
          maxHeight: '60vh',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="m-dialog-header"
          style={{
            padding: '12px 16px',
            borderBottom: '2px solid var(--color-divider)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--color-bg)',
          }}
        >
          <span className="eyebrow">Command</span>
          <input
            ref={inputRef}
            className="input"
            style={{
              border: 0,
              background: 'transparent',
              fontSize: '15px',
              padding: 0,
              minHeight: 'auto',
            }}
            placeholder="Jump to a screen or run an action"
            aria-label="Command palette search"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
          />
          <span className="num mut" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
            Esc to close
          </span>
        </div>
        <div ref={listRef} className="noscroll m-dialog-body" style={{ overflowY: 'auto' }}>
          {filteredItems.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '13px' }} className="mut">
              No matching commands or screens for &quot;{query}&quot;
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <a
                  key={item.id}
                  className="plist"
                  href="#"
                  style={{
                    backgroundColor: isSelected ? 'var(--color-surface)' : undefined,
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={e => {
                    e.preventDefault();
                    item.run();
                  }}
                >
                  <span className="eyebrow" style={{ width: '52px', flex: 'none' }}>
                    {item.kind}
                  </span>
                  <span style={{ flex: 1, fontSize: '14px', color: 'var(--color-text)' }}>
                    {item.label}
                  </span>
                  <span className="num mut" style={{ fontSize: '11px' }}>
                    {item.hint}
                  </span>
                </a>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
