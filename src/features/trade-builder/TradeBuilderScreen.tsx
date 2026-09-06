import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS, getCountryFeedstockCI } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody, AnnexClassification } from '../../domain/consignment/types';
import { TradeAssessment } from '../../domain/trade/types';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { parseDealParams } from '../../domain/trade/dealParams';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { LegalPackageModal, DocumentTab } from './LegalPackageModal';
import { showToast } from '../../app/DeskToastContainer';
import { generateEfetBiomethaneAnnexPdf, generateCommercialTermSheetPdf, downloadDealFile } from '../../domain/trade/legalPackage';

import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';

const ORIGIN_DESCRIPTIONS: Record<string, string> = {
  DK: 'Denmark · 60 producing facilities · Energinet registry. EU-interconnected via Ellund, so UDB grid ingestion is evidenceable.',
  DE: 'Germany · 285 producing facilities · dena Biogasregister.',
  FR: 'France · 829 producing facilities · GRTgaz / Teréga / EEX registry.',
  NL: 'Netherlands · 92 producing facilities · VertiCer registry.',
  IT: 'Italy · 273 producing facilities · GSE Biometano registry.',
  ES: 'Spain · 26 producing facilities · Enagás GTS (Sistema GdO).',
  GB: 'United Kingdom · Grid-isolated; cannot evidence UDB ingestion into EU compliance destinations without physical segregation.',
  SE: 'Sweden · 67 producing facilities · Energigas Sverige registry.',
  FI: 'Finland · 32 producing facilities · Gasgrid Finland registry.',
  AT: 'Austria · 20 producing facilities · AGCS Biomethan Register.',
  CH: 'Switzerland · Non-EU grid-isolated; cannot evidence UDB ingestion.',
  NO: 'Norway · Grid-isolated; cannot evidence UDB ingestion.',
  PT: 'Portugal · 13 producing facilities · REN / DGEG registry.',
  BE: 'Belgium · 12 producing facilities · Fluxys / Brugel registry.',
  LT: 'Lithuania · 12 producing facilities · Amber Grid Biomethane GO Platform.',
  CZ: 'Czech Republic · 10 producing facilities · OTE a.s. registry.',
  LV: 'Latvia · 10 producing facilities · Conexus Baltic Grid GO platform.',
  EE: 'Estonia · 4 producing facilities · Elering Biomethane Register.',
  SK: 'Slovakia · 3 producing facilities · SPP - Distribucia / OKTE platform.',
  LU: 'Luxembourg · 2 producing facilities · ILR / Creos registry.',
  PL: 'Poland · 5 producing facilities · KZR INiG / Gaz-System registry.',
  HU: 'Hungary · 4 producing facilities · FGSZ / MEKH GO registry.',
  RO: 'Romania · 2 producing facilities · Transgaz registry.',
  IE: 'Ireland · 3 producing facilities · Gas Networks Ireland (GNI) registry.',
  SI: 'Slovenia · 2 producing facilities · Plinovodi registry.',
  HR: 'Croatia · 2 producing facilities · Plinacro registry.',
  GR: 'Greece · 2 producing facilities · DESFA registry.',
  BG: 'Bulgaria · 1 producing facility · Bulgartransgaz registry.',
};

const ORIGINS = Object.values(PRODUCING_ORIGINS).map(p => ({
  code: p.countryCode,
  name: p.countryName,
  flag: p.flag,
  isolated: p.gridZone === 'NON_EU_ISOLATED',
  desc: ORIGIN_DESCRIPTIONS[p.countryCode] || `${p.countryName} · ${p.activePlants} producing facilities · ${p.primaryRegistry} registry.${p.gridZone === 'NON_EU_ISOLATED' ? ' Grid-isolated; cannot evidence UDB ingestion into EU compliance destinations.' : ' EU-interconnected gas grid, UDB ingestion is evidenceable.'}`,
}));

