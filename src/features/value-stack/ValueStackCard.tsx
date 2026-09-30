import React, { useMemo, useState } from 'react';
import { MarksState } from '../../domain/netback/types';
import { computeValueStack, StackRow, StackStatus, ETS2_START_YEAR } from '../../domain/valueStack/engine';
import { StackSpec } from '../../domain/companies/opportunities';
import { formatEur } from '../../domain/companies/money';
import './valueStack.css';

/**
 * The value stack for one play, inside the company it belongs to: every regime the same MWh
 * counts in, what each is worth, and the double-counting red lines. The few inputs the engine
 * cannot know (a ship's intra-EU share, small sites, the offer premium) are editable in place.
 */

const STATUS_TEXT: Record<StackStatus, string> = {
  COUNTS: 'Now',
  FROM_2028: `From ${ETS2_START_YEAR}`,
  TO_VERIFY: 'To verify',
  CLAIM: 'Claim',
};

function num(t: string): number | null {
  if (t.trim() === '') return null;
  const n = Number(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function share(t: string): number | null {
  const n = num(t);
  return n === null ? null : n / 100;
}

function eurMWh(v: number | null): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const eurYr = formatEur;

function range(lo: number | null, hi: number | null, fmt: (v: number | null) => string): string {
  if (lo === null || hi === null) return fmt(hi ?? lo);
  return Math.abs(hi - lo) < 0.005 ? fmt(lo) : `${fmt(lo)}–${fmt(hi).replace('€', '')}`;
}

function counted(r: StackRow, year: number | null): boolean {
  return r.status === 'COUNTS' || (r.status === 'FROM_2028' && year !== null && year >= ETS2_START_YEAR);
}

function Input(props: { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder?: string; title?: string }) {
  return (
    <label className="vs-input" title={props.title}>
      <span>{props.label}</span>
      <span className="vs-input-box">
        <input inputMode="decimal" value={props.value} placeholder={props.placeholder} onChange={e => props.onChange(e.target.value)} aria-label={props.label} />
        <em>{props.unit}</em>
      </span>
    </label>
  );
}

export function StackBadge({ spec }: { spec: StackSpec | null }) {
  if (!spec) return null;
  return spec.isStack ? (
    <span className="vs-badge stack" title={`Priced regimes on the same MWh: ${spec.pricedRegimes.join(' + ')}`}>
      Stack · {spec.pricedRegimes.length} regimes
    </span>
  ) : null;
}

export function ValueStackCard(props: { spec: StackSpec; marks: MarksState; heading?: string; volumeHint?: string }) {
  const { spec, marks } = props;
  const base = spec.inputs;
  const [volume, setVolume] = useState(base.volumeMWh === null ? '' : String(base.volumeMWh));
  const [intraEu, setIntraEu] = useState(base.intraEuShare === null ? '' : String(base.intraEuShare * 100));
  const [smallSites, setSmallSites] = useState(base.smallSiteShare === null ? '' : String(base.smallSiteShare * 100));
  const [passThrough, setPassThrough] = useState('');
  const [tariff, setTariff] = useState('');
  const [offer, setOffer] = useState('');

  const inputs = {
    ...base,
    volumeMWh: num(volume),
    intraEuShare: share(intraEu),
    smallSiteShare: share(smallSites),
    ets2PassThrough: share(passThrough),
    greenTariffPremiumEurPerMWh: num(tariff),
    offerPremiumEurPerMWh: num(offer),
  };
  const ship = base.client === 'SHIP_OPERATOR';
  const openShare = ship && inputs.intraEuShare === null;

  const { low, high } = useMemo(() => {
    const lo = computeValueStack(openShare ? { ...inputs, intraEuShare: 0 } : inputs, marks);
    const hi = openShare ? computeValueStack({ ...inputs, intraEuShare: 1 }, marks) : lo;
    return { low: lo, high: hi };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, intraEu, smallSites, passThrough, tariff, offer, marks, openShare, base]);

  const year = inputs.deliveryYear;
  const sumPriced = (r: typeof low) => {
    const rows = r.rows.filter(x => counted(x, year) && x.eurPerMWh !== null);
    return rows.length ? rows.reduce((a, x) => a + (x.eurPerMWh as number), 0) : null;
  };
  const perLo = sumPriced(low);
  const perHi = sumPriced(high);
  const vol = inputs.volumeMWh;
  const yrLo = perLo !== null && vol !== null ? perLo * vol : null;
  const yrHi = perHi !== null && vol !== null ? perHi * vol : null;
  const offerV = inputs.offerPremiumEurPerMWh;
  const netLo = perLo !== null && offerV !== null ? perLo - offerV : null;
  const netHi = perHi !== null && offerV !== null ? perHi - offerV : null;
  const pricedCount = low.rows.filter(r => counted(r, year) && r.eurPerMWh !== null).length;

  return (
    <div className="vs-card">
      <div className="vs-head">
        <div>
          <div className="vs-title">{props.heading ?? 'Value stack'}</div>
          <div className="vs-sub">
            {pricedCount >= 2
              ? `${pricedCount} regimes pay on the same MWh · at desk marks`
              : pricedCount === 1
              ? `One priced regime${low.rows.some(r => r.status === 'CLAIM') ? ' plus reporting claims' : ''} · at desk marks`
              : 'Enter the missing inputs to price it'}
          </div>
        </div>
        <div className="vs-total">
          <div className="vs-total-value">{range(perLo, perHi, eurMWh)}<span>/MWh</span></div>
          <div className="vs-sub">{vol === null ? 'Enter a volume for €/yr' : `${range(yrLo, yrHi, eurYr)}/yr`}</div>
        </div>
      </div>

      <div className="vs-inputs">
        <Input label="Volume" value={volume} onChange={setVolume} unit="MWh/yr" title={props.volumeHint} />
        {ship && <Input label="Intra-EU share" value={intraEu} onChange={setIntraEu} unit="%" placeholder="50–100" title="Share burned on intra-EU voyages and at EU berth. Blank shows the range from 0% to 100%." />}
        {base.client === 'ETS1_SITE' && <Input label="Small sites" value={smallSites} onChange={setSmallSites} unit="%" title="Share burned at sites under 20 MW, which fall under ETS2 instead of ETS1" />}
        {base.client === 'ETS1_SITE' && inputs.smallSiteShare !== null && inputs.smallSiteShare > 0 && (
          <Input label="ETS2 pass-through" value={passThrough} onChange={setPassThrough} unit="%" />
        )}
        {base.client === 'ETS2_SUPPLIER' && <Input label="Green tariff" value={tariff} onChange={setTariff} unit="€/MWh" title="Premium the supplier can charge end customers for the green gas" />}
        <Input label="Your premium" value={offer} onChange={setOffer} unit="€/MWh" title="Your offer over the fuel it replaces" />
      </div>

      <ul className="vs-rows">
        {low.rows.map((r, i) => {
          const hi = high.rows[i];
          const inTotal = counted(r, year) && r.eurPerMWh !== null;
          return (
            <li key={r.regime} className={inTotal ? 'in' : r.status === 'CLAIM' ? 'claim' : 'out'}>
              <div className="vs-row-main">
                <span className="vs-regime" title={r.workings}>{r.regime}</span>
                <span className={`vs-status ${r.status.toLowerCase()}`}>{STATUS_TEXT[r.status]}</span>
                <span className="vs-val">{r.status === 'CLAIM' ? '' : range(r.eurPerMWh, hi?.eurPerMWh ?? null, eurMWh)}</span>
              </div>
              <div className="vs-row-sub">{r.whatItDoes} <span className="vs-law">{r.legalBasis}</span></div>
            </li>
          );
        })}
      </ul>

      {offerV !== null && perLo !== null && (
        <div className={`vs-net ${(netLo ?? 0) >= 0 ? 'pos' : 'neg'}`}>
          Client better off by <strong>{range(netLo, netHi, eurMWh)}/MWh</strong>
          {(netLo ?? 0) < 0 && ' — your premium exceeds the priced stack; lean on the claims'}
        </div>
      )}

      {(() => {
        // Optional inputs (a green tariff, your premium) leave a row blank without blocking the stack.
        const needed = low.missingInputs.filter(m => !m.startsWith('a value for every counted row') && !m.startsWith('share burned on intra-EU'));
        return needed.length > 0 ? <div className="vs-missing">Still needed: {needed.join(', ')}.</div> : null;
      })()}
      {openShare && <div className="vs-missing">EU ETS maritime covers 100% of intra-EU voyages and 50% of voyages in or out of the EU — enter the intra-EU share to narrow the range.</div>}

      <details className="vs-details">
        <summary>Double-counting red lines &amp; evidence</summary>
        <ul>
          {low.guardrails.map(g => <li key={g}>{g}</li>)}
        </ul>
        <ul className="vs-evidence">
          {low.rows.map(r => <li key={r.regime}><strong>{r.regime}:</strong> {r.evidenceNeeded}</li>)}
        </ul>
      </details>
    </div>
  );
}
