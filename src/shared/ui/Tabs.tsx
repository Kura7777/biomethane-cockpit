import React, { ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  id: T;
  label: ReactNode;
  badge?: ReactNode;
}

export interface TabsProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
}

export function Tabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className = '',
  ariaLabel = 'Sections',
}: TabsProps<T>) {
  return (
    <div className={`ds-tabs ${className}`} role="tablist" aria-label={ariaLabel}>
      {tabs.map(tab => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`ds-tab fe-tab ${isActive ? 'active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            <span>{tab.label}</span>
            {tab.badge !== undefined && <span className="num">{tab.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