const FEEDSTOCKS: { key: string; label: string; defaultCI: number; hint: string }[] = [
  { key: 'manure', label: 'Manure & slurry', defaultCI: -100, hint: 'Annex IX Part A. The negative carbon intensity comes from avoided methane in conventional manure management, not from the upgrading process.' },
  { key: 'agricultural_residues', label: 'Agricultural residues', defaultCI: 16, hint: 'Annex IX Part A. High-margin non-food residue with RED III compliance across all EU transport routes.' },
  { key: 'food_waste', label: 'Food waste', defaultCI: 14, hint: 'Annex IX Part A. Municipal or commercial source-separated organic waste.' },
  { key: 'sewage_sludge', label: 'Sewage sludge', defaultCI: 22, hint: 'Annex IX Part A. Wastewater treatment substrate.' },
  { key: 'energy_crops', label: 'Energy crops', defaultCI: 42, hint: 'Non-Annex IX. Excluded from RED III transport quota but eligible for voluntary GO and UK RGGO transfers.' },
];

const SCHEMES: { scheme: CertificationScheme; label: string; hint: string }[] = [
  { scheme: 'ISCC_EU', label: 'ISCC EU', hint: 'ISCC EU is recognised for RED III transport compliance in every member state.' },
  { scheme: 'REDCERT_EU', label: 'REDcert EU', hint: 'REDcert EU is fully recognised for statutory transport compliance across the EU.' },
  { scheme: 'ISCC_PLUS', label: 'ISCC PLUS', hint: 'ISCC PLUS is voluntary scope only and hard-blocks every compliance market.' },
];

const CUSTODIES: { custody: ChainOfCustody; label: string; hint: string }[] = [
  { custody: 'MASS_BALANCE', label: 'Mass balance', hint: 'Mass balance is mandatory under RED III Art. 30(1) for all transport compliance claims.' },
  { custody: 'BOOK_AND_CLAIM', label: 'Book & claim', hint: 'Book & claim hard-blocks FuelEU Maritime and every RED III compliance route — mass balance is required by Art. 30(1).' },
];

