import React, { ReactNode } from 'react';

export interface CardProps {
  title?: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  style?: React.CSSProperties;
}

export function Card({
  title,
  meta,
  actions,
  children,
  footer,
  className = '',
  bodyClassName = '',
  style,
}: CardProps) {
  const hasHeader = Boolean(title || actions);
  return (
    <div className={`ds-card ${className}`} style={style}>
      {hasHeader && (
        <div className="ds-card-header">
          <div>
            {title && <h3 className="ds-card-title">{title}</h3>}
            {meta && <div className="ds-card-meta">{meta}</div>}
          </div>
          {actions && <div className="ds-card-actions">{actions}</div>}
        </div>
      )}
      <div className={`ds-card-body ${bodyClassName}`}>{children}</div>
      {footer && <div className="ds-card-footer">{footer}</div>}
    </div>
  );
}
