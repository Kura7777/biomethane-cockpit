import React, { useState, useEffect } from 'react';

type ToastListener = (message: string, variant?: string) => void;
const listeners = new Set<ToastListener>();

export function showToast(message: string, _variant?: string) {
  listeners.forEach(fn => fn(message, _variant));
}

export function DeskToastContainer() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const handleToast: ToastListener = msg => {
      if (timer) clearTimeout(timer);
      setToast(msg);
      timer = setTimeout(() => {
        setToast(null);
      }, 3600);
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
        bottom: '44px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 110,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        background: 'var(--color-text)',
        color: 'var(--color-bg)',
        boxShadow: 'var(--shadow-lg)',
      }}
      role="status"
      aria-live="polite"
    >
      <span style={{ width: '8px', height: '8px', background: 'var(--color-accent)', flex: 'none' }} />
      <span style={{ fontSize: '13px', fontWeight: 600 }}>{toast}</span>
    </div>
  );
}
