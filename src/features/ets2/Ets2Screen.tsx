import React, { useMemo, useState } from 'react';
import { useAppState } from '../../store/context';
import { PageShell, PageHeader, HeaderPill, KpiTile, Tabs, DataTable, MobileCardList } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { ETS2_SEED_COMPANIES, CLEAN_HEAT_PROGRAM_LEADS, applyEts2CompanyImport, Ets2Company } from '../../domain/ets2/companies';
import { Ets2DirectoryTab } from './Ets2DirectoryTab';
import { Ets1SitesTab } from './Ets1SitesTab';
import { computeEts2Exposure, GasVolumeBasis } from '../../domain/ets2/calculator';
import { ETS2_COUNTRIES, applyEts2CountryImport, rankEts2CountryExposure, Ets2CountryProfile } from '../../domain/ets2/countries';
import { selectMarkPrice } from '../../domain/netback/engine';
import { ETS2_START_YEAR } from '../../domain/valueStack/engine';
import { Segmented, BarCell, eur, eurM, tonnes, parseNumber } from './etsUi';
import './ets.css';

const BASE_COMPANIES: Ets2Company[] = [...ETS2_SEED_COMPANIES, ...CLEAN_HEAT_PROGRAM_LEADS];

const IMPORT_STORAGE_KEY = 'biomethane_ets2_country_import_v1';
const COMPANY_IMPORT_STORAGE_KEY = 'biomethane_ets2_company_import_v1';

type Ets2Tab = 'ETS1_SITES' | 'DIRECTORY' | 'CALCULATOR' | 'COUNTRIES';

/** Directive 2023/959 Art. 30h price-control trigger, in 2020 prices (a soft trigger, not a cap). */
const PRICE_CONTROL_TRIGGER_EUR_2020 = 45;
const MS_PER_DAY = 86_400_000;
const EUR_COMPACT_FROM = 1_000_000;

/** Whole euros below €1m, €m / €bn above, so large results fit a KPI card (exact figures stay in the workings). */
function eurCompact(v: number | null): string {
  return v !== null && Math.abs(v) >= EUR_COMPACT_FROM ? eurM(v) : eur(v);
}

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

/** A percentage box as a 0–1 share; blank stays missing. */
function parseShare(text: string): number | null {
  const pct = parseNumber(text);
  return pct === null ? null : pct / 100;
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; unit?: string; hint?: React.ReactNode }) {
  return (
    <label>
      <span className="lbl">{props.label}</span>
      <span className="ets-input">
        <input inputMode="decimal" value={props.value} onChange={e => props.onChange(e.target.value)} aria-label={props.label} />
        {props.unit && <span className="unit">{props.unit}</span>}
      </span>
      {props.hint && <span className="hint">{props.hint}</span>}
    </label>
  );
}

