import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById, isVoluntaryMarket } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS, getCountryFeedstockCI } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody, AnnexClassification, DeliveryProfile } from '../../domain/consignment/types';
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
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';

export function getVtpForMarket(marketCountry?: string): string {
  switch (marketCountry) {
    case 'DE': return 'THE (Trading Hub Europe)';
    case 'NL': return 'TTF (Title Transfer Facility)';
    case 'FR': return 'PEG (Point d\'Échange de Gaz)';
    case 'IT': return 'PSV (Punto di Scambio Virtuale)';
    case 'GB': return 'NBP (National Balancing Point)';
    case 'AT': return 'CEGH (Central European Gas Hub)';
    case 'DK': return 'ETF (Energinet Transfer Facility)';
    case 'ES': return 'PVB (Punto Virtual de Balance)';
    case 'BE': return 'ZTP (Zeebrugge Trading Point)';
    case 'PL': return 'GSA (TGE Gas Hub Poland)';
    default: return `${marketCountry || 'EU'}_VTP_TRANSMISSION`;
  }
}

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
  { key: 'agricultural_residues', label: 'Agricultural residues', defaultCI: 18, hint: 'Annex IX Part A. High-margin non-food residue with RED III compliance across all EU transport routes.' },
  { key: 'food_waste', label: 'Food waste', defaultCI: 20, hint: 'Annex IX Part A. Municipal or commercial source-separated organic waste.' },
  { key: 'sewage_sludge', label: 'Sewage sludge', defaultCI: 25, hint: 'Annex IX Part A. Wastewater treatment substrate.' },
  { key: 'energy_crops', label: 'Energy crops', defaultCI: 40, hint: 'Non-Annex IX. Excluded from RED III transport quota but eligible for voluntary GO and UK RGGO transfers.' },
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

/**
 * Per-origin statutory default market routing.
 * GEMINI.md invariant: UK→UK_RTFO, FR→FR_CPB, IT→IT_CIC, AT/DE/DK/NL→DE_THG
 */
export function getDefaultMarketForOrigin(originIso?: string): string {
  switch ((originIso || '').toUpperCase()) {
    case 'GB': return 'UK_RTFO';
    case 'FR': return 'FR_CPB';
    case 'IT': return 'IT_CIC';
    case 'AT':
    case 'DE':
    case 'DK':
    case 'NL':
    default:
      return 'DE_THG';
  }
}

