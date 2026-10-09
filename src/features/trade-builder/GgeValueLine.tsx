import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { GgeBreakdown } from '../../domain/netback/gge';
import { RouteCostLine } from '../../domain/netback/types';
import { isAssumptionOpen } from '../../domain/assumptions/registry';

interface GgeValueLineProps {
  gge: GgeBreakdown;
  /** Certificate value from the netback engine, €/MWh. */
  valueEurPerMwh: number | null;
  /** Route cost lines the engine added (GO export, VertiCer import, and the TTF spread for structure B). */
  costLines: RouteCostLine[];
  /** Ticket rail (tt-*) or the grid column (kv). */
  variant: 'ticket' | 'grid';
}

const eur = (v: number, dp = 2) => `€${v.toFixed(dp)}`;

function OpenChip({ k }: { k: string }) {
  return isAssumptionOpen(k) ? <span className="chip chip-warn" style={{ fontSize: '10px', marginLeft: '6px' }} title="Unconfirmed desk input: check it before pricing a deal">OPEN</span> : null;
}

/**
 * The GGE value of the deal on the ticket: GGE per GO MWh, the LHV factor used, the mark against that
 * year's buy-out, the value per MWh and the route cost lines. Every figure comes from the netback
 * engine and the Pricing desk; this only lays them out and links back to where they are set.
 */
export function GgeValueLine({ gge, valueEurPerMwh, costLines, variant }: GgeValueLineProps) {
  const lhvKey = (gge.goCountry || '').toUpperCase() === 'ES' ? 'market.nl_gge.lhvFactor.ES' : 'market.nl_gge.lhvFactor.default';
  const rows: Array<{ label: string; value: ReactNode }> = [
    { label: 'GGE per GO MWh', value: gge.ggePerGoMwh.toFixed(1) },
    {
      label: 'LHV factor',
      value: gge.goOnLhv
        ? <>1 (GO already on LHV)</>
        : <>{gge.lhvFactor}{gge.lhvOpen && <OpenChip k={lhvKey} />}</>,
    },
    {
      label: gge.complianceYear !== null ? `Mark vs ${gge.complianceYear} buy-out` : 'Mark vs buy-out',
      value: gge.buyoutEurPerGge !== null
        ? <>{eur(gge.markEurPerGge, 3)} vs {eur(gge.buyoutEurPerGge, 3)}{gge.aboveBuyout && <span className="chip chip-warn" style={{ fontSize: '10px', marginLeft: '6px' }} data-testid="gge-above-buyout">above buy-out</span>}</>
        : <>{eur(gge.markEurPerGge, 3)} · no buy-out on file{gge.complianceYear === null ? ' (set the delivery year)' : ''}</>,
    },
    { label: 'GGE value', value: valueEurPerMwh !== null ? `${eur(valueEurPerMwh)}/MWh` : '—' },
    ...costLines.map(l => ({
      label: l.label,
      value: <>−{eur(l.eurPerMwh)}/MWh<OpenChip k={l.key} /></>,
    })),
  ];

  const edit = (
    <p className="mut" style={{ margin: '6px 0 0', fontSize: '11px' }} data-testid="gge-edit-links">
      Edit on <Link to="/pricing?tab=prices" className="underline">#/pricing</Link>:{' '}
      <Link to="/pricing?tab=assumptions" className="underline">LHV factor</Link>,{' '}
      <Link to="/pricing?tab=costs" className="underline">costs</Link>.
    </p>
  );

  if (variant === 'ticket') {
    return (
      <div data-testid="gge-value-line">
        <dl className="tt-figures">
          {rows.map(r => (
            <div className="tt-figure-row" key={r.label}><dt>{r.label}</dt><dd>{r.value}</dd></div>
          ))}
        </dl>
        {edit}
      </div>
    );
  }
  return (
    <div data-testid="gge-value-line">
      {rows.map(r => (
        <div className="kv" style={{ marginTop: '6px' }} key={r.label}>
          <span className="lbl">{r.label}</span>
          <span />
          <span className="num" style={{ fontSize: '12px', fontWeight: 600 }}>{r.value}</span>
        </div>
      ))}
      {edit}
    </div>
  );
}