export function Ets2Screen() {
  const { state } = useAppState();
  const isMobile = useIsMobile();
  const deskEts2 = state.marks.marks['EU_ETS2'];
  const deskMid = deskEts2?.mid ?? null;
  const eua = selectMarkPrice(state.marks.marks['EU_ETS1'], 'mid');
  const daysToEts2 = Math.ceil((Date.UTC(ETS2_START_YEAR, 0, 1) - Date.now()) / MS_PER_DAY);

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

  const [tab, setTab] = useState<Ets2Tab>('ETS1_SITES');
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
    if (!companyImportText.trim()) return BASE_COMPANIES;
    return applyEts2CompanyImport(BASE_COMPANIES, companyImportText).companies;
  }, [companyImportText]);
  const handleCompanyImport = () => {
    const res = applyEts2CompanyImport(BASE_COMPANIES, companyDraft);
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
    <details className="ets-details">
      <summary>Add companies from your research <span className="meta">JSON · every row needs a source URL</span></summary>
      <div className="inner">
        <div className="ets-code">
          {'[{ "name": "…", "countryIso": "IT", "role": "REGULATED_SUPPLIER", "marketSharePct": 16.8, "shareBasis": "retail gas sales 2025", "gasVolumeTWh": null, "confidence": "HIGH", "evidence": [{ "type": "REGULATOR_MARKET_REPORT", "url": "https://…", "note": "…", "checkedAt": "2026-09-28" }], "contacts": [{ "kind": "B2B_SALES", "email": "…", "sourceUrl": "https://…" }] }]'}
        </div>
        <textarea className="ets-textarea" value={companyDraft} onChange={e => setCompanyDraft(e.target.value)} aria-label="Company data JSON" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="ets-btn primary" onClick={handleCompanyImport} disabled={!companyDraft.trim()}>Add companies</button>
          {companyImportText && (
            <button type="button" className="ets-btn" onClick={() => { setCompanyImportText(''); writeStoredImport('', COMPANY_IMPORT_STORAGE_KEY); setCompanyErrors([]); }}>
              Remove imported companies
            </button>
          )}
        </div>
        {companyErrors.length > 0 && <ul className="ets-errors">{companyErrors.map(e => <li key={e}>{e}</li>)}</ul>}
      </div>
    </details>
  );

  const maxCountryCost = Math.max(0, ...exposureRows.map(r => r.ets2CostEurM ?? 0));

  const countryImport = (
    <details className="ets-details" open={loadedCount === 0}>
      <summary>Load sourced country gas data <span className="meta">JSON · rows without a source URL are rejected</span></summary>
      <div className="inner">
        <div className="ets-code">{'[{ "iso": "IT", "gasBuildingsTWh": 0, "gasVolumeBasis": "GCV", "gasDataYear": 2024, "gasSourceUrl": "https://…", "existingCarbonPriceEurPerT": null }]'}</div>
        <textarea className="ets-textarea" value={draftImport} onChange={e => setDraftImport(e.target.value)} aria-label="Country data JSON" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="ets-btn primary" onClick={handleImport} disabled={!draftImport.trim()}>Load data</button>
          {importText && (
            <button type="button" className="ets-btn" onClick={() => { setImportText(''); writeStoredImport(''); setImportErrors([]); }}>Clear imported data</button>
          )}
        </div>
        {importErrors.length > 0 && <ul className="ets-errors">{importErrors.map(e => <li key={e}>{e}</li>)}</ul>}
      </div>
    </details>
  );

  const countriesTab = (
    <div className="ets-body">
      {loadedCount === 0 && (
        <>
          <div className="ets-empty" style={{ marginBottom: 16 }}>
            <strong>No country gas data loaded yet</strong>
            The ranking needs each country's gas use in buildings (households + services), from Eurostat's energy balances, with a source link per row. Load it below and every country — and every supplier's ETS2 cost on the gas suppliers tab — fills in.
          </div>
          <div style={{ marginBottom: 24 }}>{countryImport}</div>
        </>
      )}
      {isMobile ? (
        <>
      <MobileCardList
        testId="ets2-country-cards"
        items={exposureRows}
        getKey={r => r.profile.iso}
        title={r => r.profile.name}
        subtitle={r => (r.rank === null ? 'No sourced gas data yet' : `Rank ${r.rank}`)}
        metric={r => (r.ets2CostEurM === null ? '—' : `€${Math.round(r.ets2CostEurM).toLocaleString('en-GB')}m`)}
        metricLabel={() => 'ETS2 cost on building gas'}
        fields={r => [
          {
            label: 'Gas, TWh',
            value: r.profile.gasBuildingsTWh === null ? '—' : `${r.profile.gasBuildingsTWh.toFixed(1)}${r.profile.gasDataYear ? ` (${r.profile.gasDataYear})` : ''}`,
            mono: true,
            tone: r.profile.gasBuildingsTWh === null ? 'muted' : undefined,
          },
          { label: 'MtCO₂', value: r.emissionsMtCo2 === null ? '—' : r.emissionsMtCo2.toFixed(1), mono: true, tone: r.emissionsMtCo2 === null ? 'muted' : undefined },
          { label: 'vs today', value: r.incrementalCostEurM === null ? '—' : `€${Math.round(r.incrementalCostEurM).toLocaleString('en-GB')}m`, mono: true, tone: r.incrementalCostEurM === null ? 'muted' : undefined },
          {
            label: 'Carbon price today',
            value: r.profile.existingCarbonPricing.source ? (
              <a href={r.profile.existingCarbonPricing.source.url} target="_blank" rel="noreferrer" title={r.profile.existingCarbonPricing.source.note} className="ets-link">
                {r.profile.existingCarbonPricing.label}
              </a>
            ) : (
              <span className="ets-muted">{r.profile.existingCarbonPricing.label}</span>
            ),
            span: 2,
          },
        ]}
      />
      <div className="ets-foot-note">
        {loadedCount} of {countries.length} countries with sourced gas data · ranked by ETS2 cost{priceValue === null ? ' (set a price in the calculator)' : ` at €${priceValue}/t`}
      </div>

        </>
      ) : (
        <>
      <DataTable>
        <div className="ds-thead-row ets-cols-countries">
          <span>#</span>
          <span>Country</span>
          <span>ETS2 cost on building gas</span>
          <span className="ets-right">Gas, TWh</span>
          <span className="ets-right">MtCO₂</span>
          <span className="ets-right">vs today</span>
          <span>Carbon price today</span>
        </div>
        {exposureRows.map(r => (
          <div key={r.profile.iso} className="ds-row ets-row-static ets-row-compact ets-cols-countries" style={{ opacity: r.rank === null ? 0.6 : 1 }}>
            <span className="ets-muted num">{r.rank ?? ''}</span>
            <span className="ds-row-name">{r.profile.name}</span>
            {r.ets2CostEurM === null ? <span className="ets-muted" style={{ fontSize: 12 }}>—</span> : (
              <BarCell value={r.ets2CostEurM} max={maxCountryCost}>€{Math.round(r.ets2CostEurM).toLocaleString('en-GB')}m</BarCell>
            )}
            <span className="ets-cell-num">
              {r.profile.gasBuildingsTWh === null ? '—' : r.profile.gasBuildingsTWh.toFixed(1)}
              {r.profile.gasDataYear ? <span className="ets-cell-sub">{r.profile.gasDataYear}</span> : null}
            </span>
            <span className="ets-cell-num">{r.emissionsMtCo2 === null ? '—' : r.emissionsMtCo2.toFixed(1)}</span>
            <span className="ets-cell-num">{r.incrementalCostEurM === null ? '—' : `€${Math.round(r.incrementalCostEurM).toLocaleString('en-GB')}m`}</span>
            <span style={{ fontSize: 12, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {r.profile.existingCarbonPricing.source ? (
                <a href={r.profile.existingCarbonPricing.source.url} target="_blank" rel="noreferrer" title={r.profile.existingCarbonPricing.source.note} className="ets-link">
                  {r.profile.existingCarbonPricing.label}
                </a>
              ) : (
                <span className="ets-muted">{r.profile.existingCarbonPricing.label}</span>
              )}
            </span>
          </div>
        ))}
        <div className="ds-tfoot">
          <span>{loadedCount} of {countries.length} countries with sourced gas data · ranked by ETS2 cost{priceValue === null ? ' (set a price in the calculator)' : ` at €${priceValue}/t`}</span>
        </div>
      </DataTable>

        </>
      )}

      {loadedCount > 0 && <div className="ets-section-gap">{countryImport}</div>}
    </div>
  );

  const calculatorTab = (
    <div className="ets-body ets-calc">
      <div className="ds-card">
        <div className="ds-card-header">
          <div>
            <div className="ds-card-title">Client inputs</div>
            <div className="ds-card-meta">Every number is yours — nothing is defaulted</div>
          </div>
        </div>
        <div className="ds-card-body ets-form">
          <Field label="Annual gas use" value={gasMWh} onChange={setGasMWh} unit="MWh" />
          <label>
            <span className="lbl">Volume basis</span>
            <Segmented<GasVolumeBasis> label="Volume basis" value={basis} onChange={setBasis} options={[{ id: 'GCV', label: 'As invoiced (GCV)' }, { id: 'NCV', label: 'NCV' }]} />
          </label>
          <Field
            label="ETS2 price scenario"
            value={price}
            onChange={setPrice}
            unit="€/tCO₂"
            hint={`Price control releases extra allowances above €${PRICE_CONTROL_TRIGGER_EUR_2020}/t in 2020 prices (Art. 30h).`}
          />
          <div className="ets-chips">
            {deskMid !== null && <button type="button" className="ets-chip" onClick={() => setPrice(String(deskMid))}>Desk mark €{deskMid.toFixed(2)}</button>}
            <button type="button" className="ets-chip" onClick={() => setPrice(String(PRICE_CONTROL_TRIGGER_EUR_2020))}>€{PRICE_CONTROL_TRIGGER_EUR_2020} trigger (2020 €)</button>
          </div>
          <Field label="Carbon price already paid" value={existingPrice} onChange={setExistingPrice} unit="€/tCO₂" hint="e.g. Germany's BEHG. Leave blank if none." />
          <Field label="Supplier pass-through" value={passThroughPct} onChange={setPassThroughPct} unit="%" hint="Share of the supplier's allowance cost on the client's bill." />
          <Field label="Share switched to biomethane" value={bioSharePct} onChange={setBioSharePct} unit="%" />
          <Field label="Biomethane premium quote" value={premium} onChange={setPremium} unit="€/MWh" hint="RED III-compliant, mass-balanced biomethane over the fossil gas it replaces." />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0 }}>
        {result.emissionsTco2 === null ? (
          <div className="ets-empty">
            <strong>Enter the client's gas use to see its ETS2 exposure</strong>
            Still needed: {result.missingInputs.filter(m => m !== 'biomethane premium quote').join(', ')}. Pick a supplier on the ETS2 gas suppliers tab to fill the volume in one click.
          </div>
        ) : (
          <>
            <div className="ets-results-kpis">
              <KpiTile label="Emissions" value={tonnes(result.emissionsTco2)} unit="CO₂/yr" />
              <KpiTile label="Client ETS2 cost" value={eurCompact(result.clientEts2CostEur)} unit="/yr" sub={`Supplier cost ${eurCompact(result.supplierAllowanceCostEur)}`} />
              <KpiTile
                label="Change vs today"
                value={eurCompact(result.incrementalCostEur)}
                unit="/yr"
                sub={result.existingCarbonCostEur === null ? 'No existing carbon price entered' : `Pays ${eurCompact(result.existingCarbonCostEur)} today`}
              />
              <KpiTile className="ets-kpi-accent" label="Break-even premium" value={eur(result.breakevenPremiumEurPerMWh, 2)} unit="/MWh" sub="Biomethane pays for itself below this" />
            </div>
            <div className="ets-results-kpis">
              <KpiTile label="Biomethane volume" value={result.biomethaneMWh === null ? '—' : Math.round(result.biomethaneMWh).toLocaleString('en-GB')} unit="MWh/yr" />
              <KpiTile label="ETS2 cost avoided" value={eurCompact(result.avoidedCostEur)} unit="/yr" />
              <KpiTile
                className={result.netSavingEur !== null && result.netSavingEur > 0 ? 'ets-kpi-accent' : undefined}
                label="Net saving on ETS2 alone"
                value={eurCompact(result.netSavingEur)}
                unit="/yr"
                sub={result.netSavingEur === null ? 'Enter a premium quote' : `Premium paid ${eurCompact(result.biomethanePremiumCostEur)}`}
              />
            </div>
            <div className="ds-card">
              <div className="ds-card-header"><div className="ds-card-title">Workings</div></div>
              <div className="ds-card-body">
                <ol className="ets-workings">{result.workings.map(w => <li key={w}>{w}</li>)}</ol>
                <div className="ds-panel-meta" style={{ marginTop: 12 }}>
                  The ETS2 saving comes on top of any voluntary claim (Scope 1 reporting, product footprint). Zero-rating needs RED III sustainability evidence through the Union Database.
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      {isMobile && result.emissionsTco2 !== null && (
        <div className="m-sticky-actions ets-result-bar" data-testid="ets2-result-bar" role="status" aria-label="ETS2 calculator result">
          <div>
            <span className="ets-result-label">Client ETS2 cost</span>
            <strong className="num">{eurCompact(result.clientEts2CostEur)}<small>/yr</small></strong>
          </div>
          <div>
            <span className="ets-result-label">Break-even premium</span>
            <strong className="num">{eur(result.breakevenPremiumEurPerMWh, 2)}<small>/MWh</small></strong>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <PageShell style={{ overflowY: 'auto' }}>
      <PageHeader
        title="EU ETS"
        context="Installations under ETS1 today · gas suppliers under ETS2 from 1 Jan 2028 · Directive 2003/87/EC"
        actions={
          <>
            <HeaderPill label="EUA" value={eua === null ? '—' : `€${eua.toFixed(2)}`} sub="desk mark" title="EU_ETS1 desk mark, mid" />
            <HeaderPill
              label="ETS2"
              value={deskMid === null ? '—' : `€${deskMid.toFixed(2)}`}
              sub={deskEts2?.source ? deskEts2.source.toLowerCase() : 'desk mark'}
              title="EU_ETS2 desk mark, mid — no ETS2 market trades yet"
            />
            <HeaderPill
              label="ETS2 starts"
              value={`1 Jan ${ETS2_START_YEAR}`}
              sub={daysToEts2 > 0 ? `${daysToEts2.toLocaleString('en-GB')} days` : 'in force'}
              warn={daysToEts2 > 0 && daysToEts2 <= 180}
            />
          </>
        }
      />
      <Tabs<Ets2Tab>
        ariaLabel="EU ETS sections"
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: 'ETS1_SITES', label: 'ETS1 installations' },
          { id: 'DIRECTORY', label: 'ETS2 gas suppliers', badge: companies.length },
          { id: 'CALCULATOR', label: 'ETS2 calculator' },
          { id: 'COUNTRIES', label: 'ETS2 countries', badge: loadedCount ? `${loadedCount}/${countries.length}` : undefined },
        ]}
      />

      {tab === 'ETS1_SITES' && <Ets1SitesTab />}
      {tab === 'DIRECTORY' && (
        <Ets2DirectoryTab
          companies={companies}
          countries={countries}
          ets2PriceEurPerT={priceValue}
          onOpenInCalculator={mwh => { setGasMWh(String(mwh)); setTab('CALCULATOR'); }}
          importPanel={companyImportPanel}
        />
      )}
      {tab === 'CALCULATOR' && calculatorTab}
      {tab === 'COUNTRIES' && countriesTab}
    </PageShell>
  );
}
