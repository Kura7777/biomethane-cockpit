import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getPageTitle } from './navConfig';

/** HH:MM:SS in the viewer's local time. Exported so it can be unit tested without rendering. */
export function formatClock(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const pageTitle = getPageTitle(location.pathname);

  return (
    <header className="h-10 flex-none flex items-center justify-between px-4 bg-surface-raised border-b border-border-subtle z-50">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={() => navigate('/sourcing')}
          className="font-mono text-xs font-semibold tracking-[0.12em] uppercase text-content-primary hover:text-accent transition-colors cursor-pointer shrink-0"
        >
          Biomethane Desk Cockpit
        </button>
        <span className="text-content-secondary" aria-hidden="true">/</span>
        <span className="font-mono text-xs font-semibold tracking-[0.08em] uppercase text-content-secondary truncate">
          {pageTitle}
        </span>
      </div>
      <div className="font-num text-xs text-content-secondary shrink-0" aria-label={`Local time ${formatClock(now)}`}>
        {formatClock(now)}
      </div>
    </header>
  );
}
