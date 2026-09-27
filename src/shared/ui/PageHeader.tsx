import React, { ReactNode } from 'react';

export interface PageHeaderProps {
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, context, actions, className = '' }: PageHeaderProps) {
  return (
    <header className={`ds-header ${className}`}>
      <div>
        <h1 className="ds-h1">{title}</h1>
        {context && <div className="ds-context">{context}</div>}
      </div>
      {actions && <div className="ds-header-actions">{actions}</div>}
    </header>
  );
}

export interface HeaderPillProps {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  warn?: boolean;
  title?: string;
  className?: string;
}

export function HeaderPill({ label, value, sub, warn, title, className = '' }: HeaderPillProps) {
  return (
    <div className={`ds-pill ${className}`} title={title}>
      {warn !== undefined && <span className={`ds-dot ${warn ? 'warn' : ''}`} />}
      <span className="ds-pill-label">{label}</span>
      <span className="ds-pill-value num">{value}</span>
      {sub && <span className="ds-pill-sub num">{sub}</span>}
    </div>
  );
}