export function TradeBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  const deal = useMemo(() => parseDealParams(searchParams), [searchParams]);
  const linkedPlant = useMemo(() => deal.plantId ? BIOMETHANE_PLANTS.find(p => p.id === deal.plantId) : null, [deal.plantId]);

  const [origin, setOrigin] = useState<string>(deal.originCountry || 'DK');
  const [feedstockKey, setFeedstockKey] = useState<string>(deal.feedstock || 'manure');
  const [scheme, setScheme] = useState<CertificationScheme>((deal.scheme as CertificationScheme) || 'ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>((deal.coc as ChainOfCustody) || 'MASS_BALANCE');
  const [ci, setCi] = useState<number>(deal.ci !== null && deal.ci !== undefined ? deal.ci : -100);
  const [ciTier, setCiTier] = useState<'optimistic' | 'base' | 'conservative'>('base');
  const [marketId, setMarketId] = useState<string>(
    deal.marketId || state.selectedMarketId || getDefaultMarketForOrigin(deal.originCountry)
  );
  const plantTotalMWh = (deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh)
    ? Math.round((deal.plantAnnualGWh || linkedPlant!.annualEnergyGWh!) * 1000)
    : null;
  const [volumeMwh, setVolumeMwh] = useState<number>(
    deal.volume || (plantTotalMWh || 10000)
  );
  const [plantCommittedMwh, setPlantCommittedMwh] = useState<number>(deal.plantCommittedVolume || 0);

  // Production & Delivery Schedule state
  const [complianceYear, setComplianceYear] = useState<number>(deal.complianceYear || 2026);
  const [vintagePreset, setVintagePreset] = useState<string>('CAL_YEAR');
  const [prodStartDate, setProdStartDate] = useState<string>(deal.productionStartDate || '2026-01-01');
  const [prodEndDate, setProdEndDate] = useState<string>(deal.productionEndDate || '2026-12-31');
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>(deal.deliveryStartDate || '2026-01-01');
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>(deal.deliveryEndDate || '2026-12-31');
  const [deliveryProfile, setDeliveryProfile] = useState<DeliveryProfile>(deal.deliveryProfile || 'FLAT_MONTHLY');

  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [isLegalPackageOpen, setIsLegalPackageOpen] = useState(false);
  const [legalPackageTab, setLegalPackageTab] = useState<DocumentTab>('TERM_SHEET');

  const handleOpenDocReview = (tab: DocumentTab) => {
    setLegalPackageTab(tab);
    setIsLegalPackageOpen(true);
  };

  // Sync with searchParams if they change
  useEffect(() => {
    if (deal.marketId) {
      setMarketId(deal.marketId);
    } else if (deal.originCountry) {
      // Apply statutory default routing when no explicit market was specified
      setMarketId(getDefaultMarketForOrigin(deal.originCountry));
    }
    if (deal.originCountry) setOrigin(deal.originCountry);
    if (deal.feedstock) setFeedstockKey(deal.feedstock);
    if (deal.ci !== null && deal.ci !== undefined) setCi(deal.ci);
    if (deal.volume) {
      setVolumeMwh(deal.volume);
    } else if (deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) {
      setVolumeMwh(Math.round((deal.plantAnnualGWh || linkedPlant!.annualEnergyGWh!) * 1000));
    }
    if (deal.scheme) setScheme(deal.scheme as CertificationScheme);
    if (deal.coc) setChainOfCustody(deal.coc as ChainOfCustody);
    if (deal.plantCommittedVolume !== undefined) setPlantCommittedMwh(deal.plantCommittedVolume);
    if (deal.complianceYear) setComplianceYear(deal.complianceYear);
    if (deal.productionStartDate) setProdStartDate(deal.productionStartDate);
    if (deal.productionEndDate) setProdEndDate(deal.productionEndDate);
    if (deal.deliveryStartDate) setDeliveryStartDate(deal.deliveryStartDate);
    if (deal.deliveryEndDate) setDeliveryEndDate(deal.deliveryEndDate);
    if (deal.deliveryProfile) setDeliveryProfile(deal.deliveryProfile);
  }, [deal, linkedPlant]);

  const selectedMarket = useMemo(() => getMarketById(marketId) || MARKETS[0], [marketId]);

  const handleVintagePreset = (preset: string) => {
    setVintagePreset(preset);
    const yr = complianceYear;
    if (preset === 'CAL_YEAR') {
      setProdStartDate(`${yr}-01-01`);
      setProdEndDate(`${yr}-12-31`);
      setDeliveryStartDate(`${yr}-01-01`);
      setDeliveryEndDate(`${yr}-12-31`);
    } else if (preset === 'Q1') {
      setProdStartDate(`${yr}-01-01`);
      setProdEndDate(`${yr}-03-31`);
      setDeliveryStartDate(`${yr}-01-01`);
      setDeliveryEndDate(`${yr}-03-31`);
    } else if (preset === 'Q2') {
      setProdStartDate(`${yr}-04-01`);
      setProdEndDate(`${yr}-06-30`);
      setDeliveryStartDate(`${yr}-04-01`);
      setDeliveryEndDate(`${yr}-06-30`);
    } else if (preset === 'Q3') {
      setProdStartDate(`${yr}-07-01`);
      setProdEndDate(`${yr}-09-30`);
      setDeliveryStartDate(`${yr}-07-01`);
      setDeliveryEndDate(`${yr}-09-30`);
    } else if (preset === 'Q4') {
      setProdStartDate(`${yr}-10-01`);
      setProdEndDate(`${yr}-12-31`);
      setDeliveryStartDate(`${yr}-10-01`);
      setDeliveryEndDate(`${yr}-12-31`);
    } else if (preset === 'PROMPT') {
      setProdStartDate(`${yr}-10-01`);
      setProdEndDate(`${yr}-10-31`);
      setDeliveryStartDate(`${yr}-10-01`);
      setDeliveryEndDate(`${yr}-10-31`);
    }
  };

  const handleComplianceYearChange = (newYear: number) => {
    setComplianceYear(newYear);
    setProdStartDate(`${newYear}-01-01`);
    setProdEndDate(`${newYear}-12-31`);
    setDeliveryStartDate(`${newYear}-01-01`);
    setDeliveryEndDate(`${newYear}-12-31`);
  };

  const statutorySurrenderDeadline = selectedMarket.country === 'GB'
    ? `${complianceYear + 1}-04-30`
    : `${complianceYear + 1}-02-28`;

  const monthlyRateMwh = Math.round(volumeMwh / 12);
  const dailyRateMwh = Number((volumeMwh / 365).toFixed(1));

  const availablePlantCapacity = plantTotalMWh !== null ? Math.max(0, plantTotalMWh - plantCommittedMwh) : null;
  const isOversubscribed = availablePlantCapacity !== null && volumeMwh > availablePlantCapacity;
  const plantCommittedPct = plantTotalMWh !== null && plantTotalMWh > 0 ? Math.min(100, Math.round(((volumeMwh + plantCommittedMwh) / plantTotalMWh) * 100)) : null;

  const consignment: Consignment = useMemo(() => {
    const originObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
    const feedObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
    const regFeedstock = FEEDSTOCK_REGISTRY[feedstockKey];
    const annexClass = (regFeedstock?.annexClassification || (feedstockKey === 'energy_crops' ? 'CROP' : 'IX_A')) as AnnexClassification;

    return {
      id: deal.plantId ? `CONSIGN-${deal.plantId}` : `CONSIGN-${origin}-${feedstockKey}`,
      name: deal.plantName ? `${deal.plantName} · ${originObj.name} ${feedObj.label}` : (linkedPlant ? `${linkedPlant.name} · ${originObj.name} ${feedObj.label}` : `${originObj.name} ${feedObj.label}`),
      originCountry: origin,
      originCountryName: originObj.name,
      originPlantId: deal.plantId || linkedPlant?.id,
      originPlantName: deal.plantName || linkedPlant?.name,
      feedstock: feedstockKey,
      feedstockName: feedObj.label,
      annexClassification: annexClass,
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
        type: vintagePreset === 'CUSTOM' ? 'CUSTOM' : vintagePreset.startsWith('Q') ? 'QUARTER' : 'CALENDAR',
        startDate: deliveryStartDate,
        endDate: deliveryEndDate,
        complianceYear,
        productionStartDate: prodStartDate,
        productionEndDate: prodEndDate,
        deliveryProfile,
        deliveryPointVtp: getVtpForMarket(selectedMarket.country),
        statutorySurrenderDeadline,
        plantTotalCapacityMWh: plantTotalMWh,
        plantCommittedVolumeMWh: plantCommittedMwh,
      },
      counterparty: deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || 'European Offtake Buyer',
    };
  }, [
    origin,
    feedstockKey,
    scheme,
    chainOfCustody,
    ci,
    volumeMwh,
    deliveryStartDate,
    deliveryEndDate,
    complianceYear,
    prodStartDate,
    prodEndDate,
    deliveryProfile,
    selectedMarket,
    statutorySurrenderDeadline,
    deal,
    linkedPlant,
    vintagePreset,
    plantTotalMWh,
    plantCommittedMwh,
  ]);

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

  // GHG savings % uses correct comparator per market sector:
  // Heat/Industrial (EU_ETS, DE_GO, NL_GO, FR_GO, VOL_SCOPE1) → 80 gCO₂e/MJ comparator (RED III Art. 29(10) heat)
  // Transport/Maritime/RTFO → 94 gCO₂e/MJ comparator (RED III Art. 29(10) transport)
  const ghgComparator = ['EU_ETS_INDUSTRIAL', 'DE_GO', 'NL_GO', 'FR_GO', 'VOL_SCOPE1', 'UK_RGGO'].includes(selectedMarket.id)
    ? 80.0
    : 94.0;
  const ghgSavingPct = Math.round(((ghgComparator - ci) / ghgComparator) * 100);
  const currentSide = state.marks.pricingSides?.certificateSide || 'mid';

  // Active hints
  const currentOriginObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
  const currentFeedstockObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
  const currentSchemeObj = SCHEMES.find(s => s.scheme === scheme) || SCHEMES[0];
  const currentCustodyObj = CUSTODIES.find(c => c.custody === chainOfCustody) || CUSTODIES[0];

  // Waterfall rows: Leg 1 value stack to Net Netback, then Producer Payable to Desk Margin
  const certVal = netback.certificateValue?.valueEurPerMWh ?? 0;
  const molVal = netback.moleculeValue ?? (state.marks.gasIndex.mid ?? 0);
  const transferCost = state.costs.transferCosts ?? 0;
  const certCost = state.costs.certificationCosts ?? 0;
  const transitCost = state.costs.logistics ?? 0;
  const otherCost = state.costs.otherCosts ?? 0;
  const netNetbackVal = netback.netNetback ?? 0;
  const producerPayable = netback.producerPayable;
  const deskMarginVal = netback.deskMargin;

  const vtpLabel = getVtpForMarket(selectedMarket.country);

  const waterfallMax = Math.max(
    certVal, 
    molVal, 
    Math.abs(netNetbackVal), 
    producerPayable ?? 0, 
    Math.abs(deskMarginVal ?? 0), 
    1
  );
  const waterfallRows = [
    { label: 'Certificate value', val: `+${certVal.toFixed(2)}`, num: certVal, kind: 'add' },
    { label: `Molecule value (${vtpLabel})`, val: `+${molVal.toFixed(2)}`, num: molVal, kind: 'add' },
    { label: 'Transfer & registry', val: `−${transferCost.toFixed(2)}`, num: transferCost, kind: 'sub' },
    { label: 'Certification', val: `−${certCost.toFixed(2)}`, num: certCost, kind: 'sub' },
    { label: `Transit ${origin} → ${selectedMarket.country}`, val: `−${transitCost.toFixed(2)}`, num: transitCost, kind: 'sub' },
    ...(otherCost > 0 ? [{ label: 'Other costs', val: `−${otherCost.toFixed(2)}`, num: otherCost, kind: 'sub' }] : []),
    { label: 'Net netback', val: `${netNetbackVal >= 0 ? '+' : '−'}${Math.abs(netNetbackVal).toFixed(2)}`, num: Math.abs(netNetbackVal), kind: 'net' },
    ...(producerPayable !== null ? [
      { label: 'Producer payable', val: `−${producerPayable.toFixed(2)}`, num: producerPayable, kind: 'sub' },
      { label: 'Desk margin', val: `${(deskMarginVal ?? 0) >= 0 ? '+' : '−'}${Math.abs(deskMarginVal ?? 0).toFixed(2)}`, num: Math.abs(deskMarginVal ?? 0), kind: 'margin' },
    ] : []),
  ];

  // Gross deal value = certificate value + molecule value (both legs)
  const grossTotal = Math.round((certVal + molVal) * volumeMwh);
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
          {(deal.plantName || linkedPlant) && (
            <div
              style={{
                padding: '12px',
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
                  <strong style={{ fontSize: '13px' }}>{deal.plantName || linkedPlant?.name}</strong>
                </div>
                <span className="chip" style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'var(--color-status-pos-bg)', color: 'var(--color-status-pos-text)', border: '1px solid var(--color-status-pos-border)' }}>
                  Audited Asset Locked
                </span>
              </div>
              <div style={{ fontSize: '11px', lineHeight: 1.4 }} className="mut">
                <div><strong>Operating Entity:</strong> {deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || 'Operating Entity'}</div>
                <div><strong>Grid / TSO Injection:</strong> {deal.networkOperator || linkedPlant?.networkOperator || `${currentOriginObj.name} Gas Grid`}</div>
                {(deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh) && (
                  <div>
                    <strong>Facility Capacity:</strong> {deal.plantAnnualGWh || linkedPlant?.annualEnergyGWh} GWh/y (
                    {deal.plantCapacityNm3h || linkedPlant?.capacityNm3h ? `${(deal.plantCapacityNm3h || linkedPlant?.capacityNm3h)?.toLocaleString()} Nm³/h` : 'Standard'}
                    )
                  </div>
                )}
                {linkedPlant?.upgradingTechnology && (
                  <div><strong>Upgrading Technology:</strong> {linkedPlant.upgradingTechnology}</div>
                )}
                {linkedPlant?.feedstockDetails && (
                  <div><strong>Feedstock Specification:</strong> {linkedPlant.feedstockDetails}</div>
                )}
                {(deal.contactEmail || linkedPlant?.contactEmail) && (
                  <div><strong>Desk Contact:</strong> {deal.contactEmail || linkedPlant?.contactEmail} {deal.contactPhone || linkedPlant?.contactPhone ? `· ${deal.contactPhone || linkedPlant?.contactPhone}` : ''}</div>
                )}
              </div>
            </div>
          )}

          {/* Volume & Capacity Tranche Allocation */}
          <div style={{ padding: '14px', backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderLeft: '4px solid var(--color-accent)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span className="eyebrow" style={{ margin: 0 }}>Contract Traded Volume</span>
              <span className="num" style={{ fontWeight: 800, fontSize: '15px' }}>{volumeMwh.toLocaleString()} MWh</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="number"
                min="100"
                step="500"
                className="input num"
                style={{ fontWeight: 700, fontSize: '14px', flex: 1 }}
                value={volumeMwh}
                onChange={e => setVolumeMwh(Math.max(0, Number(e.target.value) || 0))}
                aria-label="Contract Traded Volume in MWh"
              />
              <span className="mut" style={{ fontSize: '12px', fontWeight: 600 }}>MWh</span>
            </div>

            {/* Quick Tranche Selection */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
              <button
                type="button"
                className={`chip ${volumeMwh === 10000 ? 'chip-a' : ''}`}
                style={{ fontSize: '10px', padding: '2px 6px' }}
                onClick={() => setVolumeMwh(10000)}
              >
                10k MWh (Cargo)
              </button>
              {plantTotalMWh && (
                <>
                  <button
                    type="button"
                    className={`chip ${volumeMwh === Math.round(plantTotalMWh / 4) ? 'chip-a' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => setVolumeMwh(Math.round(plantTotalMWh / 4))}
                  >
                    25% ({Math.round(plantTotalMWh / 4).toLocaleString()} MWh)
                  </button>
                  <button
                    type="button"
                    className={`chip ${volumeMwh === Math.round(plantTotalMWh / 2) ? 'chip-a' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => setVolumeMwh(Math.round(plantTotalMWh / 2))}
                  >
                    50% ({Math.round(plantTotalMWh / 2).toLocaleString()} MWh)
                  </button>
                  <button
                    type="button"
                    className={`chip ${availablePlantCapacity !== null && volumeMwh === availablePlantCapacity ? 'chip-a' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => availablePlantCapacity && setVolumeMwh(availablePlantCapacity)}
                  >
                    100% Avail ({availablePlantCapacity?.toLocaleString()} MWh)
                  </button>
                </>
              )}
            </div>

            {/* Plant Capacity & Existing Commitment Tracking */}
            {plantTotalMWh && (
              <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed var(--color-divider)', fontSize: '11px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="mut">Facility Nameplate Capacity:</span>
                  <span className="num" style={{ fontWeight: 600 }}>{plantTotalMWh.toLocaleString()} MWh/yr</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span className="mut">Prior Committed / Sold Volume:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="number"
                      min="0"
                      max={plantTotalMWh}
                      step="1000"
                      className="input num"
                      style={{ height: '22px', width: '80px', fontSize: '11px', padding: '1px 4px', textAlign: 'right' }}
                      value={plantCommittedMwh}
                      onChange={e => setPlantCommittedMwh(Math.max(0, Number(e.target.value) || 0))}
                      aria-label="Prior committed volume in MWh"
                    />
                    <span className="dim">MWh</span>
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span className="mut">Uncommitted Available Capacity:</span>
                  <span className="num" style={{ fontWeight: 700, color: (availablePlantCapacity ?? 0) <= 0 ? '#ef4444' : 'var(--color-accent-700)' }}>
                    {availablePlantCapacity?.toLocaleString()} MWh
                  </span>
                </div>

                {/* Utilization Progress Bar */}
                <div style={{ position: 'relative', height: '6px', backgroundColor: 'var(--color-neutral-200)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(100, (plantCommittedMwh / plantTotalMWh) * 100)}%`,
                      backgroundColor: 'var(--color-neutral-500)',
                    }}
                    title={`Committed to others: ${plantCommittedMwh.toLocaleString()} MWh`}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: `${Math.min(100, (plantCommittedMwh / plantTotalMWh) * 100)}%`,
                      top: 0,
                      bottom: 0,
                      width: `${Math.min(100 - (plantCommittedMwh / plantTotalMWh) * 100, (volumeMwh / plantTotalMWh) * 100)}%`,
                      backgroundColor: isOversubscribed ? '#ef4444' : 'var(--color-accent)',
                    }}
                    title={`This trade: ${volumeMwh.toLocaleString()} MWh`}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginTop: '3px' }} className="dim">
                  <span>Allocation: {((volumeMwh / plantTotalMWh) * 100).toFixed(1)}% of plant</span>
                  <span>Total allocated: {plantCommittedPct}%</span>
                </div>

                {isOversubscribed && (
                  <div style={{ marginTop: '6px', padding: '6px 8px', backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#dc2626', fontWeight: 600, fontSize: '11px', lineHeight: 1.3 }}>
                    ⚠️ Oversubscription Warning: Contract volume ({volumeMwh.toLocaleString()} MWh) exceeds available plant capacity ({availablePlantCapacity?.toLocaleString()} MWh) by {(volumeMwh - (availablePlantCapacity ?? 0)).toLocaleString()} MWh. Risk of physical delivery default.
                  </div>
                )}
              </div>
            )}
          </div>

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
                {deal.ciIsEstimated || (linkedPlant && linkedPlant.verifiedCarbonIntensity == null) ? (
                  <span className="chip" style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'rgba(234, 179, 8, 0.15)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.3)' }} title="Estimated default CI from substrate mix — unverified by audited PoS">
                    Estimated CI
                  </span>
                ) : (linkedPlant?.verifiedCarbonIntensity != null ? (
                  <span className="chip" style={{ fontSize: '9px', fontWeight: 700, backgroundColor: 'var(--color-status-pos-bg)', color: 'var(--color-status-pos-text)', border: '1px solid var(--color-status-pos-border)' }} title="Audited PoS verified CI">
                    Verified CI
                  </span>
                ) : null)}
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

          {/* Production Period (Vintage) & Delivery Schedule */}
          <div style={{ paddingTop: '16px', borderTop: '2px solid var(--color-divider)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="eyebrow" style={{ margin: 0 }}>Production &amp; Delivery Schedule</div>
              <span className="chip chip-a" style={{ fontSize: '10px' }}>
                EFET Biomethane Schedule
              </span>
            </div>

            {/* Compliance Year */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 600 }}>Compliance Year</span>
              <div style={{ display: 'flex', gap: '3px' }}>
                {[2025, 2026, 2027].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    className={`chip ${complianceYear === yr ? 'chip-a' : ''}`}
                    style={{ fontSize: '11px', padding: '2px 8px' }}
                    onClick={() => handleComplianceYearChange(yr)}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>

            {/* Production Period Presets */}
            <div style={{ marginBottom: '8px' }}>
              <span style={{ fontSize: '11px' }} className="mut">Production Vintage (Gas Grid Injection)</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '4px' }}>
                {[
                  { key: 'CAL_YEAR', label: `Cal-${complianceYear}` },
                  { key: 'Q1', label: `Q1-${complianceYear}` },
                  { key: 'Q2', label: `Q2-${complianceYear}` },
                  { key: 'Q3', label: `Q3-${complianceYear}` },
                  { key: 'Q4', label: `Q4-${complianceYear}` },
                  { key: 'PROMPT', label: 'Prompt Month' },
                  { key: 'CUSTOM', label: 'Custom' },
                ].map(p => (
                  <button
                    key={p.key}
                    type="button"
                    className={`chip ${vintagePreset === p.key ? 'chip-a' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => handleVintagePreset(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Date Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
              <div>
                <label className="dim" style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Injection Start</label>
                <input
                  type="date"
                  className="input"
                  style={{ fontSize: '11px', padding: '3px 6px', width: '100%' }}
                  value={prodStartDate}
                  onChange={e => {
                    setProdStartDate(e.target.value);
                    setVintagePreset('CUSTOM');
                  }}
                  aria-label="Biomethane injection start date"
                />
              </div>
              <div>
                <label className="dim" style={{ fontSize: '10px', display: 'block', marginBottom: '2px' }}>Injection End</label>
                <input
                  type="date"
                  className="input"
                  style={{ fontSize: '11px', padding: '3px 6px', width: '100%' }}
                  value={prodEndDate}
                  onChange={e => {
                    setProdEndDate(e.target.value);
                    setVintagePreset('CUSTOM');
                  }}
                  aria-label="Biomethane injection end date"
                />
              </div>
            </div>

            {/* Delivery Profile & Flow Rate */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '11px' }} className="mut">Physical Delivery Profile</span>
                <span className="num" style={{ fontSize: '11px', fontWeight: 600 }}>
                  {deliveryProfile === 'FLAT_MONTHLY' ? `~${monthlyRateMwh.toLocaleString()} MWh/mo` : deliveryProfile === 'FLAT_DAILY' ? `~${dailyRateMwh.toLocaleString()} MWh/day` : '100% Bullet Transfer'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {[
                  { key: 'FLAT_MONTHLY', label: 'Flat Monthly' },
                  { key: 'FLAT_DAILY', label: 'Flat Daily' },
                  { key: 'BULLET', label: 'Bullet Transfer' },
                ].map(prof => (
                  <button
                    key={prof.key}
                    type="button"
                    className={`chip ${deliveryProfile === prof.key ? 'chip-a' : ''}`}
                    style={{ fontSize: '10px', padding: '2px 6px' }}
                    onClick={() => setDeliveryProfile(prof.key as DeliveryProfile)}
                  >
                    {prof.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Point & Statutory Deadline Card */}
            <div style={{ padding: '8px 10px', backgroundColor: 'var(--color-panel-header)', border: '1px solid var(--color-divider)', fontSize: '11px', lineHeight: 1.4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span className="mut">Grid Delivery Point (VTP):</span>
                <strong style={{ color: 'var(--color-text)' }}>{getVtpForMarket(selectedMarket.country)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                <span className="mut">Registry Surrender Deadline:</span>
                <strong style={{ color: 'var(--color-accent-700)' }}>{statutorySurrenderDeadline}</strong>
              </div>
              <div className="dim" style={{ fontSize: '10px', marginTop: '4px' }}>
                UDB Mass Balance Rule: Certificates must be balanced and surrendered within 12 months of injection month end (RED III Art. 30).
              </div>
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

          {isVoluntaryMarket(selectedMarket.id) && (
            <div
              style={{
                marginTop: '8px',
                padding: '8px 10px',
                backgroundColor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '3px',
                fontSize: '11px',
                lineHeight: 1.4,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700, color: '#1d4ed8', marginBottom: '2px' }}>
                <span>📦 UNBUNDLED BOOK-AND-CLAIM TRADE</span>
              </div>
              <div style={{ color: 'var(--color-text)' }}>
                Single-leg Guarantee of Origin (GoO) transfer. <strong>No physical gas delivery to counterparty</strong>. Biomethane molecules remain in {origin} domestic grid; buyer acquires environmental attributes only.
              </div>
            </div>
          )}
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
            per MWh · {currentSide} · {selectedMarket.unitLabel} unit of account
          </div>
          {netback.clearingPriceWarning && (
            <div style={{ marginTop: '8px', padding: '6px 10px', backgroundColor: 'color-mix(in srgb, var(--color-amber-500) 15%, transparent)', border: '1px solid var(--color-amber-500)', fontSize: '11px', color: 'var(--color-amber-400)', lineHeight: 1.4 }}>
              ⚠️ {netback.clearingPriceWarning}
            </div>
          )}
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
                        : w.kind === 'margin'
                        ? '#10b981'
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
            <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: (netback.deskMargin ?? 0) < 0 ? '#ef4444' : 'inherit' }}>
              {netback.deskMargin !== null ? `€${deskMarginEurMwh} / MWh` : '— (Unset)'}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 18px' }}>
            <div className="eyebrow">Annual P&amp;L</div>
            <div className="num" style={{ fontSize: '19px', fontWeight: 800, color: (netback.deskMargin ?? 0) < 0 ? '#ef4444' : 'var(--color-accent-700)' }}>
              {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
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
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}
                onClick={() => handleOpenDocReview('TERM_SHEET')}
                title="Review the Commercial Counterparty Term Sheet PDF"
              >
                <span>📄</span>
                <span>Term Sheet</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 8px', fontSize: '11px' }}
                onClick={handleExportTermSheetPdf}
                title="1-Click Instant Download Commercial Term Sheet PDF"
              >
                📥
              </button>
            </div>

            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, padding: '8px 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px', fontSize: '11px', fontWeight: 600 }}
                onClick={() => handleOpenDocReview('EFET_ANNEX')}
                title="Review the EFET Biomethane Annex PDF"
              >
                <span>⚖️</span>
                <span>EFET Annex</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '8px 8px', fontSize: '11px' }}
                onClick={handleExportPdf}
                title="1-Click Instant Download EFET Biomethane Annex PDF"
              >
                📥
              </button>
            </div>
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
