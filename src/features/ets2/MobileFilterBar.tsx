import React, { useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Sheet } from '../../shared/ui';
import './mobileFilters.css';

export interface SortOption {
  value: string;
  label: string;
}

/**
 * Mobile stand-in for a desk toolbar: search + a "Filters" button that opens a bottom Sheet,
 * plus a compact sort select (header sorting disappears when the table becomes cards).
 * Only rendered below 768px; desktop keeps its own toolbar.
 */
export function MobileFilterBar(props: {
  search: string;
  onSearch: (v: string) => void;
  searchPlaceholder: string;
  searchLabel: string;
  activeCount: number;
  sheetTitle?: string;
  sortLabel?: string;
  sortValue: string;
  sortOptions: SortOption[];
  onSort: (v: string) => void;
  /** Rendered inside the Filters sheet. */
  children: React.ReactNode;
  /** Rendered above the search row (e.g. a view switch). */
  above?: React.ReactNode;
  onReset?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const options = props.sortOptions.some(o => o.value === props.sortValue)
    ? props.sortOptions
    : [...props.sortOptions, { value: props.sortValue, label: 'Custom order' }];
  return (
    <div className="mfb">
      {props.above}
      <div className="mfb-row">
        <label className="mfb-search">
          <Search size={16} aria-hidden="true" />
          <input placeholder={props.searchPlaceholder} aria-label={props.searchLabel} value={props.search} onChange={e => props.onSearch(e.target.value)} />
        </label>
        <button type="button" className={`mfb-btn ${props.activeCount > 0 ? 'active' : ''}`} onClick={() => setOpen(true)} aria-label="Open filters" data-testid="mobile-filters-btn">
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{props.activeCount > 0 && <span className="mfb-count">{props.activeCount}</span>}
        </button>
      </div>
      <label className="mfb-sort">
        <span>{props.sortLabel ?? 'Sort'}</span>
        <select aria-label="Sort by" value={props.sortValue} onChange={e => props.onSort(e.target.value)}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={props.sheetTitle ?? 'Filters'}
        variant="bottom"
        testId="mobile-filters-sheet"
        footer={
          <div className="mfb-foot">
            {props.onReset && <button type="button" className="btn btn-ghost" onClick={props.onReset}>Reset</button>}
            <button type="button" className="btn btn-primary" onClick={() => setOpen(false)}>Done</button>
          </div>
        }
      >
        <div className="mfb-sheet">{props.children}</div>
      </Sheet>
    </div>
  );
}

export function SheetField(props: { label: string; children: React.ReactNode }) {
  return (
    <div className="mfb-field">
      <span className="mfb-field-label">{props.label}</span>
      {props.children}
    </div>
  );
}
