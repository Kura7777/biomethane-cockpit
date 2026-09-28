import React, { useMemo, useState } from 'react';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, Card, KpiRow, KpiTile } from '../../shared/ui';
import { computeValueStack, ClientType, StackStatus } from '../../domain/valueStack/engine';

const CLIENT_LABEL: Record<ClientType, string> = {
  SHIP_OPERATOR: 'Shipping company (bio-LNG)',
  ETS1_SITE: 'Industrial site in EU ETS1',
  ETS2_SUPPLIER: 'Gas supplier (ETS2)',
  DE_FUEL_SUPPLIER: 'German transport fuel supplier (THG)',
};

const STATUS_LABEL: Record<StackStatus, string> = {
  COUNTS: 'Counts now',
  FROM_2028: 'From 2028',
  TO_VERIFY: 'To verify — not in total',
  CLAIM: 'Claim (no direct €)',
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

function eur(v: number | null, digits = 2): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span className="eyebrow">{props.label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input className="input num" inputMode="decimal" style={{ width: '100%' }} value={props.value} onChange={e => props.onChange(e.target.value)} aria-label={props.label} />
        {props.unit && <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{props.unit}</span>}
      </span>
      {props.hint && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{props.hint}</span>}
    </label>
  );
}

export function ValueStackScreen() {
  const { state } = useAppState();
  const [client, setClient] = useState<ClientType>('SHIP_OPERATOR');
  const [volume, setVolume] = useState('');
  const [ci, setCi] = useState('');
  const [year, setYear] = useState('');
  const [intraEu, setIntraEu] = useState('');
  const [smallSites, setSmallSites] = useState('');
  const [passThrough, setPassThrough] = useState('');
  const [tariff, setTariff] = useState('');
  const [offer, setOffer] = useState('');

  const result = useMemo(
    () =>
      computeValueStack(
        {
          client,
          volumeMWh: num(volume),
          carbonIntensity: num(ci),
          deliveryYear: num(year),
          intraEuShare: share(intraEu),
          smallSiteShare: share(smallSites),
          ets2PassThrough: share(passThrough),
          greenTariffPremiumEurPerMWh: num(tariff),
          offerPremiumEurPerMWh: num(offer),
        },
        state.marks
      ),
    [client, volume, ci, year, intraEu, smallSites, passThrough, tariff, offer, state.marks]
  );

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="Value stack"
        context="Every regime in which one MWh of biomethane, burned by one client, cuts a cost or supports a claim — and where stacking would become double counting."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: '16px', padding: '16px' }}>
        <Card title="Client" meta="Prices come from the desk marks; everything else is yours">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">Client type</span>
              <select className="input" value={client} onChange={e => setClient(e.target.value as ClientType)} aria-label="Client type">
                {(Object.keys(CLIENT_LABEL) as ClientType[]).map(c => <option key={c} value={c}>{CLIENT_LABEL[c]}</option>)}
              </select>
            </label>
            <Field label="Annual volume" value={volume} onChange={setVolume} unit="MWh" hint={client === 'SHIP_OPERATOR' ? 'Energy delivered as bio-LNG.' : 'As invoiced (gross calorific value).'} />
            <Field label="Carbon intensity" value={ci} onChange={setCi} unit="gCO₂e/MJ" hint="RED III value on the PoS, e.g. −100 for manure." />
            <Field label="Delivery year" value={year} onChange={setYear} hint="ETS2 values count from 2028." />
            {client === 'SHIP_OPERATOR' && (
              <Field label="Burned on intra-EU voyages / at berth" value={intraEu} onChange={setIntraEu} unit="%" hint="EU ETS covers 100% of these, 50% of voyages in or out of the EU." />
            )}
            {client === 'ETS1_SITE' && (
              <>
                <Field label="Share burned at small sites (< 20 MW)" value={smallSites} onChange={setSmallSites} unit="%" hint="Those sites fall under ETS2, not ETS1." />
                <Field label="Supplier ETS2 pass-through" value={passThrough} onChange={setPassThrough} unit="%" />
              </>
            )}
            {client === 'ETS2_SUPPLIER' && (
              <Field label="Green-tariff premium to end customers" value={tariff} onChange={setTariff} unit="€/MWh" />
            )}
            <Field label="Your offer premium" value={offer} onChange={setOffer} unit="€/MWh" hint="Over the fuel it replaces." />
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <KpiRow columns={3}>
            <KpiTile label="Value stack" value={eur(result.stackEurPerMWh)} unit="/MWh" sub="Rows that count, in € per MWh" />
            <KpiTile label="Annual value to client" value={eur(result.stackAnnualEur, 0)} unit="/yr" />
            <KpiTile
              label="Client better off by"
              value={eur(result.clientNetEurPerMWh)}
              unit="/MWh"
              sub={result.clientNetEurPerMWh === null ? 'Enter your offer premium' : result.clientNetEurPerMWh >= 0 ? 'Stack covers your premium' : 'Premium exceeds the priced stack — lean on the claims'}
            />
          </KpiRow>

          {result.missingInputs.length > 0 && (
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--color-text-muted)' }}>Still needed: {result.missingInputs.join(', ')}.</p>
          )}

          <Card title="Where one MWh counts">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Regime</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>€/MWh</th>
                    <th style={{ textAlign: 'right' }}>€/yr</th>
                    <th>Evidence needed</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map(r => (
                    <tr key={r.regime}>
                      <td style={{ maxWidth: '320px' }}>
                        <div style={{ fontWeight: 600 }}>{r.regime}</div>
                        <div style={{ fontSize: '12px' }}>{r.whatItDoes}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} title={r.workings}>{r.legalBasis}</div>
                      </td>
                      <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{STATUS_LABEL[r.status]}</td>
                      <td className="num" style={{ textAlign: 'right' }} title={r.workings}>{r.status === 'CLAIM' ? '' : eur(r.eurPerMWh)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.status === 'CLAIM' ? '' : eur(r.annualEur, 0)}</td>
                      <td style={{ fontSize: '12px', maxWidth: '280px' }}>{r.evidenceNeeded}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <details style={{ marginTop: '10px' }}>
              <summary className="eyebrow" style={{ cursor: 'pointer' }}>Workings</summary>
              <ul style={{ fontSize: '12px', paddingLeft: '18px' }}>
                {result.rows.map(r => <li key={r.regime}><strong>{r.regime}:</strong> {r.workings}</li>)}
              </ul>
            </details>
          </Card>

          <Card title="Double-counting red lines" meta="Stacking is legitimate only when every regime recognises the same MWh burned by the same client">
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {result.guardrails.map(g => <li key={g}>{g}</li>)}
            </ul>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
