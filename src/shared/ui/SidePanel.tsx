import React, { ReactNode } from 'react';

export interface SidePanelProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function SidePanel({ children, footer, className = '', style }: SidePanelProps) {
  return (
    <aside className={`ds-aside ${className}`} style={style}>
      <div className="ds-aside-body">{children}</div>
      {footer && <div className="ds-aside-footer">{footer}</div>}
    </aside>
  );
}

export interface PanelSectionProps {
  children: ReactNode;
  className?: string;
}

export function PanelSection({ children, className = '' }: PanelSectionProps) {
  return <div className={`ds-aside-section ${className}`}>{children}</div>;
}