export function TradeBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  const deal = useMemo(() => parseDealParams(searchParams), [searchParams]);

  const [origin, setOrigin] = useState<string>(deal.originCountry || 'DK');
  const [feedstockKey, setFeedstockKey] = useState<string>(deal.feedstock || 'manure');
  const [scheme, setScheme] = useState<CertificationScheme>((deal.scheme as CertificationScheme) || 'ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>((deal.coc as ChainOfCustody) || 'MASS_BALANCE');
  const [ci, setCi] = useState<number>(deal.ci !== null && deal.ci !== undefined ? deal.ci : -100);
  const [ciTier, setCiTier] = useState<'optimistic' | 'base' | 'conservative'>('base');
  const [marketId, setMarketId] = useState<string>(deal.marketId || state.selectedMarketId || 'DE_THG');
  const [volumeMwh, setVolumeMwh] = useState<number>(deal.volume || 10000);
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [isLegalPackageOpen, setIsLegalPackageOpen] = useState(false);
  const [legalPackageTab, setLegalPackageTab] = useState<DocumentTab>('TERM_SHEET');

  const handleOpenDocReview = (tab: DocumentTab) => {
    setLegalPackageTab(tab);
    setIsLegalPackageOpen(true);
  };

  // Sync with searchParams if they change
  useEffect(() => {
    if (deal.marketId) setMarketId(deal.marketId);
    if (deal.originCountry) setOrigin(deal.originCountry);
    if (deal.feedstock) setFeedstockKey(deal.feedstock);
    if (deal.ci !== null && deal.ci !== undefined) setCi(deal.ci);
    if (deal.volume) setVolumeMwh(deal.volume);
    if (deal.scheme) setScheme(deal.scheme as CertificationScheme);
    if (deal.coc) setChainOfCustody(deal.coc as ChainOfCustody);
  }, [deal]);

  const selectedMarket = useMemo(() => getMarketById(marketId) || MARKETS[0], [marketId]);

  const consignment: Consignment = useMemo(() => {
    const originObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
    const feedObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
    return {
      id: deal.plantId ? `CONSIGN-${deal.plantId}` : `CONSIGN-${origin}-${feedstockKey}`,
      name: deal.plantName ? `${deal.plantName} · ${originObj.name} ${feedObj.label}` : `${originObj.name} ${feedObj.label}`,
      originCountry: origin,
      originCountryName: originObj.name,
      originPlantId: deal.plantId,
      originPlantName: deal.plantName,
      feedstock: feedstockKey,
      feedstockName: feedObj.label,
      annexClassification: (feedstockKey === 'energy_crops' ? 'CROP' : 'IX_A') as AnnexClassification,
      carbonIntensity: ci,
      commissioningDateRange: 'POST_2021_TO_2025',
      certificationScheme: scheme,
      chainOfCustody,
      injectionCountry: origin,
      injectionIsEU: origin !== 'GB' && origin !== 'CH' && origin !== 'NO',
      udbStatus: origin === 'GB' || origin === 'CH' || origin === 'NO' ? 'NOT_RECORDED' : 'RECORDED',
      posStatus: 'ISSUED',
      volumeMWh: volumeMwh,
      deliveryPeriod: {
        type: 'CALENDAR',
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        complianceYear: 2026,
      },
      counterparty: deal.legalEntityName || 'European Offtake Buyer',
    };
  }, [origin, feedstockKey, scheme, chainOfCustody, ci, volumeMwh, deal]);

  // Eligibility evaluation
  const assessment = useMemo(() => {
    return evaluateEligibility(consignment, selectedMarket);
  }, [consignment, selectedMarket]);

  // Netback calculation
  const netback = useMemo(() => {
    return computeNetback(
      selectedMarket,
      consignment,
      state.marks,
      state.costs,
      state.marks.pricingSides
    );
  }, [consignment, selectedMarket, state.marks, state.costs]);

  const ghgSavingPct = Math.round(((94.0 - ci) / 94.0) * 100);
  const currentSide = state.marks.pricingSides?.certificateSide || 'mid';

  // Active hints
  const currentOriginObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
  const currentFeedstockObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
  const currentSchemeObj = SCHEMES.find(s => s.scheme === scheme) || SCHEMES[0];
  const currentCustodyObj = CUSTODIES.find(c => c.custody === chainOfCustody) || CUSTODIES[0];

  // Waterfall rows
  const certVal = netback.certificateValue?.valueEurPerMWh ?? 0;
  const plantCost = netback.producerPayable ?? (state.marks.gasIndex.mid ?? 0);
  const transferCost = state.costs.transferCosts ?? 0;
  const certCost = state.costs.certificationCosts ?? 0;
  const transitCost = state.costs.logistics ?? 0;
  const netNetbackVal = netback.netNetback ?? 0;

  const waterfallMax = Math.max(certVal, plantCost, Math.abs(netNetbackVal), 1);
  const waterfallRows = [
    { label: 'Certificate value', val: `+${certVal.toFixed(2)}`, num: certVal, kind: 'add' },
    { label: 'Delivered cost', val: `−${plantCost.toFixed(2)}`, num: plantCost, kind: 'sub' },
    { label: 'Transfer & registry', val: `−${transferCost.toFixed(2)}`, num: transferCost, kind: 'sub' },
    { label: 'Certification', val: `−${certCost.toFixed(2)}`, num: certCost, kind: 'sub' },
    { label: `Transit ${origin} → ${selectedMarket.country}`, val: `−${transitCost.toFixed(2)}`, num: transitCost, kind: 'sub' },
    { label: 'Net netback', val: `${netNetbackVal >= 0 ? '+' : '−'}${Math.abs(netNetbackVal).toFixed(2)}`, num: Math.abs(netNetbackVal), kind: 'net' },
  ];

  const grossTotal = Math.round(certVal * volumeMwh);
  const deskMarginEurMwh = (netback.deskMargin ?? 0).toFixed(2);
  const annualPnl = Math.round((netback.deskMargin ?? 0) * volumeMwh);

  const currentTradeAssessment: TradeAssessment = useMemo(() => ({
    id: deal.plantId ? `DEAL-2026-${origin}-${deal.plantId.replace(/^plant_/, '').toUpperCase()}` : `DEAL-2026-${origin}-${selectedMarket.id}`,
    createdAt: new Date().toISOString(),
    consignment,
    targetMarketId: selectedMarket.id,
    targetMarketName: selectedMarket.name,
    eligibility: assessment,
    netback,
    marks: state.marks,
    costs: state.costs,
    userNotes: deal.plantName ? `Physical asset sourcing from ${deal.plantName}` : 'Trade Builder Assessment',
  }), [origin, deal, selectedMarket, consignment, assessment, netback, state.marks, state.costs]);

  const handleSaveDossier = () => {
    dispatch({
      type: 'SAVE_ASSESSMENT',
      assessment: currentTradeAssessment,
    });
    showToast(`Dossier saved with six-gate citations · REF ${currentTradeAssessment.id}`);
  };

  const handleExportPdf = () => {
    try {
      const pdf = generateEfetBiomethaneAnnexPdf(currentTradeAssessment);
      downloadDealFile(`EFET_Annex_${selectedMarket.id}_${origin}.pdf`, pdf.output('blob'), 'application/pdf');
      showToast('EFET Annex PDF downloaded');
    } catch (e) {
      showToast('Failed to generate EFET PDF');
    }
  };

  const handleExportTermSheetPdf = () => {
    try {
      const pdf = generateCommercialTermSheetPdf(currentTradeAssessment);
      downloadDealFile(`TermSheet_${selectedMarket.id}_${origin}.pdf`, pdf.output('blob'), 'application/pdf');
      showToast('Commercial Term Sheet PDF downloaded');
    } catch (e) {
      showToast('Failed to generate Term Sheet PDF');
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        minHeight: 0,
        flex: 1,
      }}
    >
      {/* ─── Column 1: Consignment ─── */}
      <div style={{ borderRight: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '13px 18px',
            borderBottom: '2px solid var(--color-divider)',
          }}
        >
          <span
            className="num"
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            1
          </span>
          <h4 style={{ margin: 0, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Consignment
          </h4>
        </div>

        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '18px' }} className="noscroll">
          {/* Physical Asset Sourcing Banner if passed from Sourcing */}
          {deal.plantName && (
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                borderLeft: '4px solid var(--color-accent)',
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '15px' }}>{currentOriginObj.flag}</span>
                  <strong style={{ fontSize: '13px' }}>{deal.plantName}</strong>
                </div>
                <span className="chip" style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'var(--color-status-pos-bg)', color: 'var(--color-status-pos-text)', border: '1px solid var(--color-status-pos-border)' }}>
                  Audited Asset Locked
                </span>
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.4 }} className="mut">
                <div><strong>Operating Entity:</strong> {deal.legalEntityName || 'Operating Entity'}</div>
                <div><strong>Grid / TSO Injection:</strong> {deal.networkOperator || `${currentOriginObj.name} Gas Grid`}</div>
                {deal.plantAnnualGWh && (
                  <div><strong>Facility Capacity:</strong> {deal.plantAnnualGWh} GWh/y ({deal.plantCapacityNm3h ? `${deal.plantCapacityNm3h} Nm³/h` : 'Standard'})</div>
                )}
                {deal.contactEmail && (
                  <div><strong>Desk Contact:</strong> {deal.contactEmail} {deal.contactPhone ? `· ${deal.contactPhone}` : ''}</div>
                )}
              </div>
            </div>
          )}

          {/* Origin */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="eyebrow">Origin ({ORIGINS.length} European Jurisdictions)</div>
              <span style={{ fontSize: '11px', color: 'var(--color-muted)' }}>
                {currentOriginObj.flag} {currentOriginObj.name} ({currentOriginObj.code})
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' }}>
              {ORIGINS.map(o => (
                <button
                  key={o.code}
                  type="button"
                  title={`${o.name} (${o.code})${o.isolated ? ' · Non-EU/Isolated' : ' · EU-Interconnected'}`}
                  className={`chip ${o.code === origin ? 'chip-a' : ''} ${o.isolated ? 'dim' : ''}`}
                  onClick={() => setOrigin(o.code)}
                >
                  <span style={{ marginRight: '3px', fontSize: '11px' }}>{o.flag}</span>
                  {o.code}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '8px 0 0' }} className="mut">
              {currentOriginObj.desc}
            </p>
          </div>

          {/* Feedstock */}
          <div>
            <div className="eyebrow">Feedstock</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' }}>
              {FEEDSTOCKS.map(f => (
                <button
                  key={f.key}
                  type="button"
                  className={`chip ${f.key === feedstockKey ? 'chip-a' : ''}`}
                  onClick={() => {
                    setFeedstockKey(f.key);
                    setCi(f.defaultCI);
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '8px 0 0' }} className="mut">
              {currentFeedstockObj.hint}
            </p>
          </div>

          {/* Scheme */}
          <div>
            <div className="eyebrow">Certification scheme</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' }}>
              {SCHEMES.map(s => (
                <button
                  key={s.scheme}
                  type="button"
                  className={`chip ${s.scheme === scheme ? 'chip-a' : ''}`}
                  onClick={() => setScheme(s.scheme)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '8px 0 0' }} className="mut">
              {currentSchemeObj.hint}
            </p>
          </div>

          {/* Chain of Custody */}
          <div>
            <div className="eyebrow">Chain of custody</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '7px' }}>
              {CUSTODIES.map(c => (
                <button
                  key={c.custody}
                  type="button"
                  className={`chip ${c.custody === chainOfCustody ? 'chip-a' : ''}`}
                  onClick={() => setChainOfCustody(c.custody)}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '8px 0 0' }} className="mut">
              {currentCustodyObj.hint}
            </p>
          </div>

          {/* Carbon Intensity & Slider */}
          <div style={{ paddingTop: '16px', borderTop: '2px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="eyebrow" style={{ margin: 0 }}>Carbon intensity</span>
                <div style={{ display: 'flex', gap: '2px' }}>
                  {(['conservative', 'base', 'optimistic'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      className={`chip ${ciTier === t ? 'chip-a' : ''}`}
                      style={{ fontSize: '9px', padding: '1px 5px', textTransform: 'capitalize' }}
                      onClick={() => {
                        setCiTier(t);
                        const benchmark = getCountryFeedstockCI(origin, feedstockKey, t);
                        setCi(benchmark.ci);
                      }}
                      title={`Set ${t} ISCC benchmark CI for ${origin} ${feedstockKey}`}
                    >
                      {t.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
              <span className="num" style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, fontSize: '22px' }}>
                {ci >= 0 ? `+${ci}` : `−${Math.abs(ci)}`}
              </span>
            </div>
            <div style={{ height: '3px', backgroundColor: 'var(--color-neutral-300)', margin: '12px 0 0', position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: '0 auto 0 0',
                  width: `${Math.max(0, Math.min(100, ((ci + 150) / 200) * 100))}%`,
                  backgroundColor: 'var(--color-text)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: `${Math.max(0, Math.min(100, ((ci + 150) / 200) * 100))}%`,
                  width: '11px',
                  height: '11px',
                  backgroundColor: 'var(--color-accent)',
                  marginLeft: '-5px',
                }}
              />
            </div>
            <input
              type="range"
              min="-150"
              max="50"
              step="1"
              value={ci}
              onChange={e => setCi(Number(e.target.value))}
              style={{ width: '100%', opacity: 0, height: '16px', marginTop: '-14px', cursor: 'pointer' }}
              aria-label="Adjust carbon intensity"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '6px' }} className="dim">
              <span>−150</span>
              <span>0</span>
              <span>+50</span>
            </div>
            <div className="kv" style={{ marginTop: '12px' }}>
              <span className="lbl">GHG saving vs 94.0 baseline</span>
              <span />
              <span className="num" style={{ fontSize: '15px', fontWeight: 800 }}>
                {ghgSavingPct}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Column 2: Destination & Legal Validation ─── */}
      <div style={{ borderRight: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '13px 18px',
            borderBottom: '2px solid var(--color-divider)',
          }}
        >
          <span
            className="num"
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            2
          </span>
          <h4 style={{ margin: 0, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Destination &amp; legal validation
          </h4>
        </div>

        <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-divider)' }}>
          <div className="eyebrow">Target market</div>
          <p style={{ fontSize: '12px', lineHeight: 1.5, margin: '6px 0 8px' }} className="mut">
            16 compliance mechanisms across 15 jurisdictions — France runs two in parallel.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {MARKETS.filter(m => m.status === 'ACTIVE').map(m => (
              <button
                key={m.id}
                type="button"
                className={`chip ${m.id === marketId ? 'chip-a' : ''}`}
                onClick={() => setMarketId(m.id)}
              >
                {m.shortName}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--color-divider)' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <h5 style={{ margin: 0, fontSize: '17px' }}>{selectedMarket.name}</h5>
            <span className={`chip ${assessment.overallVerdict === 'HARD_BLOCK' ? 'chip-a' : ''}`}>
              {assessment.overallVerdict === 'ELIGIBLE'
                ? 'Eligible'
                : assessment.overallVerdict === 'CONDITIONAL'
                ? 'Conditional'
                : assessment.overallVerdict === 'UNRESOLVED'
                ? 'Unresolved · Dual Branch'
                : 'Blocked'}
            </span>
          </div>
          <div style={{ fontSize: '11px', marginTop: '3px' }} className="mut">
            {selectedMarket.legalBasis} · {selectedMarket.registry || 'Statutory registry'}
          </div>
        </div>

        <div style={{ padding: '6px 18px 18px' }} className="noscroll">
          <div className="eyebrow" style={{ margin: '10px 0 4px' }}>
            Six-gate audit · {assessment.gates.filter(g => g.verdict === 'PASS').length} of 6 clear
          </div>
          {assessment.gates.map((g, gIdx) => {
            const isPass = g.verdict === 'PASS';
            const isBlock = g.verdict === 'HARD_BLOCK';
            const isUnresolved = g.verdict === 'UNRESOLVED';
            return (
              <div key={gIdx} style={{ padding: '9px 0', borderBottom: '1px solid var(--color-divider)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600 }}>{g.gateLabel}</span>
                  <span className={`chip ${isBlock ? 'chip-a' : ''}`}>
                    {isPass
                      ? (gIdx === 3 ? 'Pass · IX-A' : gIdx === 4 ? `Pass · ${ghgSavingPct}%` : 'Pass')
                      : isBlock
                      ? 'Blocked'
                      : isUnresolved
                      ? 'Unresolved · Dual Branch'
                      : 'Conditional'}
                  </span>
                </div>
                <div style={{ fontSize: '12px', lineHeight: 1.5, marginTop: '3px' }} className="mut">
                  {g.reason}
                </div>
                <div style={{ fontSize: '11px', marginTop: '3px', color: 'var(--color-accent-700)' }}>
                  {g.citations[0]?.shortName || g.citations[0]?.fullReference || 'RED III Statutory Directive'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Column 3: Netback & Dossier ─── */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '13px 18px',
            borderBottom: '2px solid var(--color-divider)',
          }}
        >
          <span
            className="num"
            style={{
              width: '20px',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontSize: '11px',
              fontWeight: 800,
            }}
          >
            3
          </span>
          <h4 style={{ margin: 0, fontSize: '15px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Netback &amp; dossier
          </h4>
        </div>

        {/* Hero Figure */}
        <div style={{ padding: '18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div className="eyebrow">Net netback</div>
          <div
            className="num"
            style={{
              fontFamily: 'var(--font-heading)',
              fontWeight: 800,
              fontSize: '52px',
              lineHeight: 1,
              letterSpacing: '-0.035em',
              margin: '6px 0 4px',
            }}
          >
            {netNetbackVal >= 0 ? `+€${netNetbackVal.toFixed(2)}` : `−€${Math.abs(netNetbackVal).toFixed(2)}`}
          </div>
          <div style={{ fontSize: '12px' }} className="mut">
            per MWh · {currentSide} · {selectedMarket.unitLabel} unit of account · all-in €156.40
          </div>
        </div>

        {/* Waterfall */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--color-divider)' }}>
          <div className="eyebrow" style={{ marginBottom: '10px' }}>Waterfall</div>
          {waterfallRows.map((w, wIdx) => {
            const barPct = Math.min(100, (w.num / waterfallMax) * 100);
            return (
              <div
                key={wIdx}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '132px minmax(0, 1fr) 78px',
                  gap: '10px',
                  alignItems: 'center',
                  padding: '5px 0',
                }}
              >
                <span style={{ fontSize: '12px' }} className="mut">{w.label}</span>
                <div style={{ position: 'relative', height: '14px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                  <div
                    style={{
                      position: 'absolute',
                      top: '2px',
                      bottom: '2px',
                      left: 0,
                      width: `${barPct}%`,
                      backgroundColor: w.kind === 'sub'
                        ? 'var(--color-neutral-400)'
                        : w.kind === 'net'
                        ? 'var(--color-accent)'
                        : 'var(--color-text)',
                    }}
                  />
                </div>
                <span className="num" style={{ textAlign: 'right', fontSize: '12px', fontWeight: 600 }}>
                  {w.val}
                </span>
              </div>
            );
          })}
        </div>

        {/* 2x2 Metric Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1px',
            backgroundColor: 'var(--color-divider)',
            borderBottom: '1px solid var(--color-divider)',
          }}
        >
          <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
            <div className="eyebrow">Volume</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>{volumeMwh.toLocaleString()} MWh</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
            <div className="eyebrow">Gross value</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>€{grossTotal.toLocaleString()}</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
            <div className="eyebrow">Desk margin</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800 }}>€{deskMarginEurMwh} / MWh</div>
          </div>
          <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
            <div className="eyebrow">Annual P&amp;L</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: 'var(--color-accent-700)' }}>
              €{annualPnl.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Principal Trader Risk Suite */}
        {netback.principalRisk && (
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
            <div className="eyebrow" style={{ color: 'var(--color-accent-600)', marginBottom: '8px' }}>
              Principal Trader Risk Suite
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
              {/* Basis Risk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mut">Hub Basis Spread ({origin} ➔ {selectedMarket.country}):</span>
                <span className="num" style={{ fontWeight: 700 }}>
                  {netback.principalRisk.basisDifferentialEurMwh >= 0 ? `+€${netback.principalRisk.basisDifferentialEurMwh.toFixed(2)}` : `−€${Math.abs(netback.principalRisk.basisDifferentialEurMwh).toFixed(2)}`}/MWh 
                  <span style={{ fontSize: '11px', color: 'var(--color-dim)', marginLeft: '4px' }}>
                    (€{netback.principalRisk.basisRiskNotionalEur.toLocaleString()})
                  </span>
                </span>
              </div>

              {/* Statutory Replacement Risk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mut">Delivery Default Replacement Exposure:</span>
                <span className="num" style={{ fontWeight: 700, color: '#dc2626' }}>
                  €{netback.principalRisk.replacementCostExposureEur.toLocaleString()} at risk
                </span>
              </div>

              {/* German 2026 Cliff Impact (if applicable) */}
              {netback.principalRisk.germanCliffImpactEurMwh !== null && netback.principalRisk.germanCliffImpactEurMwh !== undefined && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.06)', padding: '6px 8px', borderRadius: '4px' }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>German 2026 Double-Counting Cliff:</span>
                  <span className="num" style={{ fontWeight: 800, color: '#dc2626' }}>
                    −€{netback.principalRisk.germanCliffImpactEurMwh.toFixed(2)}/MWh (−€{netback.principalRisk.germanCliffNotionalEur?.toLocaleString()})
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ marginTop: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--color-divider)' }}>
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ marginTop: 0, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '13px' }}
            onClick={handleSaveDossier}
            title="Saves this trade assessment with full RED III six-gate statutory citations to your persistent Dossier Library"
          >
            <span>📁</span>
            <span>Save Dossier with Statutory Citations</span>
          </button>
          
          {/* Complete 4-Piece Deal Package In-Browser Review */}
          <button
            type="button"
            className="btn btn-primary btn-block"
            style={{ 
              marginTop: 0, 
              padding: '11px 14px', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '2px', 
              fontSize: '12px',
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
              fontWeight: 800,
            }}
            onClick={() => handleOpenDocReview('TERM_SHEET')}
            title="Review and inspect all 4 deal documents (Term Sheet, EFET Annex, ETRM CSV, UDB XML) in-browser before downloading"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📦</span>
              <span>Review Deal Package (4 Documents)</span>
            </div>
            <span style={{ fontSize: '10px', opacity: 0.9, fontWeight: 500 }}>
              Term Sheet · EFET Annex · ETRM CSV · UDB XML
            </span>
          </button>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('TERM_SHEET')}
              title="Review the Commercial Counterparty Term Sheet PDF"
            >
              <span>📄</span>
              <span>Review Term Sheet</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('EFET_ANNEX')}
              title="Review the EFET Biomethane Annex PDF"
            >
              <span>⚖️</span>
              <span>Review EFET Annex</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('ETRM_TICKET')}
              title="Review ETRM CSV Deal Ticket & JSON fields"
            >
              <span>💾</span>
              <span>ETRM Deal Ticket</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', fontWeight: 600 }}
              onClick={() => handleOpenDocReview('UDB_XML')}
              title="Review Union Database (UDB) Mass Balance Nomination XML"
            >
              <span>🌐</span>
              <span>UDB XML Nomination</span>
            </button>
          </div>

          <button
            type="button"
            className="btn btn-secondary btn-block"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px' }}
            onClick={() => setIsLogisticsOpen(true)}
            title="Opens interactive TSO pipeline routing, transit tariff breakdown, and UDB mass-balance transfer protocol"
          >
            <span>🗺️</span>
            <span>View TSO Pipeline Logistics Route</span>
          </button>

          <div style={{ fontSize: '11px', textAlign: 'center', color: 'var(--color-dim)', marginTop: '2px' }}>
            Institutional audit trail · EFET 2026 Annex compliant · Dijkstra TSO pathing
          </div>
        </div>
      </div>

      {/* EFET Term Sheet & Legal Package Preview Modal */}
      <LegalPackageModal
        isOpen={isLegalPackageOpen}
        onClose={() => setIsLegalPackageOpen(false)}
        assessment={currentTradeAssessment}
        initialTab={legalPackageTab}
      />

      {/* Delivery Playbook Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={origin}
        targetCountry={selectedMarket.country}
      />
    </div>
  );
}
