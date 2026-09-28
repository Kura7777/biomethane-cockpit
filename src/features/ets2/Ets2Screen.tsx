import React, { useMemo, useState } from 'react';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, Card, KpiRow, KpiTile, Tabs } from '../../shared/ui';
import { ETS2_SEED_COMPANIES, applyEts2CompanyImport, Ets2Company } from '../../domain/ets2/companies';
import { Ets2DirectoryTab } from './Ets2DirectoryTab';
import { computeEts2Exposure, GasVolumeBasis } from '../../domain/ets2/calculator';
import {
  ETS2_COUNTRIES,
  applyEts2CountryImport,
  rankEts2CountryExposure,
  Ets2CountryProfile,
} from '../../domain/ets2/countries';

const IMPORT_STORAGE_KEY = 'biomethane_ets2_country_import_v1';
const COMPANY_IMPORT_STORAGE_KEY = 'biomethane_ets2_company_import_v1';

type Ets2Tab = 'DIRECTORY' | 'CALCULATOR' | 'COUNTRIES';

/** Directive 2023/959 Art. 30h price-control trigger, in 2020 prices (a soft trigger, not a cap). */
const PRICE_CONTROL_TRIGGER_EUR_2020 = 45;

function readStoredImport(key: string = IMPORT_STORAGE_KEY): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function writeStoredImport(json: string, key: string = IMPORT_STORAGE_KEY): void {
  try {
    localStorage.setItem(key, json);
  } catch {
    // Storage unavailable (private window): the import still applies for this session.
  }
}

