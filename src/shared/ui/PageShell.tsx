import React, { ReactNode } from 'react';

export interface PageShellProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function PageShell({ children, className = '', style }: PageShellProps) {
  return (
    <div className={`ds-page-shell ${className}`} style={style}>
      {children}
    </div>
  );
}
