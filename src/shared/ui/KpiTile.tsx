import React, { ReactNode } from 'react';

export interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  unit?: string;
  sub?: ReactNode;
  barPercent?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function KpiTile({ label, value, unit, sub, barPercent, className = '', style }: KpiTileProps) {
  return (
    <div className={`ds-kpi-card ${className}`} style={style}>
      <div className="ds-kpi-label">{label}</div>
      <div className="ds-kpi-value num">
        {value} {unit && <span className="unit">{unit}</span>}
      </div>
      {barPercent !== undefined && (
        <div className="ds-kpi-bar-track">
          <div className="ds-kpi-bar-fill" style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }} />
        </div>
      )}
      {sub && <div className="ds-kpi-sub num">{sub}</div>}
    </div>
  );
}

export interface KpiRowProps {
  children: ReactNode;
  columns?: number;
  className?: string;
}

export function KpiRow({ children, columns = 4, className = '' }: KpiRowProps) {
  // Column count is a class (ds-kpis-cols-N → --ds-kpis-columns in desk.css), not an inline
  // style, so mobile.css's 2-column override can win purely on cascade order.
  const colsClass = columns ? `ds-kpis-cols-${columns}` : '';
  return (
    <div className={`ds-kpis ${colsClass} ${className}`}>
      {children}
    </div>
  );
}