function parseNumber(text: string): number | null {
  if (text.trim() === '') return null;
  const n = Number(text.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** A percentage box as a 0–1 share; blank stays missing. */
function parseShare(text: string): number | null {
  const pct = parseNumber(text);
  return pct === null ? null : pct / 100;
}

function eur(value: number | null, digits = 0): string {
  if (value === null) return '—';
  return `€${value.toLocaleString('en-GB', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

function NumberField(props: { label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: string }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span className="eyebrow">{props.label}</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          className="input num"
          inputMode="decimal"
          style={{ width: '100%' }}
          value={props.value}
          onChange={e => props.onChange(e.target.value)}
          aria-label={props.label}
        />
        {props.unit && <span style={{ color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{props.unit}</span>}
      </span>
      {props.hint && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{props.hint}</span>}
    </label>
  );
}

export function Ets2Screen() {
  const { state } = useAppState();
  const deskMark = state.marks.marks['EU_ETS2'];
  const deskMid = deskMark?.mid ?? null;

  const [gasMWh, setGasMWh] = useState('');
  const [basis, setBasis] = useState<GasVolumeBasis>('GCV');
  const [price, setPrice] = useState(deskMid !== null ? String(deskMid) : '');
  const [existingPrice, setExistingPrice] = useState('');
  const [passThroughPct, setPassThroughPct] = useState('100');
  const [bioSharePct, setBioSharePct] = useState('100');
  const [premium, setPremium] = useState('');

  const priceValue = parseNumber(price);

  const result = useMemo(
    () =>
      computeEts2Exposure({
        annualGasMWh: parseNumber(gasMWh),
        volumeBasis: basis,
        ets2PriceEurPerT: priceValue,
        existingCarbonPriceEurPerT: parseNumber(existingPrice),
        passThroughShare: parseShare(passThroughPct),
        biomethaneShare: parseShare(bioSharePct),
        biomethanePremiumEurPerMWh: parseNumber(premium),
      }),
    [gasMWh, basis, priceValue, existingPrice, passThroughPct, bioSharePct, premium]
  );

  const [tab, setTab] = useState<Ets2Tab>('DIRECTORY');
  const [importText, setImportText] = useState(() => readStoredImport());
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const countries: Ets2CountryProfile[] = useMemo(() => {
    if (!importText.trim()) return ETS2_COUNTRIES;
    return applyEts2CountryImport(ETS2_COUNTRIES, importText).countries;
  }, [importText]);
  const exposureRows = useMemo(() => rankEts2CountryExposure(countries, priceValue), [countries, priceValue]);
  const loadedCount = exposureRows.filter(r => r.rank !== null).length;

  const [draftImport, setDraftImport] = useState('');
  const handleImport = () => {
    const res = applyEts2CountryImport(ETS2_COUNTRIES, draftImport);
    setImportErrors(res.errors);
    if (res.applied > 0) {
      setImportText(draftImport);
      writeStoredImport(draftImport);
      setDraftImport('');
    }
  };

  const [companyImportText, setCompanyImportText] = useState(() => readStoredImport(COMPANY_IMPORT_STORAGE_KEY));
  const [companyDraft, setCompanyDraft] = useState('');
  const [companyErrors, setCompanyErrors] = useState<string[]>([]);
  const companies: Ets2Company[] = useMemo(() => {
    if (!companyImportText.trim()) return ETS2_SEED_COMPANIES;
    return applyEts2CompanyImport(ETS2_SEED_COMPANIES, companyImportText).companies;
  }, [companyImportText]);
  const handleCompanyImport = () => {
    const res = applyEts2CompanyImport(ETS2_SEED_COMPANIES, companyDraft);
    setCompanyErrors(res.errors);
    if (res.applied > 0) {
      // Keep earlier imports: store the combined list of imported rows.
      const previous = (() => {
        try { return companyImportText.trim() ? (JSON.parse(companyImportText) as unknown[]) : []; } catch { return []; }
      })();
      const combined = JSON.stringify([...previous, ...(JSON.parse(companyDraft) as unknown[])]);
      setCompanyImportText(combined);
      writeStoredImport(combined, COMPANY_IMPORT_STORAGE_KEY);
      setCompanyDraft('');
    }
  };

  const companyImportPanel = (
    <Card title="Add companies (JSON)" meta="From your research — every row needs a source URL">
      <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: 0 }}>
        Paste an array of rows: {'{ "name": "…", "countryIso": "IT", "role": "REGULATED_SUPPLIER", "marketSharePct": 16.8, "shareBasis": "retail gas sales 2025", "gasVolumeTWh": null, "confidence": "HIGH", "evidence": [{ "type": "REGULATOR_MARKET_REPORT", "url": "https://…", "note": "…", "checkedAt": "2026-09-28" }], "contacts": [{ "kind": "B2B_SALES", "email": "…", "sourceUrl": "https://…" }] }'}
      </p>
      <textarea
        className="input num"
        style={{ width: '100%', minHeight: '120px', fontFamily: 'var(--font-mono, monospace)' }}
        value={companyDraft}
        onChange={e => setCompanyDraft(e.target.value)}
        aria-label="Company data JSON"
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button type="button" className="btn btn-primary" onClick={handleCompanyImport} disabled={!companyDraft.trim()}>Add</button>
        {companyImportText && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => { setCompanyImportText(''); writeStoredImport('', COMPANY_IMPORT_STORAGE_KEY); setCompanyErrors([]); }}
          >
            Remove imported companies
          </button>
        )}
      </div>
      {companyErrors.length > 0 && (
        <ul style={{ color: 'var(--color-neg, #c0392b)', fontSize: '12px' }}>
          {companyErrors.map(e => <li key={e}>{e}</li>)}
        </ul>
      )}
    </Card>
  );

  const countryCard = (
          <Card
            title="Country exposure"
            meta={`${loadedCount} of ${countries.length} EU countries with sourced gas data · ranked by ETS2 cost on building gas${priceValue === null ? ' (set a price)' : ` at €${priceValue}/t`}`}
          >
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Country</th>
                    <th style={{ textAlign: 'right' }}>Building gas (TWh)</th>
                    <th style={{ textAlign: 'right' }}>MtCO₂</th>
                    <th style={{ textAlign: 'right' }}>ETS2 cost (€m)</th>
                    <th style={{ textAlign: 'right' }}>vs today (€m)</th>
                    <th>Existing carbon price</th>
                  </tr>
                </thead>
                <tbody>
                  {exposureRows.map(r => (
                    <tr key={r.profile.iso}>
                      <td className="num">{r.rank ?? ''}</td>
                      <td>{r.profile.name}</td>
                      <td className="num" style={{ textAlign: 'right' }}>
                        {r.profile.gasBuildingsTWh === null ? '—' : r.profile.gasBuildingsTWh.toFixed(1)}
                        {r.profile.gasDataYear ? <span style={{ color: 'var(--color-text-muted)' }}> ({r.profile.gasDataYear})</span> : null}
                      </td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.emissionsMtCo2 === null ? '—' : r.emissionsMtCo2.toFixed(1)}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.ets2CostEurM === null ? '—' : Math.round(r.ets2CostEurM).toLocaleString('en-GB')}</td>
                      <td className="num" style={{ textAlign: 'right' }}>{r.incrementalCostEurM === null ? '—' : Math.round(r.incrementalCostEurM).toLocaleString('en-GB')}</td>
                      <td>
                        {r.profile.existingCarbonPricing.source ? (
                          <a href={r.profile.existingCarbonPricing.source.url} target="_blank" rel="noreferrer" title={r.profile.existingCarbonPricing.source.note}>
                            {r.profile.existingCarbonPricing.label}
                          </a>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)' }}>{r.profile.existingCarbonPricing.label}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <details style={{ marginTop: '12px' }}>
              <summary className="eyebrow" style={{ cursor: 'pointer' }}>Import sourced country data (JSON)</summary>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                Paste an array of rows: {'{ "iso": "IT", "gasBuildingsTWh": 0, "gasVolumeBasis": "GCV", "gasDataYear": 2024, "gasSourceUrl": "https://…", "existingCarbonPriceEurPerT": null }'}.
                Rows without a source URL are rejected.
              </p>
              <textarea
                className="input num"
                style={{ width: '100%', minHeight: '120px', fontFamily: 'var(--font-mono, monospace)' }}
                value={draftImport}
                onChange={e => setDraftImport(e.target.value)}
                aria-label="Country data JSON"
              />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" className="btn btn-primary" onClick={handleImport} disabled={!draftImport.trim()}>Load</button>
                {importText && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => { setImportText(''); writeStoredImport(''); setImportErrors([]); }}
                  >
                    Clear imported data
                  </button>
                )}
              </div>
              {importErrors.length > 0 && (
                <ul style={{ color: 'var(--color-neg, #c0392b)', fontSize: '12px' }}>
                  {importErrors.map(e => <li key={e}>{e}</li>)}
                </ul>
              )}
            </details>
          </Card>
  );

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="EU ETS2 exposure"
        context="Carbon cost on gas for buildings and small industry from 1 Jan 2028 (Directive 2023/959): who is exposed, and what switching to biomethane saves them."
      />
      <div style={{ padding: '0 16px' }}>
        <Tabs<Ets2Tab>
          ariaLabel="ETS2 sections"
          activeTab={tab}
          onChange={setTab}
          tabs={[
            { id: 'DIRECTORY', label: 'Companies', badge: companies.length },
            { id: 'CALCULATOR', label: 'Calculator' },
            { id: 'COUNTRIES', label: 'Countries', badge: loadedCount || undefined },
          ]}
        />
      </div>

      {tab === 'DIRECTORY' && (
        <Ets2DirectoryTab
          companies={companies}
          countries={countries}
          ets2PriceEurPerT={priceValue}
          onOpenInCalculator={mwh => { setGasMWh(String(mwh)); setTab('CALCULATOR'); }}
          importPanel={companyImportPanel}
        />
      )}

      {tab === 'COUNTRIES' && <div style={{ padding: '16px' }}>{countryCard}</div>}

      {tab === 'CALCULATOR' && (

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 340px) minmax(0, 1fr)', gap: '16px', padding: '16px' }}>
        <Card title="Client inputs" meta="Every number is yours — nothing is defaulted">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <NumberField label="Annual gas use" value={gasMWh} onChange={setGasMWh} unit="MWh" />
            <div className="seg" role="group" aria-label="Volume basis">
              {(['GCV', 'NCV'] as GasVolumeBasis[]).map(b => (
                <button key={b} type="button" className={`seg-opt ${basis === b ? 'active' : ''}`} onClick={() => setBasis(b)}>
                  {b === 'GCV' ? 'Invoice (GCV)' : 'NCV'}
                </button>
              ))}
            </div>
            <NumberField
              label="ETS2 price scenario"
              value={price}
              onChange={setPrice}
              unit="€/tCO₂"
              hint={
                deskMid !== null
                  ? `Desk mark €${deskMid.toFixed(2)} (${deskMark?.source ?? 'desk'}). Price control releases extra allowances above €${PRICE_CONTROL_TRIGGER_EUR_2020}/t in 2020 prices.`
                  : `No desk mark. Price control releases extra allowances above €${PRICE_CONTROL_TRIGGER_EUR_2020}/t in 2020 prices.`
              }
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {deskMid !== null && (
                <button type="button" className="btn btn-ghost" onClick={() => setPrice(String(deskMid))}>Desk mark</button>
              )}
              <button type="button" className="btn btn-ghost" onClick={() => setPrice(String(PRICE_CONTROL_TRIGGER_EUR_2020))}>
                €{PRICE_CONTROL_TRIGGER_EUR_2020} trigger (2020 €)
              </button>
            </div>
            <NumberField
              label="Carbon price already paid"
              value={existingPrice}
              onChange={setExistingPrice}
              unit="€/tCO₂"
              hint="e.g. German BEHG. Leave blank if none."
            />
            <NumberField
              label="Supplier pass-through"
              value={passThroughPct}
              onChange={setPassThroughPct}
              unit="%"
              hint="Share of the supplier's allowance cost on the client's bill."
            />
            <NumberField label="Share switched to biomethane" value={bioSharePct} onChange={setBioSharePct} unit="%" />
            <NumberField
              label="Biomethane premium quote"
              value={premium}
              onChange={setPremium}
              unit="€/MWh"
              hint="RED III-compliant, mass-balanced (UDB) biomethane over the fossil gas it replaces."
            />
          </div>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: 0 }}>
          {result.emissionsTco2 === null ? (
            <Card title="Result">
              <p style={{ margin: 0, color: 'var(--color-text-muted)' }}>
                Enter {result.missingInputs.filter(m => m !== 'biomethane premium quote').join(' and ')} to see the exposure.
              </p>
            </Card>
          ) : (
            <>
              <KpiRow columns={4}>
                <KpiTile
                  label="Emissions"
                  value={result.emissionsTco2 === null ? '—' : Math.round(result.emissionsTco2).toLocaleString('en-GB')}
                  unit="tCO₂/yr"
                />
                <KpiTile label="Client ETS2 cost" value={eur(result.clientEts2CostEur)} unit="/yr" sub={`Supplier cost ${eur(result.supplierAllowanceCostEur)}`} />
                <KpiTile
                  label="Change vs today"
                  value={eur(result.incrementalCostEur)}
                  unit="/yr"
                  sub={result.existingCarbonCostEur === null ? 'No existing carbon price entered' : `Pays ${eur(result.existingCarbonCostEur)} today`}
                />
                <KpiTile
                  label="Break-even premium"
                  value={eur(result.breakevenPremiumEurPerMWh, 2)}
                  unit="/MWh"
                  sub="Biomethane pays for itself below this"
                />
              </KpiRow>
              <KpiRow columns={3}>
                <KpiTile label="Biomethane volume" value={result.biomethaneMWh === null ? '—' : Math.round(result.biomethaneMWh).toLocaleString('en-GB')} unit="MWh/yr" />
                <KpiTile label="ETS2 cost avoided" value={eur(result.avoidedCostEur)} unit="/yr" />
                <KpiTile
                  label="Net saving on ETS2 alone"
                  value={eur(result.netSavingEur)}
                  unit="/yr"
                  sub={result.netSavingEur === null ? 'Enter a premium quote' : `Premium paid ${eur(result.biomethanePremiumCostEur)}`}
                />
              </KpiRow>
              <Card title="Workings">
                <ol style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }} className="num">
                  {result.workings.map(w => <li key={w}>{w}</li>)}
                </ol>
                <p style={{ margin: '10px 0 0', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  ETS2 saving is on top of any voluntary claim value (Scope 1 reporting, product footprint). Zero-rating needs RED III sustainability evidence through the Union Database.
                </p>
              </Card>
            </>
          )}

        </div>
      </div>
      )}
    </PageShell>
  );
}
