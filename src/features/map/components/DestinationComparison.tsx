import { useMemo } from 'react';
import { useAppState } from '../../../store/context';
import { compareDestinationsForPlant } from '../../../domain/arbitrage/plantDestinations';
import { buildDealUrl, DEAL_ROUTE } from '../../../domain/trade/dealParams';
import { BiomethanePlant } from '../../../domain/plants/types';

interface DestinationComparisonProps {
  /** Origin country ISO code. */
  origin: string;
  plant: BiomethanePlant | null;
}

const VERDICT_LABEL: Record<string, { label: string; chip: string }> = {
  ELIGIBLE: { label: 'Eligible', chip: 'chip-pass' },
  CONDITIONAL: { label: 'Open items', chip: 'chip-warn' },
  UNRESOLVED: { label: 'Unresolved', chip: 'chip-warn' },
  UNKNOWN: { label: 'Blocked', chip: 'chip-neg' },
  HARD_BLOCK: { label: 'Blocked', chip: 'chip-neg' },
};

/** "Where can this gas go?": the green-gas obligation next to the other destinations for this origin, same engines as the Trade Builder. */
export function DestinationComparison({ origin, plant }: DestinationComparisonProps) {
  const { state } = useAppState();
  // Value the plant's own feedstock at its published CI when it has one, else that feedstock's default CI.
  const rows = useMemo(
    () => compareDestinationsForPlant({ origin, plant, marks: state.marks, costs: state.costs }),
    [origin, plant, state.marks, state.costs]
  );
  if (rows.length === 0) return null;

  return (
    <div className="map-playbook-card" data-testid="destination-comparison" style={{ marginBottom: '12px' }}>
      <div className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800, marginBottom: '6px' }}>
        Where can this gas go? · from {origin}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map(r => {
          const v = VERDICT_LABEL[r.verdict] ?? VERDICT_LABEL.UNKNOWN;
          const tradeUrl = buildDealUrl({ marketId: r.marketId, originCountry: origin, plantId: plant?.id, plantName: plant?.name });
          return (
            <div key={r.marketId} data-testid={`dest-row-${r.marketId}`} style={{ padding: '8px 0', borderTop: '1px solid var(--color-divider)' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '13px' }}>{r.shortName}</strong>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`chip ${v.chip}`} style={{ fontSize: '11px' }}>{v.label}</span>
                  <span className="num" style={{ fontSize: '13px', fontWeight: 700 }} data-testid={`dest-value-${r.marketId}`}>
                    {r.netNetbackEurPerMwh === null ? '—' : `${r.netNetbackEurPerMwh < 0 ? '−' : ''}€${Math.abs(r.netNetbackEurPerMwh).toFixed(2)}/MWh`}
                  </span>
                </span>
              </div>
              <div className="mut num" style={{ fontSize: '11px', marginTop: '2px' }} data-testid={`dest-ci-${r.marketId}`}>{r.ciLabel}</div>
              {r.reason && <div className="mut" style={{ fontSize: '11px', lineHeight: 1.4, marginTop: '2px' }}>{r.reason}</div>}
              {!r.blocked && (
                <a href={`#${tradeUrl || DEAL_ROUTE}`} style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }} data-testid={`dest-trade-${r.marketId}`}>
                  Trade this route →
                </a>
              )}
            </div>
          );
        })}
      </div>
      <div className="mut" style={{ fontSize: '11px', marginTop: '6px' }}>
        Indicative: marks and costs from #/pricing, no custody pack entered. No Spanish transport-quota market is in the registry yet.
      </div>
    </div>
  );
}
