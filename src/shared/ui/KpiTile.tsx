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
      {sub && <div className="ds-kpi-sub num">{sub}</div>}
      {barPercent !== undefined && (
        <div className="ds-kpi-bar-track">
          <div className="ds-kpi-bar-fill" style={{ width: `${Math.min(100, Math.max(0, barPercent))}%` }} />
        </div>
      )}
    </div>
  );
}

export interface KpiRowProps {
  children: ReactNode;
  columns?: number;
  className?: string;
}

export function KpiRow({ children, columns = 4, className = '' }: KpiRowProps) {
  const gridStyle = columns ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` } : undefined;
  return (
    <div className={`ds-kpis ${className}`} style={gridStyle}>
      {children}
    </div>
  );
}
