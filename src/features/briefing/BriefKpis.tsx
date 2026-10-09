import React from 'react';
import type { BriefMark, FueleuLatest, LadderHeadline, MarkFreshnessSummary } from '../../domain/briefing/morningBrief';
import { CountUp, fmt0, fmt2, fmtPrice, fmtSigned } from './briefUi';

function Kpi({ label, children, sub, accent }: { label: string; children: React.ReactNode; sub: React.ReactNode; accent: string }) {
  return (
    <div className="bf-kpi bf-rise" style={{ ['--bf-accent' as string]: accent }}>
      <span className="lbl">{label}</span>
      <span className="big">{children}</span>
      <span className="sub">{sub}</span>
    </div>
  );
}

export function BriefKpis({
  headline, consignmentName, thg, eua, fueleu, freshness, plantCount, supplyTWh,
}: {
  headline: LadderHeadline;
  consignmentName: string;
  thg: BriefMark | undefined;
  eua: BriefMark | undefined;
  fueleu: FueleuLatest | null;
  freshness: MarkFreshnessSummary;
  plantCount: number | null;
  supplyTWh: number | null;
}) {
  const fresh = freshness.total ? freshness.fresh : null;
  return (
    <section className="bf-kpis" aria-label="Headline figures">
      <Kpi label={`Top net netback · ${consignmentName}`} accent="var(--bf-c1)"
        sub={headline.best ? `€/MWh · ${headline.best.marketName}` : 'no tradeable market'}>
        <CountUp value={headline.best?.netNetback ?? null} format={fmt2} />
      </Kpi>
      <Kpi label="DE THG quota · mid" accent="var(--bf-c2)" sub={thg ? `${thg.unitLabel}${thg.ageDays !== null ? ` · ${thg.ageDays}d old` : ''}` : 'not marked'}>
        <CountUp value={thg?.mid ?? null} format={fmtPrice} />
      </Kpi>
      <Kpi label="EU ETS1 allowance · mid" accent="var(--bf-c3)" sub={eua ? `${eua.unitLabel}${eua.ageDays !== null ? ` · ${eua.ageDays}d old` : ''}` : 'not marked'}>
        <CountUp value={eua?.mid ?? null} format={fmtPrice} />
      </Kpi>
      <Kpi label="FuelEU pool · latest traded" accent="var(--bf-c4)"
        sub={fueleu ? <>€/tCO₂e · {fueleu.latest.period}{fueleu.change !== null && <> · <span className={fueleu.change <= 0 ? 'neg' : 'pos'}>{fmtSigned(fueleu.change)}</span> vs {fueleu.previous?.period}</>}</> : 'no print'}>
        <CountUp value={fueleu?.latest.value ?? null} format={fmt2} />
      </Kpi>
      <Kpi label="Fresh marks (≤ 7 days)" accent={fresh !== null && fresh < freshness.total ? 'var(--color-status-warn-border)' : 'var(--bf-c3)'}
        sub={`of ${freshness.total} marked markets`}>
        <CountUp value={fresh} format={fmt0} />
      </Kpi>
      <Kpi label="Plants tracked" accent="var(--bf-c5)" sub={supplyTWh !== null ? `${fmt0(supplyTWh)} TWh/yr capacity in the registry` : 'loading registry…'}>
        <CountUp value={plantCount} format={fmt0} />
      </Kpi>
    </section>
  );
}
