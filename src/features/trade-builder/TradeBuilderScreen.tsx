import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY, REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment, CertificationScheme, ChainOfCustody, AnnexClassification, UDBStatus } from '../../domain/consignment/types';
import { Market, PriceSide } from '../../domain/markets/types';
import { PRODUCING_ORIGINS, getRouteTransitTariff } from '../../domain/arbitrage/origins';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback, computeAllNetbacks } from '../../domain/netback/engine';
import { TradeAssessment } from '../../domain/trade/types';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { DeliveryMode } from '../../domain/logistics/types';
import { parseDealParams } from '../../domain/trade/dealParams';

function getVerdictTone(verdict: string) {
  switch (verdict) {
    case 'PASS':
    case 'ELIGIBLE':
      return {
        text: 'text-emerald-400',
        bg: 'bg-emerald-950',
        border: 'border-emerald-800',
        dot: 'bg-emerald-500',
        badge: 'text-emerald-400 bg-emerald-950 border-emerald-800',
        bar: 'bg-emerald-500',
      };
    case 'CONDITIONAL':
      return {
        text: 'text-amber-400',
        bg: 'bg-amber-950',
        border: 'border-amber-800',
        dot: 'bg-amber-500',
        badge: 'text-amber-400 bg-amber-950 border-amber-800',
        bar: 'bg-amber-500',
      };
    case 'UNRESOLVED':
      return {
        text: 'text-sky-400',
        bg: 'bg-sky-950',
        border: 'border-sky-800',
        dot: 'bg-sky-500',
        badge: 'text-sky-400 bg-sky-950 border-sky-800',
        bar: 'bg-sky-500',
      };
    case 'HARD_BLOCK':
    case 'FAIL':
    default:
      return {
        text: 'text-red-400',
        bg: 'bg-red-950',
        border: 'border-red-800',
        dot: 'bg-red-500',
        badge: 'text-red-400 bg-red-950 border-red-800',
        bar: 'bg-red-800',
      };
  }
}

interface DealPreset {
  label: string;
  origin: string;
  feedstock: string;
  ci: number;
  marketId: string;
  volume: number;
  counterparty: string;
}

const DEAL_PRESETS: DealPreset[] = [
  {
    label: 'DK Manure ➔ DE THG (120 GWh)',
    origin: 'DK',
    feedstock: 'manure',
    ci: -100,
    marketId: 'DE_THG',
    volume: 120000,
    counterparty: 'Shell Energy Europe',
  },
  {
    label: 'DK Manure ➔ NL ERE (80 GWh)',
    origin: 'DK',
    feedstock: 'manure',
    ci: -100,
    marketId: 'NL_ERE',
    volume: 80000,
    counterparty: 'TotalEnergies Gas & Power',
  },
  {
    label: 'ES Slurry ➔ FR CPB (40 GWh)',
    origin: 'ES',
    feedstock: 'manure',
    ci: -80,
    marketId: 'FR_CPB',
    volume: 40000,
    counterparty: 'ENGIE Global Markets',
  },
  {
    label: 'SE Waste ➔ FuelEU (60 GWh)',
    origin: 'SE',
    feedstock: 'food_waste',
    ci: -25,
    marketId: 'FUELEU',
    volume: 60000,
    counterparty: 'Vitol Biogas Bunkering',
  },
];

