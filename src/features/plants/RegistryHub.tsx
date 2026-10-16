import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ExternalLink, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import {
  REGISTRY_DIRECTORY,
  RegistryDirectoryEntry,
  TriState,
  getRegistryByCountry,
  findRegistry,
} from '../../domain/registries/registryDirectory';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import {
  fetchEnerginetDailyBiogas,
  EnerginetBiogasResult,
} from '../../domain/registries/energinetApi';
import {
  fetchOdreAnnualProduction,
  OdreAnnualProductionData,
} from '../../domain/registries/tsoFlowApi';
import { KpiRow, KpiTile } from '../../shared/ui/KpiTile';
import { Sheet, MobileCardList } from '../../shared/ui';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import './registries.css';

// ---------------------------------------------------------------------------
// Sourced reference data (scratch/registry_research/*.md, accessed 2026-09-28)
// ---------------------------------------------------------------------------

const UDB_SOURCE_URL = 'https://www.europeanbiogas.eu/publication/union-database-leaflet/';
const ERGAR_STATS_URL = 'https://www.ergar.org/ergar-schemes/coo-scheme-statistics/';
const EBA_STAT_REPORT_URL = 'https://www.europeanbiogas.eu/news/eba-statistical-report-2025/';

interface ProductionStatRow {
  countryCode: string;
  countryName: string;
  latestYear: string;
  figure: string;
  source: string;
  sourceUrl: string;
}

