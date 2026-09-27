import React, { ReactNode } from 'react';

export interface DataTableProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function DataTable({ children, className = '', style }: DataTableProps) {
  return (
    <div className={`ds-table-wrap ${className}`} style={style}>
      {children}
    </div>
  );
}

export interface TablePaginationProps {
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  entityLabel?: string;
}

export function TablePagination({
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  entityLabel = 'items',
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIdx = Math.min(totalCount, (currentPage - 1) * pageSize + 1);
  const endIdx = Math.min(totalCount, currentPage * pageSize);

  return (
    <div className="ds-tfoot">
      <div>
        Showing <span className="num font-semibold">{startIdx}</span>–<span className="num font-semibold">{endIdx}</span> of{' '}
        <span className="num font-semibold">{totalCount.toLocaleString()}</span> {entityLabel}
      </div>
      <div className="ds-tfoot-right">
        <div className="ds-pagination">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <span className="ds-pagination-label num">
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