export function TradeBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  // Everything the calling screen told us about this deal, read through the one
  // shared contract (domain/trade/dealParams). Absent keys are absent rather than
  // empty strings, so the fallbacks below fire only when nothing was passed.
  const deal = useMemo(() => parseDealParams(searchParams), [searchParams]);

  const initialFeedstock = deal.feedstock && FEEDSTOCK_REGISTRY[deal.feedstock] ? deal.feedstock : 'manure';
  const initialCI = deal.ci ?? FEEDSTOCK_REGISTRY[initialFeedstock]?.defaultCI ?? -100;

  // Step 1: Consignment & Deal Parameters
  const [originCountry, setOriginCountry] = useState<string>(deal.originCountry || 'DK');
  const [selectedMarketId, setSelectedMarketId] = useState<string>(deal.marketId || state.selectedMarketId || 'DE_THG');
  const [feedstockKey, setFeedstockKey] = useState<string>(initialFeedstock);
  const [ciOverride, setCiOverride] = useState<number>(initialCI);
  const [scheme, setScheme] = useState<CertificationScheme>(deal.scheme || 'ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>(deal.coc || 'MASS_BALANCE');
  const [annualVolumeMWh, setAnnualVolumeMWh] = useState<number>(deal.volume ?? 120000);
  const [deliveryPeriodLabel, setDeliveryPeriodLabel] = useState<string>(deal.deliveryPeriod || 'Cal-2026');
  const [complianceYear, setComplianceYear] = useState<number>(2026);
  const [counterparty, setCounterparty] = useState<string>(deal.counterparty || 'Shell Energy Europe');
  const [udbRecorded, setUdbRecorded] = useState<UDBStatus>('RECORDED');

  // Step 2: What-If Regulatory Policy Switches
  const [germanMultiplierBranch, setGermanMultiplierBranch] = useState<'BRANCH_2X' | 'BRANCH_1X'>('BRANCH_2X');

  // Step 3: Commercial Cost Overrides & Delivery Mode
  // Seeded from desk state only. An unentered cost stays unentered — it must not
  // acquire a plausible-looking default on its way into computeNetback.
  const [procurementCostOverride, setProcurementCostOverride] = useState<number | null>(
    state.costs.producerPricing?.fixedPriceEurPerMwh ?? null
  );
  const [transferCostOverride, setTransferCostOverride] = useState<number | null>(state.costs.transferCosts);
  const [certCostOverride, setCertCostOverride] = useState<number | null>(state.costs.certificationCosts);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>('VIRTUAL_SWAP');

  // UI Modals
  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [isDealTicketOpen, setIsDealTicketOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Re-apply when the link changes while the builder is already mounted — arriving
  // from the scanner and then from the library must not leave stale fields behind.
  //
  // marketId, originCountry and feedstock are validated against their registries
  // here rather than in the parser: an unknown value means the caller referenced
  // something this build does not have, and the right response is to keep the
  // current selection visible, not to blank the deal out.
  useEffect(() => {
    if (deal.marketId && MARKETS.some(m => m.id === deal.marketId)) setSelectedMarketId(deal.marketId);
    if (deal.originCountry && PRODUCING_ORIGINS[deal.originCountry]) setOriginCountry(deal.originCountry);
    if (deal.feedstock && FEEDSTOCK_REGISTRY[deal.feedstock]) {
      setFeedstockKey(deal.feedstock);
      // A feedstock with no explicit CI falls back to that feedstock's default,
      // otherwise the previous consignment's CI would silently price this one.
      if (deal.ci === undefined) setCiOverride(FEEDSTOCK_REGISTRY[deal.feedstock].defaultCI);
    }
    if (deal.ci !== undefined) setCiOverride(deal.ci);
    if (deal.volume !== undefined) setAnnualVolumeMWh(deal.volume);
    if (deal.scheme) setScheme(deal.scheme);
    if (deal.coc) setChainOfCustody(deal.coc);
    if (deal.counterparty) setCounterparty(deal.counterparty);
    if (deal.deliveryPeriod) setDeliveryPeriodLabel(deal.deliveryPeriod);
  }, [deal]);

  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  const selectedMarket: Market = useMemo(() => {
    return getMarketById(selectedMarketId) || activeMarkets[0];
  }, [selectedMarketId, activeMarkets]);

  const feedstockInfo = useMemo(() => {
    return FEEDSTOCK_REGISTRY[feedstockKey] || FEEDSTOCK_REGISTRY['manure'];
  }, [feedstockKey]);

  const handleApplyPreset = (preset: DealPreset) => {
    setOriginCountry(preset.origin);
    setFeedstockKey(preset.feedstock);
    setCiOverride(preset.ci);
    setSelectedMarketId(preset.marketId);
    setAnnualVolumeMWh(preset.volume);
    setCounterparty(preset.counterparty);
  };

  const handleFeedstockSelect = (key: string) => {
    setFeedstockKey(key);
    const info = FEEDSTOCK_REGISTRY[key];
    if (info) {
      setCiOverride(info.defaultCI);
    }
  };

  // Build structured consignment
  const consignment: Consignment = useMemo(() => ({
    id: `consignment-${originCountry}-${feedstockKey}`,
    name: `${PRODUCING_ORIGINS[originCountry]?.countryName || originCountry} ${feedstockInfo.name}`,
    originCountry,
    originCountryName: PRODUCING_ORIGINS[originCountry]?.countryName || originCountry,
    feedstock: feedstockKey,
    feedstockName: feedstockInfo.name,
    annexClassification: feedstockInfo.annexClassification as AnnexClassification,
    certificationScheme: scheme,
    chainOfCustody,
    carbonIntensity: ciOverride,
    commissioningDateRange: 'POST_2021_TO_2025',
    injectionCountry: originCountry,
    injectionIsEU: true,
    udbStatus: udbRecorded,
    posStatus: 'ISSUED',
    volumeMWh: annualVolumeMWh,
    deliveryPeriod: {
      type: 'CALENDAR',
      startDate: `${complianceYear}-01-01`,
      endDate: `${complianceYear}-12-31`,
      complianceYear,
    },
    counterparty,
  }), [originCountry, feedstockKey, feedstockInfo, scheme, chainOfCustody, ciOverride, annualVolumeMWh, complianceYear, udbRecorded, counterparty]);

  // Eligibility Evaluation
  const eligibility = useMemo(() => {
    return evaluateEligibility(consignment, selectedMarket);
  }, [consignment, selectedMarket]);

  // Logistics & Delivery Mode Route Assessment
  const logistics = useMemo(() => {
    return calculateLogisticsRoute(originCountry, selectedMarket.country, state.marks.gasIndex.mid);
  }, [originCountry, selectedMarket.country, state.marks.gasIndex.mid]);

  // Dynamic Transit Tariff based on selected delivery mode
  const transitCost = useMemo(() => {
    if (deliveryMode === 'PHYSICAL_PIPELINE') {
      return logistics.modes.physicalPipeline.totalCostEurMwh ?? getRouteTransitTariff(originCountry, selectedMarket.country);
    }
    if (deliveryMode === 'BIO_LNG') {
      // null when the corridor has no costed bio-LNG route — the waterfall then shows
      // logistics as unset rather than inventing a liquefaction cost.
      return logistics.modes.bioLng.totalCostEurMwh;
    }
    return getRouteTransitTariff(originCountry, selectedMarket.country);
  }, [deliveryMode, logistics, originCountry, selectedMarket.country]);

  // Custom Cost Inputs.
  //
  // The procurement figure is the price paid to the producer, so it belongs to
  // producerPricing — that is what computeNetback actually reads. It previously wrote
  // to a `deliveredCost` field the engine ignored entirely, so typing in this box
  // changed the displayed stack without changing the netback.
  const effectiveCostInputs = useMemo(() => ({
    ...state.costs,
    transferCosts: transferCostOverride,
    certificationCosts: certCostOverride,
    logistics: transitCost,
    producerPricing: state.costs.producerPricing
      ? state.costs.producerPricing.mode === 'FIXED_PRICE'
        ? { ...state.costs.producerPricing, fixedPriceEurPerMwh: procurementCostOverride }
        : state.costs.producerPricing
      : null,
  }), [state.costs, procurementCostOverride, transferCostOverride, certCostOverride, transitCost]);

  // Base Netback Calculation
  const pricingSides = state.marks.pricingSides;
  const rawNetback = useMemo(() => {
    return computeNetback(selectedMarket, consignment, state.marks, effectiveCostInputs, pricingSides);
  }, [selectedMarket, consignment, state.marks, effectiveCostInputs, pricingSides]);

  // Adjust netback for German What-If Switch.
  //
  // The 2x view is taken wholesale from the branch computeNetback already produced.
  // There is deliberately no fallback that doubles the certificate and re-runs the
  // waterfall here: if the engine did not produce a branch, this screen does not know
  // enough to price one, and inventing it is how this screen and the Scanner came to
  // disagree about the same trade.
  const netback = useMemo(() => {
    if (selectedMarket.id === 'DE_THG' && germanMultiplierBranch === 'BRANCH_2X') {
      const branch2 = rawNetback.uncertaintyBranches?.[1];
      if (branch2 && branch2.certificateValue?.valueEurPerMWh != null) {
        return {
          ...rawNetback,
          certificateValue: branch2.certificateValue,
          netNetback: branch2.netNetback,
          grossValueSpread: branch2.grossValueSpread,
          producerPayable: branch2.producerPayable,
          deskMargin: branch2.deskMargin,
          marginPercent: branch2.marginPercent,
          grossSpreadPnL: branch2.grossSpreadPnL,
          deskPnL: branch2.deskPnL,
          sides: branch2.sides ?? rawNetback.sides,
        };
      }
    }
    // BRANCH_1X, or no branch available: the engine's baseline result stands as-is.
    return rawNetback;
  }, [selectedMarket.id, germanMultiplierBranch, rawNetback]);

  // Runner-Up Markets Calculation
  const runnerUpMarkets = useMemo(() => {
    const allNet = computeAllNetbacks(consignment, activeMarkets, state.marks, effectiveCostInputs, undefined, pricingSides);
    return allNet
      .filter(n => n.marketId !== selectedMarket.id && !n.isTheoretical && n.netNetback !== null)
      .sort((a, b) => (b.netNetback ?? -Infinity) - (a.netNetback ?? -Infinity))
      .slice(0, 2);
  }, [consignment, activeMarkets, state.marks, effectiveCostInputs, pricingSides, selectedMarket.id]);

  // Commercial desk margin comes from computeNetback. It is not recomputed here.
  const deskMarginVal = netback.deskMargin;
  const producerPayableVal = netback.producerPayable;

  // GHG Saving Calculation
  const ghgSavingPct = ((94.0 - ciOverride) / 94.0 * 100).toFixed(1);
  const avoidedTonsMWh = ((94.0 - ciOverride) * 0.0036).toFixed(2);

  const selectedTone = getVerdictTone(eligibility.overallVerdict);

  // Dynamic Hints
  const originHint = useMemo(() => {
    const p = PRODUCING_ORIGINS[originCountry];
    if (!p) return '';
    const isIso = p.gridZone === 'NON_EU_ISOLATED';
    return `${p.countryName} · ${p.activePlants} producing plants · Registry: ${p.primaryRegistry}${
      isIso ? ' · GRID-ISOLATED — no UDB ingestion' : ''
    }`;
  }, [originCountry]);

  // Waterfall Steps. A null val renders as unset; it does not contribute a zero bar,
  // which would read as "this cost is zero" rather than "this cost is unknown".
  const certVal = netback.certificateValue?.valueEurPerMWh ?? null;
  const waterfallSteps: {
    label: string;
    val: number | null;
    barVal: number | null;
    isDeduction?: boolean;
    isNet?: boolean;
  }[] = [
    { label: 'Certificate value', val: certVal, barVal: certVal, isDeduction: false },
    { label: 'Molecule (gas index)', val: netback.moleculeValue, barVal: netback.moleculeValue, isDeduction: false },
    { label: 'Transfer & registry', val: transferCostOverride, barVal: transferCostOverride, isDeduction: true },
    { label: 'Sustainability certification', val: certCostOverride, barVal: certCostOverride, isDeduction: true },
    { label: `Logistics (${deliveryMode.replace('_', ' ')})`, val: transitCost, barVal: transitCost, isDeduction: true },
    {
      label: 'Delivered value stack',
      val: netback.netNetback,
      barVal: netback.netNetback !== null ? Math.abs(netback.netNetback) : null,
      isNet: true,
    },
    // Producer payment comes out of the delivered stack, not before it. Listing it as a
    // deduction above the stack (as this did) double-counted it against the netback the
    // engine actually returns.
    { label: 'Producer payable', val: producerPayableVal, barVal: producerPayableVal, isDeduction: true },
    {
      label: 'Desk margin',
      val: deskMarginVal,
      barVal: deskMarginVal !== null ? Math.abs(deskMarginVal) : null,
      isNet: true,
    },
  ];

  const maxWaterfallVal = Math.max(
    ...waterfallSteps.map(s => (s.val !== null ? Math.abs(s.val) : 0)),
    1
  );

  // Handle Save Dossier
  const handleSaveDossier = () => {
    const assessment: TradeAssessment = {
      id: `DOS-${complianceYear}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: new Date().toISOString(),
      consignment,
      targetMarketId: selectedMarket.id,
      targetMarketName: selectedMarket.name,
      eligibility,
      netback,
      marks: state.marks,
      costs: effectiveCostInputs,
      userNotes: `Trade Assessment for ${counterparty}: ${consignment.name} ➔ ${selectedMarket.name} (${deliveryPeriodLabel}). Mode: ${deliveryMode}. Net: €${(netback.netNetback ?? 0).toFixed(2)}/MWh.`,
    };

    dispatch({ type: 'SAVE_ASSESSMENT', assessment });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const netNetbackVal = netback.netNetback ?? 0;
  const isNetNegative = netNetbackVal < 0;
  // Annual desk P&L is only meaningful once a margin exists — null, not a guess.
  const annualPnLVal =
    deskMarginVal !== null ? deskMarginVal * (consignment.volumeMWh ?? 120000) : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-950 font-sans">
      
      {/* Active deal context */}
      <div className="p-2 px-3.5 bg-stone-900 border-b border-stone-800 flex items-center justify-end gap-3 flex-none">
        <div className="font-mono text-micro text-stone-400 hidden sm:flex items-center gap-2">
          <span>Active Consignment: <strong className="text-stone-200">{consignment.name}</strong></span>
          <span>&#10143;</span>
          <span>Market: <strong className="text-teal-300">{selectedMarket.name}</strong></span>
        </div>
      </div>

        <div className="flex-1 grid grid-cols-[repeat(3,minmax(0,1fr))] min-h-0 min-w-[1400px] overflow-hidden bg-stone-950">
          
          {/* ========================================================================= */}
          {/* STEP 1 — CONSIGNMENT & PRESETS (COLUMN 1) */}
          {/* ========================================================================= */}
          <section className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto">
        
        {/* Step Header */}
        <div className="p-2.5 px-3.5 border-b border-stone-800 flex items-center justify-between gap-2.5 flex-none bg-stone-900">
          <div className="flex items-center gap-2">
            <span className="w-[19px] h-[19px] bg-teal-600 text-teal-950 flex items-center justify-center font-mono text-meta font-bold shrink-0">
              1
            </span>
            <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Consignment & Term Sheet
            </h2>
          </div>
          <span className="font-mono text-micro text-teal-300 bg-teal-950 border border-teal-800 px-1.5 py-0.5">
            {deliveryPeriodLabel} · {complianceYear}
          </span>
        </div>

        {/* Quick Deal Presets Bar */}
        <div className="p-3 px-3.5 border-b border-stone-800 bg-stone-950/60 flex flex-col gap-1.5 flex-none">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
            ⚡ Quick Deal Archetypes
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {DEAL_PRESETS.map((dp, dpi) => (
              <button
                key={dpi}
                type="button"
                onClick={() => handleApplyPreset(dp)}
                className="text-left p-1.5 px-2 bg-stone-900 border border-stone-800 hover:border-teal-500 text-stone-300 hover:text-stone-100 font-mono text-micro font-medium rounded-xs truncate transition-colors cursor-pointer"
              >
                {dp.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-3.5 flex flex-col gap-3.5 flex-1">
          
          {/* Counterparty & Compliance Period */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Counterparty
              </span>
              <input
                type="text"
                value={counterparty}
                onChange={e => setCounterparty(e.target.value)}
                placeholder="e.g. Shell Energy Europe"
                className="bg-stone-900 border border-stone-700 text-stone-100 font-sans text-xs p-1.5 px-2 rounded-xs outline-none focus:border-teal-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Compliance Year
              </span>
              <div className="flex gap-1">
                {[2025, 2026, 2027, 2028].map(yr => (
                  <button
                    key={yr}
                    type="button"
                    onClick={() => {
                      setComplianceYear(yr);
                      setDeliveryPeriodLabel(`Cal-${yr}`);
                    }}
                    aria-pressed={complianceYear === yr}
                    className={`flex-1 py-1 font-mono text-micro font-bold rounded-xs cursor-pointer transition-colors ${
                      complianceYear === yr
                        ? 'bg-teal-600 text-teal-950'
                        : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Origin Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Producing Origin
            </span>
            <div className="flex flex-wrap gap-[5px]">
              {Object.keys(PRODUCING_ORIGINS).map(code => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setOriginCountry(code)}
                  aria-pressed={originCountry === code}
                  className={`px-2.5 py-1 font-mono text-meta font-semibold transition-colors duration-150 rounded-xs cursor-pointer ${
                    originCountry === code
                      ? 'bg-teal-600 border border-teal-600 text-teal-950'
                      : 'border border-stone-700 text-stone-400 bg-transparent hover:text-stone-200'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
            <span className="text-xs leading-relaxed text-stone-500 mt-0.5">
              {originHint}
            </span>
          </div>

          {/* Feedstock Selector */}
          <div className="flex flex-col gap-1.5">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Feedstock Pathway
            </span>
            <div className="flex flex-wrap gap-[5px]">
              {Object.keys(FEEDSTOCK_REGISTRY).map(key => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleFeedstockSelect(key)}
                  aria-pressed={feedstockKey === key}
                  className={`px-2.5 py-1 font-mono text-meta font-semibold transition-colors duration-150 rounded-xs cursor-pointer ${
                    feedstockKey === key
                      ? 'bg-teal-600 border border-teal-600 text-teal-950'
                      : 'border border-stone-700 text-stone-400 bg-transparent hover:text-stone-200'
                  }`}
                >
                  {FEEDSTOCK_REGISTRY[key].name}
                </button>
              ))}
            </div>
          </div>

          {/* Scheme & Custody */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Scheme
              </span>
              <div className="flex flex-col gap-1">
                {(['ISCC_EU', 'REDCERT_EU', 'ISCC_PLUS'] as CertificationScheme[]).map(sc => (
                  <button
                    key={sc}
                    type="button"
                    onClick={() => setScheme(sc)}
                    aria-pressed={scheme === sc}
                    className={`p-1 text-left font-mono text-micro font-semibold transition-colors rounded-xs cursor-pointer ${
                      scheme === sc
                        ? 'bg-teal-600 border border-teal-600 text-teal-950 px-2'
                        : 'border border-stone-700 text-stone-400 bg-transparent hover:text-stone-200 px-2'
                    }`}
                  >
                    {sc.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Chain of Custody
              </span>
              <div className="flex flex-col gap-1">
                {(['MASS_BALANCE', 'BOOK_AND_CLAIM'] as ChainOfCustody[]).map(coc => (
                  <button
                    key={coc}
                    type="button"
                    onClick={() => setChainOfCustody(coc)}
                    aria-pressed={chainOfCustody === coc}
                    className={`p-1 text-left font-mono text-micro font-semibold transition-colors rounded-xs cursor-pointer ${
                      chainOfCustody === coc
                        ? 'bg-teal-600 border border-teal-600 text-teal-950 px-2'
                        : 'border border-stone-700 text-stone-400 bg-transparent hover:text-stone-200 px-2'
                    }`}
                  >
                    {coc === 'MASS_BALANCE' ? 'Mass balance' : 'Book & claim'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Carbon Intensity Block */}
          <div className="border-t border-stone-800 pt-3 flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Carbon intensity
              </span>
              <span className="font-mono font-num text-xl font-bold text-stone-100">
                {ciOverride > 0 ? `+${ciOverride}` : `${ciOverride}`}
                <span className="text-micro text-stone-400 font-normal"> gCO₂e/MJ</span>
              </span>
            </div>

            <input
              type="range"
              min="-150"
              max="50"
              step="5"
              value={ciOverride}
              onChange={e => setCiOverride(Number(e.target.value))}
              aria-label="Carbon intensity"
              className="w-full my-1"
            />

            <div className="flex justify-between font-mono text-micro text-stone-500">
              <span>−150 deep manure</span>
              <span>0</span>
              <span>+50 crop</span>
            </div>

            <div className="flex items-baseline justify-between pt-1 text-xs text-stone-400">
              <span>GHG saving vs 94.0 baseline</span>
              <span className="font-mono font-num text-sm font-semibold text-emerald-400">
                {ghgSavingPct}% ({avoidedTonsMWh} t/MWh)
              </span>
            </div>
          </div>

        </div>
      </section>

      {/* ========================================================================= */}
      {/* STEP 2 — DESTINATION & REGULATORY WHAT-IF (COLUMN 2) */}
      {/* ========================================================================= */}
      <section className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0 overflow-y-auto">
        
        {/* Step Header */}
        <div className="p-2.5 px-3.5 border-b border-stone-800 flex items-center justify-between gap-2.5 flex-none bg-stone-900">
          <div className="flex items-center gap-2">
            <span className="w-[19px] h-[19px] bg-teal-600 text-teal-950 flex items-center justify-center font-mono text-meta font-bold shrink-0">
              2
            </span>
            <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Destination & Legal Validation
            </h2>
          </div>
          <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border ${selectedTone.badge}`}>
            {eligibility.overallVerdict}
          </span>
        </div>

        {/* Target Market Picker */}
        <div className="p-3 px-3.5 border-b border-stone-800 flex flex-col gap-1.5 flex-none">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
            Target Compliance Market
          </span>
          
          <div className="flex flex-wrap gap-1 mt-0.5">
            {activeMarkets.map(m => {
              const label = m.country === 'FR' ? (m.id === 'FR_CPB' ? 'FR CPB' : 'FR TIRU') : m.country;
              const isSelected = selectedMarketId === m.id;

              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMarketId(m.id)}
                  aria-pressed={isSelected}
                  title={`${m.name} (${m.legalBasis})`}
                  className={`min-w-[34px] px-1.5 py-1.5 font-mono text-meta font-semibold transition-colors duration-150 rounded-xs cursor-pointer ${
                    isSelected
                      ? 'bg-teal-600 border border-teal-600 text-teal-950'
                      : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Market Overview & What-If Switches */}
        <div className="p-3 px-3.5 border-b border-stone-800 bg-stone-900/40 flex flex-col gap-2.5 flex-none">
          <div>
            <h3 className="m-0 text-base font-semibold leading-snug text-stone-100 truncate">
              {selectedMarket.name}
            </h3>
            <div className="font-mono text-meta text-stone-400 mt-0.5 truncate">
              {selectedMarket.legalBasis || 'RED III Art. 25–31'}
            </div>
          </div>

          {/* Regulatory Scenario Switches */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-stone-800">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Regulatory Scenario Switches
            </span>

            <div className="grid grid-cols-2 gap-1.5">
              {/* UDB State Toggle */}
              <button
                type="button"
                onClick={() => setUdbRecorded(udbRecorded === 'RECORDED' ? 'NOT_RECORDED' : 'RECORDED')}
                className={`p-1.5 px-2 font-mono text-micro font-semibold border rounded-xs text-left cursor-pointer transition-colors ${
                  udbRecorded === 'RECORDED'
                    ? 'text-emerald-300 bg-emerald-950 border-emerald-800'
                    : 'text-red-300 bg-red-950 border-red-800'
                }`}
              >
                UDB: {udbRecorded === 'RECORDED' ? '✓ Ingested' : '✗ Unevidenced'}
              </button>

              {/* German Double Count Switch */}
              {selectedMarket.id === 'DE_THG' ? (
                <button
                  type="button"
                  onClick={() => setGermanMultiplierBranch(germanMultiplierBranch === 'BRANCH_2X' ? 'BRANCH_1X' : 'BRANCH_2X')}
                  className={`p-1.5 px-2 font-mono text-micro font-semibold border rounded-xs text-left cursor-pointer transition-colors ${
                    germanMultiplierBranch === 'BRANCH_2X'
                      ? 'text-sky-300 bg-sky-950 border-sky-800'
                      : 'text-amber-300 bg-amber-950 border-amber-800'
                  }`}
                >
                  §37a: {germanMultiplierBranch === 'BRANCH_2X' ? '2× Retained' : '1× Baseline'}
                </button>
              ) : (
                <div className="p-1.5 px-2 font-mono text-micro text-stone-500 bg-stone-900 border border-stone-800 rounded-xs">
                  Ceiling: {selectedMarket.ceilingEurMwh ? `€${selectedMarket.ceilingEurMwh}/MWh` : 'Unbounded'}
                </div>
              )}
            </div>

          </div>

          {/* Runner-Up Opportunity Strip */}
          {runnerUpMarkets.length > 0 && (
            <div className="pt-2 border-t border-stone-800 flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-500 uppercase">
                Alternative Runner-Up Markets
              </span>
              <div className="flex flex-col gap-1">
                {runnerUpMarkets.map(rum => {
                  const delta = (netback.netNetback ?? 0) - (rum.netNetback ?? 0);
                  return (
                    <div
                      key={rum.marketId}
                      onClick={() => setSelectedMarketId(rum.marketId)}
                      className="p-1.5 px-2 bg-stone-900 border border-stone-800 hover:border-teal-500 rounded-xs flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span className="text-xs text-stone-200 truncate">
                        {rum.marketName}
                      </span>
                      <span className="font-mono font-num text-xs font-semibold text-emerald-400 shrink-0 pl-2">
                        €{(rum.netNetback ?? 0).toFixed(2)}/MWh
                        <span className="text-stone-500 text-micro font-normal"> (Δ {delta >= 0 ? `−€${delta.toFixed(1)}` : `+€${Math.abs(delta).toFixed(1)}`})</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 6-Gate Audit List */}
        <div className="p-3 px-3.5 flex flex-col gap-[1px] bg-stone-800 flex-1">
          {eligibility.gates.map((g, gi) => {
            const gTone = getVerdictTone(g.verdict);
            const cite = g.citations?.[0]?.shortName || g.gateLabel;

            return (
              <div key={gi} className="bg-stone-900 p-2.5 flex flex-col">
                <div className="flex items-center gap-2">
                  <span className={`w-[7px] h-[7px] rounded-full shrink-0 ${gTone.dot}`} />
                  <span className="font-mono text-meta font-semibold tracking-[0.06em] text-stone-100 flex-1">
                    {g.gateLabel}
                  </span>
                  <span className={`font-mono text-micro font-bold px-1 py-0.5 border ${gTone.badge}`}>
                    {g.verdict}
                  </span>
                </div>
                <p className="m-0 text-xs leading-relaxed text-stone-400 mt-1 ml-3.5">
                  {g.reason}
                </p>
                <div className="font-mono text-micro text-teal-300 mt-1 ml-3.5">
                  {cite}
                </div>
              </div>
            );
          })}
        </div>

      </section>

      {/* ========================================================================= */}
      {/* STEP 3 — WATERFALL, COMMERCIAL OVERRIDES & P&L (COLUMN 3) */}
      {/* ========================================================================= */}
      <section className="bg-stone-950 flex flex-col min-h-0 overflow-y-auto">
        
        {/* Step Header */}
        <div className="p-2.5 px-3.5 border-b border-stone-800 flex items-center justify-between gap-2.5 flex-none bg-stone-900">
          <div className="flex items-center gap-2">
            <span className="w-[19px] h-[19px] bg-teal-600 text-teal-950 flex items-center justify-center font-mono text-meta font-bold shrink-0">
              3
            </span>
            <h2 className="m-0 font-mono text-xs font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Commercial Stack & P&L
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsLogisticsOpen(true)}
            className="font-mono text-micro text-teal-300 bg-transparent border border-teal-800 hover:bg-teal-950 px-1.5 py-0.5 cursor-pointer"
          >
            LOGISTICS PLAYBOOK →
          </button>
        </div>

        {/* Hero Net Netback */}
        <div className="p-3.5 border-b border-stone-800 flex flex-col flex-none">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
            Net netback
          </span>
          <div className={`font-mono font-num text-[40px] font-bold tracking-[-0.04em] leading-none mt-1.5 ${
            isNetNegative ? 'text-red-400' : selectedTone.text
          }`}>
            {isNetNegative ? '−€' : '€'}{Math.abs(netNetbackVal).toFixed(2)}
          </div>
          <div className="font-mono text-meta text-stone-500 mt-1.5">
            per MWh · {pricingSides.certificateSide.toUpperCase()} marks · {selectedMarket.unitLabel} unit of account
          </div>
        </div>

        {/* Delivery Mode & Cost Stack Overrides */}
        <div className="p-3 px-3.5 border-b border-stone-800 bg-stone-900/30 flex flex-col gap-2 flex-none">
          <div className="flex items-center justify-between">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Delivery Logistics Mode
            </span>
            <span className="font-mono text-micro text-stone-400">
              Transit: {transitCost !== null ? `€${transitCost.toFixed(2)}/MWh` : 'unset'}
            </span>
          </div>

          {/* Delivery Mode Chips */}
          <div className="grid grid-cols-3 gap-1">
            {[
              { id: 'VIRTUAL_SWAP', label: 'Virtual Swap' },
              { id: 'PHYSICAL_PIPELINE', label: 'Pipeline Wheel' },
              { id: 'BIO_LNG', label: 'Bio-LNG Freight' },
            ].map(dm => (
              <button
                key={dm.id}
                type="button"
                onClick={() => setDeliveryMode(dm.id as DeliveryMode)}
                aria-pressed={deliveryMode === dm.id}
                className={`py-1 font-mono text-micro font-bold rounded-xs cursor-pointer transition-colors ${
                  deliveryMode === dm.id
                    ? 'bg-teal-600 text-teal-950'
                    : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
                }`}
              >
                {dm.label}
              </button>
            ))}
          </div>

          {/* Inline Cost Inputs */}
          <div className="grid grid-cols-3 gap-2 mt-1">
            <div>
              <span className="block font-mono text-micro text-stone-500 uppercase">Procure €/MWh</span>
              <input
                type="number"
                step="0.5"
                value={procurementCostOverride ?? ''}
                onChange={e => setProcurementCostOverride(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-mono font-num text-xs p-1 mt-0.5 rounded-xs outline-none focus:border-teal-500 text-right"
              />
            </div>
            <div>
              <span className="block font-mono text-micro text-stone-500 uppercase">Transfer €/MWh</span>
              <input
                type="number"
                step="0.1"
                value={transferCostOverride ?? ''}
                onChange={e => setTransferCostOverride(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-mono font-num text-xs p-1 mt-0.5 rounded-xs outline-none focus:border-teal-500 text-right"
              />
            </div>
            <div>
              <span className="block font-mono text-micro text-stone-500 uppercase">Cert €/MWh</span>
              <input
                type="number"
                step="0.05"
                value={certCostOverride ?? ''}
                onChange={e => setCertCostOverride(e.target.value === '' ? null : Number(e.target.value))}
                className="w-full bg-stone-900 border border-stone-700 text-stone-100 font-mono font-num text-xs p-1 mt-0.5 rounded-xs outline-none focus:border-teal-500 text-right"
              />
            </div>
          </div>
        </div>

        {/* Waterfall Breakdown */}
        <div className="p-3.5 border-b border-stone-800 flex flex-col gap-2 flex-none">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase mb-1">
            Commercial Waterfall Stack
          </span>

          {waterfallSteps.map((step, idx) => {
            const pct =
              step.barVal !== null
                ? Math.min(100, Math.max(2, (step.barVal / maxWaterfallVal) * 100))
                : 0;

            return (
              <div key={idx} className="flex items-center gap-2">
                <span className="w-[130px] shrink-0 text-xs text-stone-300 truncate">
                  {step.label}
                </span>
                <span className="flex-1 h-4 bg-stone-900 relative rounded-xs overflow-hidden">
                  <span
                    style={{ width: `${pct.toFixed(1)}%` }}
                    className={`absolute inset-y-0 left-0 ${
                      step.isNet
                        ? (isNetNegative ? 'bg-red-800' : 'bg-emerald-500')
                        : step.isDeduction
                        ? 'bg-red-800'
                        : 'bg-teal-600'
                    }`}
                  />
                </span>
                <span className={`w-[80px] font-mono font-num text-xs text-right shrink-0 ${
                  step.isNet
                    ? (isNetNegative ? 'text-red-400 font-bold' : 'text-emerald-400 font-bold')
                    : step.isDeduction
                    ? 'text-red-400'
                    : 'text-stone-200'
                }`}>
                  {step.val === null
                    ? '—'
                    : `${step.isDeduction ? '−€' : '€'}${Math.abs(step.val).toFixed(2)}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Volume & P&L Grid */}
        <div className="p-3.5 border-b border-stone-800 flex flex-col gap-2 flex-none">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase mb-0.5">
            Volume & Notional P&L
          </span>

          <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border border-stone-800">
            <div className="bg-stone-950 p-2.5">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Volume (MWh/y)</div>
              <div className="font-mono font-num text-base font-semibold text-stone-100 mt-0.5">
                {(consignment.volumeMWh ?? 120000).toLocaleString('en-GB')}
              </div>
            </div>

            <div className="bg-stone-950 p-2.5">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Gross Notional</div>
              <div className="font-mono font-num text-base font-semibold text-stone-100 mt-0.5">
                €{((netback.certificateValue?.valueEurPerMWh ?? 0) * (consignment.volumeMWh ?? 120000)).toLocaleString('en-GB', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-stone-950 p-2.5">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Desk Margin / MWh</div>
              <div className="font-mono font-num text-base font-semibold text-stone-100 mt-0.5">
                {deskMarginVal !== null ? `€${deskMarginVal.toFixed(2)}` : 'Unset'}
              </div>
            </div>

            <div className="bg-stone-950 p-2.5">
              <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">Annual Desk P&L</div>
              <div className={`font-mono font-num text-base font-bold mt-0.5 ${
                annualPnLVal !== null && annualPnLVal < 0 ? 'text-red-400' : 'text-emerald-400'
              }`}>
                {annualPnLVal !== null
                  ? `€${annualPnLVal.toLocaleString('en-GB', { maximumFractionDigits: 0 })}`
                  : 'Unset'}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-3.5 flex flex-col gap-2 mt-auto flex-none">
          <button
            type="button"
            onClick={handleSaveDossier}
            className="w-full p-2.5 bg-teal-600 hover:bg-teal-500 text-teal-50 border-none font-mono text-xs font-semibold tracking-[0.1em] uppercase cursor-pointer transition-colors duration-150"
          >
            {saveSuccess ? '✓ Dossier Saved to Library' : 'Save dossier with citations'}
          </button>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsDealTicketOpen(true)}
              className="p-2 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-mono text-meta font-medium tracking-[0.06em] cursor-pointer transition-colors duration-150"
            >
              Deal Ticket Preview
            </button>
          </div>
        </div>

      </section>

        </div>

      {/* Logistics Playbook Modal */}
      <LogisticsModal
        originCountry={originCountry}
        targetCountry={selectedMarket.country}
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
      />

      {/* DEAL TICKET PREVIEW MODAL */}
      {isDealTicketOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Deal Ticket Preview"
          className="fixed inset-0 z-100 bg-black/75 flex items-center justify-center p-6 font-sans"
        >
          <div className="w-full max-w-[620px] bg-stone-950 border border-stone-700 shadow-2xl rounded-xs flex flex-col max-h-[90vh] overflow-y-auto">
            <div className="p-3.5 px-4 bg-stone-900 border-b border-stone-800 flex items-start justify-between gap-4">
              <div>
                <h2 className="m-0 text-base font-semibold text-stone-100">
                  Commercial Deal Ticket & Compliance Audit
                </h2>
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 mt-0.5">
                  REF: DEAL-{complianceYear}-{originCountry}-{selectedMarket.country} · {deliveryPeriodLabel}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDealTicketOpen(false)}
                className="bg-transparent border border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800 px-2 py-0.5 font-mono text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border border-stone-800">
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Counterparty</div>
                  <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">{counterparty}</div>
                </div>
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Target Market</div>
                  <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">{selectedMarket.name}</div>
                </div>
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Consignment Volume</div>
                  <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">{(consignment.volumeMWh ?? 120000).toLocaleString()} MWh</div>
                </div>
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Carbon Intensity</div>
                  <div className="font-mono text-sm font-semibold text-emerald-400 mt-0.5">{ciOverride} gCO₂e/MJ</div>
                </div>
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Delivery Mode</div>
                  <div className="font-mono text-sm font-semibold text-stone-100 mt-0.5">{deliveryMode.replace('_', ' ')}</div>
                </div>
                <div className="bg-stone-950 p-2.5">
                  <div className="font-mono text-micro text-stone-500 uppercase">Annual Desk P&L</div>
                  <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
                    {annualPnLVal !== null
                      ? `€${annualPnLVal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                      : 'Unset'}
                  </div>
                </div>
              </div>

              <div className="p-3 bg-stone-900 border border-stone-800 rounded-xs">
                <div className="font-mono text-micro text-stone-400 uppercase font-semibold mb-1">
                  Regulatory Compliance Checklist (6-Gate Evaluation)
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs text-stone-300">
                  {eligibility.gates.map((g, gi) => (
                    <div key={gi} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${g.verdict === 'PASS' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="truncate">{g.gateLabel}: <strong>{g.verdict}</strong></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    alert(`Deal Ticket exported for ${counterparty} (${selectedMarket.name}).`);
                    setIsDealTicketOpen(false);
                  }}
                  className="flex-1 p-2.5 bg-teal-600 hover:bg-teal-500 text-teal-50 font-mono text-xs font-semibold uppercase cursor-pointer"
                >
                  Confirm & Export Term Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setIsDealTicketOpen(false)}
                  className="p-2.5 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 font-mono text-xs cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
