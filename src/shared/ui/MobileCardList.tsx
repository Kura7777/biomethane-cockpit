import React from 'react';

export interface MobileCardField {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  span?: 1 | 2;
  tone?: 'pos' | 'neg' | 'warn' | 'muted';
}

export interface MobileCardListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  title: (item: T) => React.ReactNode;
  subtitle?: (item: T) => React.ReactNode;
  /** Right-aligned headline figure, rendered in IBM Plex Mono tabular-nums. */
  metric?: (item: T) => React.ReactNode;
  metricLabel?: (item: T) => React.ReactNode;
  badges?: (item: T) => React.ReactNode;
  /** Rendered as a 2-column definition list under the header. */
  fields?: (item: T) => MobileCardField[];
  onSelect?: (item: T) => void;
  selectedKey?: string | null;
  empty?: React.ReactNode;
  testId?: string;
}

const toneClass: Record<NonNullable<MobileCardField['tone']>, string> = {
  pos: 'mc-tone-pos',
  neg: 'mc-tone-neg',
  warn: 'mc-tone-warn',
  muted: 'mc-tone-muted',
};

/**
 * The standard way to turn a wide desktop table into a mobile card list. One row of props per
 * item; the card itself (title/metric/badges/fields/chevron) is laid out for you. Pair with
 * `.table-scroll` (mobile.css) instead when the table must stay tabular.
 */
export function MobileCardList<T>({
  items,
  getKey,
  title,
  subtitle,
  metric,
  metricLabel,
  badges,
  fields,
  onSelect,
  selectedKey,
  empty,
  testId,
}: MobileCardListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="mc-empty" data-testid={testId ? `${testId}-empty` : undefined}>
        {empty ?? 'Nothing to show.'}
      </div>
    );
  }

  return (
    <div className="mc-list" data-testid={testId} role={onSelect ? 'list' : undefined}>
      {items.map(item => {
        const key = getKey(item);
        const selected = selectedKey != null && selectedKey === key;
        return (
          <MobileCard
            key={key}
            title={title(item)}
            subtitle={subtitle?.(item)}
            metric={metric?.(item)}
            metricLabel={metricLabel?.(item)}
            badges={badges?.(item)}
            fields={fields?.(item)}
            onClick={onSelect ? () => onSelect(item) : undefined}
            selected={selected}
            testId={testId ? `${testId}-card` : undefined}
          />
        );
      })}
    </div>
  );
}

export interface MobileCardProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  metric?: React.ReactNode;
  metricLabel?: React.ReactNode;
  badges?: React.ReactNode;
  fields?: MobileCardField[];
  onClick?: () => void;
  selected?: boolean;
  testId?: string;
}

/** Presentational card used by MobileCardList; also usable directly for bespoke lists. */
export function MobileCard({
  title,
  subtitle,
  metric,
  metricLabel,
  badges,
  fields,
  onClick,
  selected,
  testId,
}: MobileCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      className={`mc-card ${selected ? 'mc-card--selected' : ''} ${onClick ? 'mc-card--clickable' : ''}`}
      onClick={onClick}
      data-testid={testId}
      role={onClick ? 'listitem' : undefined}
    >
      <div className="mc-card-top">
        <div className="mc-card-heading">
          <div className="mc-card-title">{title}</div>
          {subtitle && <div className="mc-card-subtitle">{subtitle}</div>}
          {badges && <div className="mc-card-badges">{badges}</div>}
        </div>
        {(metric !== undefined || metricLabel !== undefined) && (
          <div className="mc-card-metric-wrap">
            {metric !== undefined && <div className="mc-card-metric num">{metric}</div>}
            {metricLabel !== undefined && <div className="mc-card-metric-label">{metricLabel}</div>}
          </div>
        )}
        {onClick && <span className="mc-card-chevron" aria-hidden="true">›</span>}
      </div>

      {fields && fields.length > 0 && (
        <dl className="mc-card-fields">
          {fields.map((f, i) => (
            <div className={`mc-card-field ${f.span === 2 ? 'mc-card-field--span2' : ''}`} key={i}>
              <dt>{f.label}</dt>
              <dd className={`${f.mono ? 'num' : ''} ${f.tone ? toneClass[f.tone] : ''}`}>{f.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Wrapper>
  );
}
