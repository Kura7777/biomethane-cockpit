import React, { useMemo, useState } from 'react';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, Card, KpiRow, KpiTile } from '../../shared/ui';
import {
  priceCorporateOrder,
  CorporateOrderSpec,
  ProductForm,
  ClaimPurpose,
} from '../../domain/corporate/orderPricer';
import { BIOMETHANE_COMPETITORS, ARENA_LABEL } from '../../domain/competitors/registry';
import { showToast } from '../../app/DeskToastContainer';

const COUNTRIES = ['DE', 'NL', 'FR', 'DK', 'UK', 'AIB'];

const FORM_LABEL: Record<ProductForm, string> = {
  GO_ONLY: 'GO only (book & claim)',
  GO_PLUS_POS: 'GO + ISCC EU PoS (mass balance)',
  PHYSICAL: 'Physical gas + certificates',
};

const CLAIM_LABEL: Record<ClaimPurpose, string> = {
  SCOPE1_VOLUNTARY: 'Voluntary Scope 1 (dual ledger)',
  EU_ETS1: 'EU ETS1 installation',
  ETS2_VIA_SUPPLIER: 'ETS2 (via gas supplier, from 2028)',
  PRODUCT_FOOTPRINT: 'Product carbon footprint',
};

function num(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function eur(v: number | null, digits = 2): string {
  return v === null ? '—' : `€${v.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function Field(props: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span className="eyebrow">{props.label}</span>
      {props.children}
      {props.hint && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{props.hint}</span>}
    </label>
  );
}

export function CorporateOrderScreen() {
  const { state } = useAppState();

  const [client, setClient] = useState('');
  const [volume, setVolume] = useState('');
  const [form, setForm] = useState<ProductForm>('GO_PLUS_POS');
  const [countries, setCountries] = useState<string[]>([]);
  const [vintage, setVintage] = useState('');
  const [maxCi, setMaxCi] = useState('');
  const [unsubsidised, setUnsubsidised] = useState(false);
  const [excludeCrops, setExcludeCrops] = useState(false);
  const [claim, setClaim] = useState<ClaimPurpose>('SCOPE1_VOLUNTARY');
  const [transfer, setTransfer] = useState('');
  const [margin, setMargin] = useState('');

  const spec: CorporateOrderSpec = {
    volumeMWh: num(volume),
    form,
    countries,
    vintageYear: num(vintage),
    maxCi: num(maxCi),
    unsubsidisedOnly: unsubsidised,
    excludeCrops,
    claim,
  };

  const quote = useMemo(
    () => priceCorporateOrder(spec, { transferCostEurPerMWh: num(transfer), marginEurPerMWh: num(margin) }, state.marks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [volume, form, countries, vintage, maxCi, unsubsidised, excludeCrops, claim, transfer, margin, state.marks]
  );

  const toggleCountry = (c: string) =>
    setCountries(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]));

  const quoteText = useMemo(() => {
    if (quote.offerEurPerMWh === null || spec.volumeMWh === null) return '';
    const reqs = quote.ladder.map(s => s.label).join('; ');
    const lines = [
      `Indicative offer${client ? ` for ${client}` : ''}: ${Math.round(spec.volumeMWh).toLocaleString('en-GB')} MWh/yr of ${FORM_LABEL[form]} at ${eur(quote.offerEurPerMWh)}/MWh (${eur(quote.annualValueEur, 0)}/yr).`,
      `Specification: ${reqs}. Claim: ${CLAIM_LABEL[claim]}.`,
      'Suggested reporting (dual ledger):',
      `  • Physical gas consumed: ${Math.round(spec.volumeMWh).toLocaleString('en-GB')} MWh — location-based emissions ≈ ${quote.dualLedger.physicalEmissionsTco2 === null ? '—' : Math.round(quote.dualLedger.physicalEmissionsTco2).toLocaleString('en-GB')} tCO₂ (MRR natural gas factor).`,
      `  • Biomethane certificates retired in your name: ${Math.round(spec.volumeMWh).toLocaleString('en-GB')} MWh${spec.vintageYear ? `, vintage ${spec.vintageYear}` : ''}.`,
      'Indicative only, subject to availability and final documentation.',
    ];
    return lines.join('\n');
  }, [quote, spec.volumeMWh, spec.vintageYear, form, claim, client]);

  const selectStyle: React.CSSProperties = { width: '100%' };

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="Corporate orders"
        context="Price a client's biomethane request against the broker book: cheapest-to-deliver, what each requirement costs, and whether compliance buyers would pay more for the same material."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: '16px', padding: '16px' }}>
        <Card title="Client request" meta="Nothing is defaulted — blank means not required or not yet set">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Field label="Client">
              <input className="input" value={client} onChange={e => setClient(e.target.value)} aria-label="Client" />
            </Field>
            <Field label="Annual volume (MWh)">
              <input className="input num" inputMode="decimal" value={volume} onChange={e => setVolume(e.target.value)} aria-label="Annual volume" />
            </Field>
            <Field label="Product">
              <select className="input" style={selectStyle} value={form} onChange={e => setForm(e.target.value as ProductForm)} aria-label="Product">
                {(Object.keys(FORM_LABEL) as ProductForm[]).map(f => <option key={f} value={f}>{FORM_LABEL[f]}</option>)}
              </select>
            </Field>
            <Field label="Claim" hint="Drives which product works — e.g. ETS1 needs PoS, not a bare GO.">
              <select className="input" style={selectStyle} value={claim} onChange={e => setClaim(e.target.value as ClaimPurpose)} aria-label="Claim">
                {(Object.keys(CLAIM_LABEL) as ClaimPurpose[]).map(c => <option key={c} value={c}>{CLAIM_LABEL[c]}</option>)}
              </select>
            </Field>
            <Field label="Registry countries" hint="None selected = any.">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {COUNTRIES.map(c => (
                  <button key={c} type="button" className={`btn ${countries.includes(c) ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleCountry(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Vintage (year)">
              <input className="input num" inputMode="numeric" value={vintage} onChange={e => setVintage(e.target.value)} aria-label="Vintage" />
            </Field>
            <Field label="Max CI (gCO₂e/MJ)">
              <input className="input num" inputMode="decimal" value={maxCi} onChange={e => setMaxCi(e.target.value)} aria-label="Max CI" />
            </Field>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="checkbox" checked={unsubsidised} onChange={e => setUnsubsidised(e.target.checked)} /> Unsubsidised only
            </label>
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="checkbox" checked={excludeCrops} onChange={e => setExcludeCrops(e.target.checked)} /> Exclude crop feedstock
            </label>
            <Field label="Transfer & cancellation cost (€/MWh)">
              <input className="input num" inputMode="decimal" value={transfer} onChange={e => setTransfer(e.target.value)} aria-label="Transfer cost" />
            </Field>
            <Field label="Desk margin (€/MWh)">
              <input className="input num" inputMode="decimal" value={margin} onChange={e => setMargin(e.target.value)} aria-label="Desk margin" />
            </Field>
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          <KpiRow columns={4}>
            <KpiTile label="Cheapest to deliver" value={eur(quote.ctd.averageCostEurPerMWh)} unit="/MWh" sub={`${quote.ctd.eligible.length} matching offers`} />
            <KpiTile
              label="Offer to client"
              value={eur(quote.offerEurPerMWh)}
              unit="/MWh"
              sub={quote.missingInputs.length > 0 ? `Set ${quote.missingInputs.join(', ')}` : 'CTD + transfer + margin'}
            />
            <KpiTile label="Annual contract value" value={eur(quote.annualValueEur, 0)} />
            <KpiTile
              label="Desk gross margin"
              value={num(margin) !== null && spec.volumeMWh !== null ? eur((num(margin) as number) * spec.volumeMWh, 0) : '—'}
              unit="/yr"
            />
          </KpiRow>

          {quote.warnings.length > 0 && (
            <Card title="Check before quoting">
              <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {quote.warnings.map(w => <li key={w}>{w}</li>)}
              </ul>
            </Card>
          )}

          <Card title="What each requirement costs" meta="Cheapest-to-deliver as requirements are added — the conversation to have with the client">
            <table className="table">
              <thead>
                <tr><th>Requirement</th><th style={{ textAlign: 'right' }}>Matching offers</th><th style={{ textAlign: 'right' }}>CTD €/MWh</th><th style={{ textAlign: 'right' }}>Adds</th></tr>
              </thead>
              <tbody>
                {quote.ladder.map(s => (
                  <tr key={s.label}>
                    <td>{s.label}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{s.eligibleLines}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{s.averageCostEurPerMWh === null ? 'none' : s.averageCostEurPerMWh.toFixed(2)}</td>
                    <td className="num" style={{ textAlign: 'right' }}>{s.deltaEurPerMWh === null ? '' : `${s.deltaEurPerMWh >= 0 ? '+' : ''}${s.deltaEurPerMWh.toFixed(2)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Supply stack" meta="Broker-book offers that meet every requirement, cheapest first">
            {quote.ctd.eligible.length === 0 ? (
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>No matching offers.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table">
                  <thead>
                    <tr><th>Registry</th><th>Feedstock</th><th>Vintage</th><th>CI</th><th>Subsidy</th><th>Certification</th><th style={{ textAlign: 'right' }}>Offer €/MWh</th><th style={{ textAlign: 'right' }}>Offer MWh</th><th style={{ textAlign: 'right' }}>Taken</th></tr>
                  </thead>
                  <tbody>
                    {quote.ctd.eligible.map(l => {
                      const taken = quote.ctd.filled.find(f => f.line === l)?.takenMWh;
                      return (
                        <tr key={l.entry.id}>
                          <td>{l.entry.country}</td>
                          <td>{l.entry.feedstock}</td>
                          <td>{l.entry.vintage}</td>
                          <td>{l.entry.ciScore}</td>
                          <td>{l.entry.subsidized}</td>
                          <td>{l.entry.certified}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{l.offerEurPerMWh.toFixed(2)}{l.entry.currency === 'GBP' ? ' (£ conv.)' : ''}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{l.offerVolumeMWh === null ? '—' : l.offerVolumeMWh.toLocaleString('en-GB')}</td>
                          <td className="num" style={{ textAlign: 'right' }}>{taken ? taken.toLocaleString('en-GB') : ''}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p style={{ margin: '8px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Source: the broker run held in the app. Replace with today's run before quoting.
            </p>
          </Card>

          {quote.complianceFloors.length > 0 && (
            <Card title="Compliance floor" meta="What compliance buyers pay for the same attribute (certificate value at the bid, at the spec's max CI)">
              <ul style={{ margin: 0, paddingLeft: '18px' }}>
                {quote.complianceFloors.map(f => <li key={f.marketId}>{f.marketName}: {eur(f.valueEurPerMWh)}/MWh</li>)}
              </ul>
            </Card>
          )}

          <Card
            title="Quote draft"
            actions={quoteText ? (
              <button type="button" className="btn btn-secondary" onClick={() => { navigator.clipboard.writeText(quoteText); showToast('Quote copied'); }}>Copy</button>
            ) : undefined}
          >
            {quoteText ? (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{quoteText}</pre>
            ) : (
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>Complete the request, costs and margin to draft a quote.</p>
            )}
          </Card>

          <Card title="Who else will quote this" meta="Competitors that are often also counterparties">
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead><tr><th>Company</th><th>Model</th><th>Arenas</th><th>Source</th></tr></thead>
                <tbody>
                  {BIOMETHANE_COMPETITORS.map(c => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>{c.name}{c.alsoCounterparty ? <div style={{ fontSize: '11px', fontWeight: 400, color: 'var(--color-text-muted)' }}>also a counterparty</div> : null}</td>
                      <td style={{ fontSize: '12px', maxWidth: '360px' }}>{c.model}</td>
                      <td style={{ fontSize: '12px' }}>{c.arenas.map(a => ARENA_LABEL[a]).join(', ')}</td>
                      <td style={{ fontSize: '12px' }}>{c.sources.map(s => <div key={s.url}><a href={s.url} target="_blank" rel="noreferrer" title={s.note}>source</a></div>)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