// From scratch/registry_research/production_stats.md — only figures with a direct source pull.
const PRODUCTION_STATS: ProductionStatRow[] = [
  {
    countryCode: 'EU',
    countryName: 'EU-27 (biomethane only)',
    latestYear: '~2024/2025',
    figure: '4.3 bcm (of 5.2 bcm biomethane across wider Europe)',
    source: 'European Biogas Association, 15th Statistical Report (Dec 2025)',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'DE',
    countryName: 'Germany',
    latestYear: '2023',
    figure: '~10.4 TWh',
    source: "dena Biomethane Industry Barometer 2023 (2024: 1.4 bcm injected ≈ 14.8–15.4 TWh, converted)",
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'NL',
    countryName: 'Netherlands',
    latestYear: '2024',
    figure: '294 million m³ ≈ 3.1–3.2 TWh (converted)',
    source: 'IEA Bioenergy Netherlands country report / Biomassa Feiten',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'ES',
    countryName: 'Spain',
    latestYear: 'end-2024',
    figure: '~1.86 TWh (42 plants); 2021 baseline was 0.25 TWh',
    source: 'Enaгás/Sedigas-adjacent industry coverage; RSC journal (2021 baseline)',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'FR',
    countryName: 'France',
    latestYear: '2023',
    figure: '7,907,571 GOs issued (≈7.9 TWh, +18% YoY)',
    source: 'GRDF/EEX RGO 2023 activity report',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'DK',
    countryName: 'Denmark',
    latestYear: '2023',
    figure: '~40% of the Danish gas system is biomethane (no absolute TWh sourced)',
    source: 'Energinet / IEA Bioenergy Denmark country report',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'PL',
    countryName: 'Poland',
    latestYear: '2025',
    figure: 'First industrial-scale grid-connected plant, 9 September 2025 — no meaningful national total yet',
    source: 'gasworld.com; Baker McKenzie insight',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    latestYear: '2022',
    figure: 'Joined biomethane-producing countries in 2022 — no country-level TWh sourced',
    source: 'European Biogas Association Statistical Report 2025',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
  {
    countryCode: 'LT',
    countryName: 'Lithuania',
    latestYear: '2023',
    figure: 'Joined biomethane-producing countries in 2023 — no country-level TWh sourced',
    source: 'European Biogas Association Statistical Report 2025',
    sourceUrl: EBA_STAT_REPORT_URL,
  },
];

const UNVERIFIED_PRODUCTION_COUNTRIES = 'Italy, UK, Austria, Belgium, Sweden, Switzerland, Finland, Norway, Czechia, Ireland, Hungary, Estonia, Latvia, Slovakia';

const CORRECTIONS_TEXT: string[] = [
  "Spain: the old figures showed a 1.1 TWh gross export (58% of issuance) with no confirmed ERGaR activity for Spain and a market that only reached ~1.86 TWh of production by end-2024 (from 0.25 TWh biomethane in 2021) — that export figure has no supporting source and is very likely fabricated.",
  'Poland: the old figures showed ~0.95 TWh issuance and 0.2 TWh of exports for a country whose first industrial-scale grid-connected plant went live on 9 September 2025 — not credible on this timeline.',
  'Portugal and Lithuania: the old figures showed the highest (64.0%) and third-highest (60.71%) export shares of all 22 countries, for markets that only started producing biomethane in 2022 and 2023 respectively — treat as unverified/likely overstated.',
  'France: the old figures implied broad cross-border capability (ERGaR + UDB direct transfer), but a GRDF/Cegibat explainer states French GOs are usable only in France — "there is no European market for guarantees of origin" for French-origin gas.',
  'ERGaR-wide: total confirmed ERGaR cross-border activity is on the order of ~4 TWh/year (2025); the old per-country export figures (e.g. Denmark alone at 5.6 TWh) were an order of magnitude larger than the entire confirmed EU-wide ERGaR flow — an internal-consistency red flag independent of any single-country critique.',
];

// Compliance markets named in the research (udb_process.md / registries.md) — kept short and honest;
// not every market referenced elsewhere in the app has a sourced entry here.
function triLabel(v: TriState): string {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  return 'Unverified';
}

function triChipClass(v: TriState): string {
  if (v === true) return 'chip-pass';
  if (v === false) return 'chip-neutral';
  return 'chip-warn';
}

function verificationChipClass(level: RegistryDirectoryEntry['verificationLevel']): string {
  if (level === 'VERIFIED') return 'chip-pass';
  if (level === 'PARTIAL') return 'chip-warn';
  return 'chip-neutral';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type TabId = 'directory' | 'production' | 'live';

// The old in-hub route checker (own bilateral/blocker logic) was removed: routes live on the audited route matrix (#/map).
const isTabId = (t: string | null): t is TabId => t === 'directory' || t === 'production' || t === 'live';

export function RegistryHub() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const initialTab: TabId = isTabId(tabParam) ? tabParam : 'directory';
  const paramCountry = searchParams.get('country');
  const paramRegistry = searchParams.get('registry');

  const resolvedInitialCountry = useMemo(() => {
    if (paramCountry) {
      const match = getRegistryByCountry(paramCountry);
      if (match) return match.countryCode;
    }
    if (paramRegistry) {
      const match = findRegistry(paramRegistry);
      if (match) return match.countryCode;
    }
    return null;
  }, [paramCountry, paramRegistry]);

  const [activeTab, setActiveTab] = useState<TabId>(() => {
    return initialTab;
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(resolvedInitialCountry);
  const [correctionsOpen, setCorrectionsOpen] = useState(false);

  // Sync external search param changes into component state
  useEffect(() => {
    const c = searchParams.get('country');
    const r = searchParams.get('registry');
    const tRaw = searchParams.get('tab');
    const t = isTabId(tRaw) ? tRaw : null;
    if (c) {
      const match = getRegistryByCountry(c);
      if (match && match.countryCode !== selectedCountry) {
        setSelectedCountry(match.countryCode);
        setActiveTab('directory');
      }
    } else if (r) {
      const match = findRegistry(r);
      if (match && match.countryCode !== selectedCountry) {
        setSelectedCountry(match.countryCode);
        setActiveTab('directory');
      }
    } else if (t && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const [energinet, setEnerginet] = useState<EnerginetBiogasResult | null>(null);
  const [odre, setOdre] = useState<OdreAnnualProductionData | null>(null);

  // Fetch lazily, only once, when this tab mounts — never on app-wide page load.
  useEffect(() => {
    let cancelled = false;
    fetchEnerginetDailyBiogas().then(r => { if (!cancelled) setEnerginet(r); });
    fetchOdreAnnualProduction().then(r => { if (!cancelled) setOdre(r); });
    return () => { cancelled = true; };
  }, []);

  const handleSelectCountry = (countryCode: string | null) => {
    setSelectedCountry(countryCode);
    const nextParams = new URLSearchParams(searchParams);
    if (countryCode) {
      nextParams.set('country', countryCode);
      nextParams.delete('registry');
    } else {
      nextParams.delete('country');
      nextParams.delete('registry');
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleTabChange = (newTab: TabId) => {
    setActiveTab(newTab);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', newTab);
    setSearchParams(nextParams, { replace: true });
  };

  const selectedEntry = selectedCountry ? getRegistryByCountry(selectedCountry) : undefined;

  const sortedDirectory = useMemo(
    () => [...REGISTRY_DIRECTORY].sort((a, b) => a.countryName.localeCompare(b.countryName)),
    []
  );


  const asideEl = (
  <aside className="ds-aside rh-aside">
    {!selectedEntry ? (
      <div className="ds-aside-section">
        <div className="ds-panel-section-heading">Registry detail</div>
        <div className="mut" style={{ fontSize: '12.5px' }}>Click a row to see its full sourced entry, including sources and notes.</div>
      </div>
    ) : (
      <>
        <div className="ds-aside-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
            <div>
              <div className="ds-panel-title">{selectedEntry.registryName}</div>
              <div className="ds-panel-meta">{selectedEntry.countryName} ({selectedEntry.countryCode}) · {selectedEntry.operator}</div>
            </div>
            <button type="button" className="ds-icon-btn ds-icon-btn-sm" aria-label="Close panel" onClick={() => handleSelectCountry(null)}>
              <X size={14} />
            </button>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span className={`chip ${verificationChipClass(selectedEntry.verificationLevel)}`}>{selectedEntry.verificationLevel}</span>{' '}
            <a href={selectedEntry.officialUrl} target="_blank" rel="noreferrer" className="chip chip-neutral" style={{ textDecoration: 'none' }}>
              Official / reference link <ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px', marginLeft: '2px' }} />
            </a>
          </div>
        </div>
        <div className="ds-aside-body">
          <div className="ds-aside-section">
            <div className="ds-panel-section-heading">Facts</div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.7 }}>
              <div>Issues: <strong>{selectedEntry.issues.replace('_AND_', ' + ')}</strong></div>
              <div>AIB EECS Gas Scheme: <span className={`chip ${triChipClass(selectedEntry.aibGasScheme)}`}>{triLabel(selectedEntry.aibGasScheme)}</span></div>
              <div>ERGaR CoO scheme: <span className={`chip ${triChipClass(selectedEntry.ergar)}`}>{triLabel(selectedEntry.ergar)}</span></div>
              <div>UDB status: <span className="chip chip-neutral">Not live — postponed to end-2026 (EBA)</span></div>
            </div>
          </div>
          <div className="ds-aside-section">
            <div className="ds-panel-section-heading">Cross-border routes</div>
            {selectedEntry.crossBorderRoutes.length === 0 ? (
              <div className="mut" style={{ fontSize: '12.5px' }}>None confirmed in this research.</div>
            ) : (
              <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', lineHeight: 1.7 }}>
                {selectedEntry.crossBorderRoutes.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
          <div className="ds-aside-section">
            <div className="ds-panel-section-heading">Compliance market(s) fed</div>
            <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '12.5px', lineHeight: 1.7 }}>
              {selectedEntry.complianceMarketsFed.map((m, i) => <li key={i}>{m}</li>)}
            </ul>
          </div>
          <div className="ds-aside-section">
            <div className="ds-panel-section-heading">Notes</div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.7 }}>{selectedEntry.notes}</div>
          </div>
          <div className="ds-aside-section" style={{ flexGrow: 1 }}>
            <div className="ds-panel-section-heading">Sources</div>
            <div className="rh-source-list">
              {selectedEntry.sources.map((s, i) => (
                <div key={i} className="rh-source-row">
                  <div>{s.claim}</div>
                  <a href={s.url} target="_blank" rel="noreferrer">{s.url}</a>
                  <div className="mut">Accessed {s.accessed}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )}
  </aside>
  );

  return (
    <div className="rh-screen">
      <div className="ds-header" style={{ padding: '24px 0 8px' }}>
        <div>
          <div className="eyebrow">Registries &amp; compliance</div>
          <h1 className="ds-h1">Registries &amp; cross-border routes</h1>
        </div>
      </div>

      <div className="rh-context">
        A <strong>Guarantee of Origin (GO)</strong> is a disclosure instrument (RED Art. 19): it shows a buyer that gas was
        renewable, and it moves through national registries, the AIB EECS Gas Scheme hub, or the ERGaR Certificate of
        Origin (CoO) scheme. A <strong>Proof of Sustainability (PoS)</strong> is a compliance instrument: it proves a
        consignment meets RED sustainability/GHG-saving criteria so it can count toward binding targets (e.g. Germany's
        THG-Quote, France's TIRUERT, Italy's CIC, the UK's RTFO). A GO alone does not grant compliance eligibility, and
        the two are not interchangeable.
      </div>

      <div className="rh-notice">
        <span>
          <strong>Union Database (UDB) for gas is not live yet:</strong> launch postponed to end-2026 (European Biogas
          Association). Until then, cross-border compliance relies on national registries and ERGaR/AIB GO routes.{' '}
          <a href={UDB_SOURCE_URL} target="_blank" rel="noreferrer">Source <ExternalLink size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /></a>
        </span>
      </div>

      <KpiRow columns={4}>
        <KpiTile
          label="ERGaR hub volume, Q1 2026"
          value="1.383"
          unit="TWh"
          sub={<>796 transfers · <a href={ERGAR_STATS_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>ERGaR CoO statistics, accessed 2026-09-28</a></>}
        />
        <KpiTile
          label="Main importers, Q1 2026"
          value="DE ~2/3"
          sub={<>CH (Pronovo) ~1/3 · <a href={ERGAR_STATS_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>ERGaR CoO statistics</a></>}
        />
        <KpiTile
          label="Main exporters, Q1 2026"
          value="UK (GGCS)"
          sub={<>slightly ahead of DK, then NL and DE · <a href={ERGAR_STATS_URL} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>ERGaR CoO statistics</a></>}
        />
        <KpiTile
          label="Denmark biomethane injection"
          value={energinet?.latestGwhPerDay != null ? energinet.latestGwhPerDay.toFixed(1) : '—'}
          unit="GWh/day"
          sub={
            energinet == null
              ? 'Loading…'
              : energinet.source === 'UNAVAILABLE'
                ? 'Energinet data temporarily unavailable (rate-limited)'
                : `${energinet.days[0]?.gasDay ?? ''} · ${energinet.source === 'CACHED' ? `cached ${energinet.cacheAgeMinutes ?? 0}m ago` : 'live'} · Energinet Gasflow API`
          }
        />
      </KpiRow>

      <div className="rh-tabs">
        {(
          [
            ['directory', 'Registry directory'],
            ['production', 'Production statistics'],
            ['live', 'Live data'],
          ] as [TabId, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`btn rh-tab ${activeTab === id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={e => {
              handleTabChange(id);
              if (isMobile) e.currentTarget.scrollIntoView({ inline: 'center', block: 'nearest' });
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'directory' && (
        <div className="rh-section rh-grid">
          <div className="ds-table-wrap">
            {isMobile ? (
              <MobileCardList
                testId="registry-cards"
                items={sortedDirectory}
                getKey={e => e.countryCode}
                title={e => e.registryName}
                subtitle={e => (
                  <>
                    <span className="num" style={{ fontWeight: 600 }}>{e.countryCode}</span> · {e.countryName}
                  </>
                )}
                badges={e => <span className={`chip ${verificationChipClass(e.verificationLevel)}`}>{e.verificationLevel}</span>}
                fields={e => [
                  { label: 'Issues', value: e.issues.replace('_AND_', ' + ') },
                  { label: 'UDB', value: <span className="chip chip-neutral">Not live</span> },
                  { label: 'AIB', value: <span className={`chip ${triChipClass(e.aibGasScheme)}`}>{triLabel(e.aibGasScheme)}</span> },
                  { label: 'ERGaR', value: <span className={`chip ${triChipClass(e.ergar)}`}>{triLabel(e.ergar)}</span> },
                  { label: 'Cross-border route', span: 2, value: e.crossBorderRoutes[0] || 'None confirmed' },
                ]}
                onSelect={e => handleSelectCountry(e.countryCode)}
              />
            ) : (
            <>
            <div className="ds-thead-row rh-directory-cols">
              <div>Country</div>
              <div>Registry</div>
              <div>Issues</div>
              <div>AIB</div>
              <div>ERGaR</div>
              <div>UDB</div>
              <div>Cross-border route</div>
              <div>Verification</div>
            </div>
            <div role="listbox" aria-label="Registry directory">
              {sortedDirectory.map(entry => (
                <button
                  key={entry.countryCode}
                  type="button"
                  role="option"
                  aria-selected={selectedCountry === entry.countryCode}
                  className={`ds-row rh-directory-cols ${selectedCountry === entry.countryCode ? 'selected' : ''}`}
                  onClick={() => handleSelectCountry(entry.countryCode)}
                >
                  <div className="rh-cell-ellipsis" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} title={`${entry.countryName} (${entry.countryCode})`}>
                    <span style={{ fontSize: '14px' }}>{PRODUCING_ORIGINS[entry.countryCode]?.flag || '🇪🇺'}</span>
                    <span className="num" style={{ fontWeight: 700, color: 'var(--color-text)' }}>{entry.countryCode}</span>
                    <span style={{ color: 'var(--color-muted)', fontSize: '12px' }}>{entry.countryName}</span>
                  </div>
                  <div className="rh-cell-ellipsis" title={entry.registryName}>{entry.registryName}</div>
                  <div>{entry.issues.replace('_AND_', ' + ')}</div>
                  <div><span className={`chip ${triChipClass(entry.aibGasScheme)}`}>{triLabel(entry.aibGasScheme)}</span></div>
                  <div><span className={`chip ${triChipClass(entry.ergar)}`}>{triLabel(entry.ergar)}</span></div>
                  <div><span className="chip chip-neutral">Not live</span></div>
                  <div className="rh-cell-ellipsis" title={entry.crossBorderRoutes[0] || 'None confirmed'}>
                    {entry.crossBorderRoutes[0] || 'None confirmed'}
                  </div>
                  <div><span className={`chip ${verificationChipClass(entry.verificationLevel)}`}>{entry.verificationLevel}</span></div>
                </button>
              ))}
            </div>
            </>
            )}
          </div>

          {isMobile ? (
            <Sheet
              open={!!selectedEntry}
              onClose={() => handleSelectCountry(null)}
              variant="full"
              title={selectedEntry?.registryName}
              subtitle={selectedEntry ? `${selectedEntry.countryName} (${selectedEntry.countryCode}) · ${selectedEntry.operator}` : undefined}
              testId="registry-detail-sheet"
            >
              {selectedEntry && asideEl}
            </Sheet>
          ) : (
            asideEl
          )}
        </div>
      )}

      {activeTab === 'production' && (
        <div className="rh-section">
          <div className="rh-section-title">Production statistics</div>
          <div className="rh-section-sub">
            Only figures directly pulled from a source in this research. Countries not listed ({UNVERIFIED_PRODUCTION_COUNTRIES})
            have no independently-sourced production total in this research.
          </div>

          {isMobile ? (
            <MobileCardList
              testId="production-cards"
              items={PRODUCTION_STATS}
              getKey={r => r.countryCode}
              title={r => r.countryName}
              subtitle={r => <span className="num">{r.countryCode} · {r.latestYear}</span>}
              fields={r => [
                { label: 'Figure', span: 2, value: r.figure },
                { label: 'Source', span: 2, value: <a href={r.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px', color: 'var(--color-accent-700)' }}>{r.source}</a> },
              ]}
            />
          ) : (
          <div className="ds-table-wrap">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Country</th>
                  <th>Latest year</th>
                  <th>Figure</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTION_STATS.map(row => (
                  <tr key={row.countryCode}>
                    <td className="num" style={{ fontWeight: 600 }}>{row.countryCode}</td>
                    <td className="num">{row.latestYear}</td>
                    <td>{row.figure}</td>
                    <td>
                      <a href={row.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12.5px' }}>{row.source}</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}

          <div style={{ marginTop: '12px' }}>
            <button type="button" className="rh-collapsible-toggle" onClick={() => setCorrectionsOpen(v => !v)}>
              {correctionsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Corrections vs. the previous (fabricated) app figures
            </button>
            {correctionsOpen && (
              <div className="rh-collapsible-body">
                <div>The old Registries tab carried a <code>BASELINE_BALANCE_OF_TRADE</code> table of import/export figures with no supporting source. Specific issues found:</div>
                <ul>
                  {CORRECTIONS_TEXT.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'live' && (
        <div className="rh-section">
          <div className="rh-section-title">Live data</div>
          <div className="rh-section-sub">Honest about what each source actually is — no invented telemetry.</div>

          <div className="rh-live-columns">
            <div className="rh-live-card">
              <div className="rh-live-card-head">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Denmark — daily biomethane injection (Energinet)</div>
                  <div className="mut" style={{ fontSize: '12px' }}>Real, live, national daily aggregate (KWhFromBiogas) — not per-plant telemetry.</div>
                </div>
              </div>

              {!energinet ? (
                <div className="mut" style={{ fontSize: '12.5px' }}>Loading…</div>
              ) : energinet.source === 'UNAVAILABLE' ? (
                <div className="rh-unavailable">
                  {energinet.unavailableReason}
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '12.5px', marginBottom: '10px' }} className="mut">
                    {energinet.source === 'CACHED' ? `Cached ${energinet.cacheAgeMinutes ?? 0} minute(s) ago` : 'Live'} ·
                    Annualised run-rate from latest day: <span className="num">{energinet.annualisedRunRateTWh?.toFixed(2)}</span> TWh/yr
                  </div>
                  <div className="rh-daily-list">
                    {energinet.days.slice(0, 14).map(d => {
                      const max = Math.max(...energinet.days.map(x => x.gwhFromBiogas), 1);
                      const pct = Math.max(2, (d.gwhFromBiogas / max) * 100);
                      return (
                        <div key={d.gasDay} className="rh-daily-row">
                          <span className="num">{d.gasDay}</span>
                          <span className="rh-daily-bar-track"><span className="rh-daily-bar-fill" style={{ width: `${pct}%` }} /></span>
                          <span className="num">{d.gwhFromBiogas.toFixed(1)} GWh</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
              <div style={{ marginTop: '10px' }}>
                <a href="https://api.energidataservice.dk/dataset/Gasflow" target="_blank" rel="noreferrer" style={{ fontSize: '12px' }}>api.energidataservice.dk/dataset/Gasflow</a>
              </div>
            </div>

            <div className="rh-live-card">
              <div className="rh-live-card-head">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>France — per-site biomethane capacity (ODRE)</div>
                  <div className="mut" style={{ fontSize: '12px' }}>Published data, updated monthly — not real-time.</div>
                </div>
              </div>

              {!odre ? (
                <div className="mut" style={{ fontSize: '12.5px' }}>Loading…</div>
              ) : odre.source === 'UNAVAILABLE' ? (
                <div className="rh-unavailable">ODRE data temporarily unavailable. {odre.unavailableReason}</div>
              ) : (
                <>
                  <div style={{ fontSize: '12.5px', marginBottom: '10px' }} className="mut">
                    {odre.source === 'CACHED' ? `Cached ${odre.cacheAgeMinutes ?? 0} minute(s) ago` : 'Live'} ·
                    <span className="num"> {odre.siteCount}</span> sites, <span className="num">{odre.totalCapacityGwhYear.toLocaleString()}</span> GWh/yr modelled from annual capacity
                  </div>
                  <div className="rh-daily-list">
                    {odre.points.slice(0, 14).map(p => (
                      <div key={p.id} className="rh-daily-row">
                        <span className="rh-cell-ellipsis" style={{ maxWidth: '60%' }}>{p.nodeName}</span>
                        <span className="num">{((p.flowRateNm3PerHour * 10.5 * 8760) / 1_000_000).toFixed(1)} GWh/yr</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div style={{ marginTop: '10px' }}>
                <a href="https://odre.opendatasoft.com" target="_blank" rel="noreferrer" style={{ fontSize: '12px' }}>odre.opendatasoft.com</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
