import { MARKETS, getMarketById } from '../markets/registry';
import { getMarkAgeDays, getMarkStaleness, StalenessStatus } from '../markets/types';
import { MarksState } from '../netback/types';
import { scanEuropeanArbitrage, DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
import { buildDealUrl } from '../trade/dealParams';
import { getAssumption, feedstockDefaultCi } from '../assumptions/registry';
import {
  BriefingParams,
  MorningBriefingSummary,
  OvernightPriceMover,
  MarkStalenessAlert,
  StalenessSummary,
  RegulatoryConsultationUpdate,
  OriginationOpportunity,
  StructuredDealParams,
  DeskRemedy,
  PriceMovementDirection,
} from './types';

/**
 * Standard prior-close benchmark reference marks for European biomethane desk instruments.
 * Used when previousMarks is omitted to compute deterministic desk reference baseline deltas.
 */
export const DEFAULT_PRIOR_CLOSE_MARKS: {
  gasIndexMid: number;
  marks: Record<string, number>;
  fx: { gbpEur: number; chfEur: number };
} = {
  gasIndexMid: 28.15, // TTF M+1 €/MWh prior close
  marks: {
    DE_THG: 345.0,     // €/tCO2e
    NL_ERE: 0.355,     // €/kg CO2e (HBE-G)
    FR_CPB: 88.5,      // €/MWh
    IT_CIC: 318.0,     // €/CIC
    UK_RTFO: 0.215,    // GBP/dRTFC
    AT_SUBSIDY: 72.0,  // €/MWh
    SE_TAX_EXEMPT: 68.0,// €/MWh
    FUELEU: 285.0,     // €/tCO2e deficit
  },
  fx: {
    gbpEur: 1.175,
    chfEur: 1.062,
  },
};

/**
 * Format a 1-click structured deal URL pointing to TradeBuilderScreen.
 * Delegates to canonical buildDealUrl to preserve contract integrity.
 */
export function formatStructuredDealUrl(params: StructuredDealParams): string {
  return buildDealUrl({
    originCountry: params.originCountry,
    feedstock: params.feedstock,
    ci: params.ci,
    marketId: params.marketId,
    volume: params.volume,
    scheme: params.scheme,
    coc: params.coc,
    counterparty: params.counterparty,
    deliveryPeriod: params.deliveryPeriod,
  });
}

/**
 * Compute absolute and percentage delta between current and previous price.
 */
export function calculatePriceMovement(
  currentPrice: number | null,
  previousPrice: number | null
): {
  absoluteDelta: number | null;
  percentageDelta: number | null;
  direction: PriceMovementDirection;
} {
  if (currentPrice === null || previousPrice === null) {
    return {
      absoluteDelta: null,
      percentageDelta: null,
      direction: 'NO_DATA',
    };
  }

  const absoluteDelta = Math.round((currentPrice - previousPrice) * 1000) / 1000;
  let percentageDelta: number | null = null;
  if (previousPrice !== 0) {
    percentageDelta = Math.round(((currentPrice - previousPrice) / Math.abs(previousPrice)) * 10000) / 100;
  }

  let direction: PriceMovementDirection = 'UNCHANGED';
  if (absoluteDelta > 0.0001) {
    direction = 'UP';
  } else if (absoluteDelta < -0.0001) {
    direction = 'DOWN';
  }

  return {
    absoluteDelta,
    percentageDelta,
    direction,
  };
}

/**
 * Synthesizes overnight price movements across TTF brown gas, national certificates, and FX rates.
 * Stamped with authentic baseline provenance: if previousMarks is absent, it benchmarks against
 * DEFAULT_PRIOR_CLOSE_MARKS and labels the badge 'Δ vs. Desk Baseline'. If an authentic previousMarks
 * snapshot is passed, it labels '24h Overnight Change'.
 */
export function synthesizeOvernightMovers(
  currentMarks: MarksState,
  previousMarks?: MarksState | null
): OvernightPriceMover[] {
  const isBaseline = !previousMarks;
  const badgeLabel = isBaseline ? 'Δ vs. Desk Baseline' : '24h Overnight Change';
  const movers: OvernightPriceMover[] = [];

  // 1. TTF Gas M+1
  const ttfCurrent = currentMarks.gasIndex.mid ?? currentMarks.gasIndex.bid ?? null;
  const ttfPrev = previousMarks?.gasIndex.mid ?? previousMarks?.gasIndex.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.gasIndexMid;
  const ttfMovement = calculatePriceMovement(ttfCurrent, ttfPrev);
  movers.push({
    instrumentId: 'TTF_GAS',
    instrumentName: 'TTF Natural Gas M+1',
    unitOfAccount: 'EUR/MWh',
    currentPrice: ttfCurrent,
    previousPrice: ttfPrev,
    absoluteDelta: ttfMovement.absoluteDelta,
    percentageDelta: ttfMovement.percentageDelta,
    direction: ttfMovement.direction,
    provenanceSource: currentMarks.gasIndex.provenance?.sourceName || 'THE/ICE Endex',
    observedAt: currentMarks.gasIndex.provenance?.observedAt || currentMarks.gasIndex.updatedAt,
    commentary: ttfMovement.direction === 'UP'
      ? 'Brown gas molecule firming on European storage replenishment demand.'
      : ttfMovement.direction === 'DOWN'
      ? 'Prompt molecule softening on high LNG imports and mild temperature forecasts.'
      : 'Natural gas baseline stable across European hubs.',
    isBaseline,
    badgeLabel,
  });

  // 2. German THG Quota
  const deMark = currentMarks.marks['DE_THG'];
  const deCurrent = deMark?.mid ?? deMark?.bid ?? null;
  const dePrev = previousMarks?.marks['DE_THG']?.mid ?? previousMarks?.marks['DE_THG']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['DE_THG'];
  const deMovement = calculatePriceMovement(deCurrent, dePrev);
  movers.push({
    instrumentId: 'DE_THG',
    instrumentName: 'German THG Quota',
    unitOfAccount: 'EUR/tCO2e',
    currentPrice: deCurrent,
    previousPrice: dePrev,
    absoluteDelta: deMovement.absoluteDelta,
    percentageDelta: deMovement.percentageDelta,
    direction: deMovement.direction,
    provenanceSource: deMark?.provenance?.sourceName || 'Argus Media / Broker indications',
    observedAt: deMark?.provenance?.observedAt || deMark?.updatedAt || null,
    commentary: deMovement.direction === 'UP'
      ? 'Quota compliance tightening on upstream emissions reduction phaseout.'
      : deMovement.direction === 'DOWN'
      ? 'THG softened by UER quota supply overhang and regulatory carryover.'
      : 'THG bilateral trading range steady.',
    isBaseline,
    badgeLabel,
  });

  // 3. Netherlands ERE
  const nlMark = currentMarks.marks['NL_ERE'];
  const nlCurrent = nlMark?.mid ?? nlMark?.bid ?? null;
  const nlPrev = previousMarks?.marks['NL_ERE']?.mid ?? previousMarks?.marks['NL_ERE']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['NL_ERE'];
  const nlMovement = calculatePriceMovement(nlCurrent, nlPrev);
  movers.push({
    instrumentId: 'NL_ERE',
    instrumentName: 'Netherlands ERE / HBE-G',
    unitOfAccount: 'EUR/GJ',
    currentPrice: nlCurrent,
    previousPrice: nlPrev,
    absoluteDelta: nlMovement.absoluteDelta,
    percentageDelta: nlMovement.percentageDelta,
    direction: nlMovement.direction,
    provenanceSource: nlMark?.provenance?.sourceName || 'VertiCer / NEa Registry',
    observedAt: nlMark?.provenance?.observedAt || nlMark?.updatedAt || null,
    commentary: nlMovement.direction === 'UP'
      ? 'Dutch HBE-G bids bid up by maritime and inland transport blenders.'
      : nlMovement.direction === 'DOWN'
      ? 'Dutch transport obligation units easing with expanded bio-ticket creation.'
      : 'Dutch renewable transport unit index unchanged.',
    isBaseline,
    badgeLabel,
  });

  // 4. France CPB
  const frMark = currentMarks.marks['FR_CPB'];
  const frCurrent = frMark?.mid ?? frMark?.bid ?? null;
  const frPrev = previousMarks?.marks['FR_CPB']?.mid ?? previousMarks?.marks['FR_CPB']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['FR_CPB'];
  const frMovement = calculatePriceMovement(frCurrent, frPrev);
  movers.push({
    instrumentId: 'FR_CPB',
    instrumentName: 'France CPB Auction',
    unitOfAccount: 'EUR/MWh',
    currentPrice: frCurrent,
    previousPrice: frPrev,
    absoluteDelta: frMovement.absoluteDelta,
    percentageDelta: frMovement.percentageDelta,
    direction: frMovement.direction,
    provenanceSource: frMark?.provenance?.sourceName || 'Powernext / EEX CPB',
    observedAt: frMark?.provenance?.observedAt || frMark?.updatedAt || null,
    commentary: frCurrent !== null && frCurrent >= 100
      ? 'French CPB pinned at statutory penalty ceiling (€100.00/MWh).'
      : frMovement.direction === 'UP'
      ? 'CPB certificate auction clearing higher on compliance demand.'
      : 'French supplier obligation certificates trading below ceiling.',
    isBaseline,
    badgeLabel,
  });

  // 5. Italy CIC
  const itMark = currentMarks.marks['IT_CIC'];
  const itCurrent = itMark?.mid ?? itMark?.bid ?? null;
  const itPrev = previousMarks?.marks['IT_CIC']?.mid ?? previousMarks?.marks['IT_CIC']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['IT_CIC'];
  const itMovement = calculatePriceMovement(itCurrent, itPrev);
  movers.push({
    instrumentId: 'IT_CIC',
    instrumentName: 'Italy CIC Quota',
    unitOfAccount: 'EUR/CIC',
    currentPrice: itCurrent,
    previousPrice: itPrev,
    absoluteDelta: itMovement.absoluteDelta,
    percentageDelta: itMovement.percentageDelta,
    direction: itMovement.direction,
    provenanceSource: itMark?.provenance?.sourceName || 'GSE Platform',
    observedAt: itMark?.provenance?.observedAt || itMark?.updatedAt || null,
    commentary: itMovement.direction === 'UP'
      ? 'Italian advanced biomethane quota certificates firming.'
      : 'GSE release schedule providing market liquidity.',
    isBaseline,
    badgeLabel,
  });

  // 6. UK RTFO
  const ukMark = currentMarks.marks['UK_RTFO'];
  const ukCurrent = ukMark?.mid ?? ukMark?.bid ?? null;
  const ukPrev = previousMarks?.marks['UK_RTFO']?.mid ?? previousMarks?.marks['UK_RTFO']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['UK_RTFO'];
  const ukMovement = calculatePriceMovement(ukCurrent, ukPrev);
  movers.push({
    instrumentId: 'UK_RTFO',
    instrumentName: 'UK RTFO (dRTFC)',
    unitOfAccount: 'GBP/dRTFC',
    currentPrice: ukCurrent,
    previousPrice: ukPrev,
    absoluteDelta: ukMovement.absoluteDelta,
    percentageDelta: ukMovement.percentageDelta,
    direction: ukMovement.direction,
    provenanceSource: ukMark?.provenance?.sourceName || 'DfT / Argus Media',
    observedAt: ukMark?.provenance?.observedAt || ukMark?.updatedAt || null,
    commentary: ukMovement.direction === 'UP'
      ? 'UK double-counting development tickets advancing.'
      : 'RTFO blending certificate supply balanced.',
    isBaseline,
    badgeLabel,
  });

  // 7. FuelEU Maritime
  const fueleuMark = currentMarks.marks['FUELEU'];
  const fueleuCurrent = fueleuMark?.mid ?? fueleuMark?.bid ?? null;
  const fueleuPrev = previousMarks?.marks['FUELEU']?.mid ?? previousMarks?.marks['FUELEU']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['FUELEU'];
  const fueleuMovement = calculatePriceMovement(fueleuCurrent, fueleuPrev);
  movers.push({
    instrumentId: 'FUELEU',
    instrumentName: 'FuelEU Maritime Compliance Deficit',
    unitOfAccount: 'EUR/tCO2e',
    currentPrice: fueleuCurrent,
    previousPrice: fueleuPrev,
    absoluteDelta: fueleuMovement.absoluteDelta,
    percentageDelta: fueleuMovement.percentageDelta,
    direction: fueleuMovement.direction,
    provenanceSource: fueleuMark?.provenance?.sourceName || 'FuelEU Pooling Desk',
    observedAt: fueleuMark?.provenance?.observedAt || fueleuMark?.updatedAt || null,
    commentary: fueleuMovement.direction === 'UP'
      ? 'Maritime pooling compliance deficit avoidance premium widening.'
      : 'VLSFO-equivalent maritime deficit benchmark steady.',
    isBaseline,
    badgeLabel,
  });

  // 8. FX GBP/EUR
  const fxGbpCurrent = currentMarks.fx.gbpEur;
  const fxGbpPrev = previousMarks?.fx.gbpEur ?? DEFAULT_PRIOR_CLOSE_MARKS.fx.gbpEur;
  const fxGbpMovement = calculatePriceMovement(fxGbpCurrent, fxGbpPrev);
  movers.push({
    instrumentId: 'FX_GBP_EUR',
    instrumentName: 'FX Cross: GBP/EUR',
    unitOfAccount: 'EUR per GBP',
    currentPrice: fxGbpCurrent,
    previousPrice: fxGbpPrev,
    absoluteDelta: fxGbpMovement.absoluteDelta,
    percentageDelta: fxGbpMovement.percentageDelta,
    direction: fxGbpMovement.direction,
    provenanceSource: currentMarks.fx.provenance?.sourceName || 'ECB Reference Rate',
    observedAt: currentMarks.fx.provenance?.observedAt || currentMarks.fx.updatedAt || null,
    commentary: fxGbpMovement.direction === 'UP'
      ? 'Sterling appreciation increases EUR-denominated UK RTFO netback.'
      : fxGbpMovement.direction === 'DOWN'
      ? 'Sterling softening reduces EUR realization for UK-delivered biomethane.'
      : 'Sterling-Euro cross unchanged.',
    isBaseline,
    badgeLabel,
  });

  // 9. FX CHF/EUR
  const fxChfCurrent = currentMarks.fx.chfEur;
  const fxChfPrev = previousMarks?.fx.chfEur ?? DEFAULT_PRIOR_CLOSE_MARKS.fx.chfEur;
  const fxChfMovement = calculatePriceMovement(fxChfCurrent, fxChfPrev);
  movers.push({
    instrumentId: 'FX_CHF_EUR',
    instrumentName: 'FX Cross: CHF/EUR',
    unitOfAccount: 'EUR per CHF',
    currentPrice: fxChfCurrent,
    previousPrice: fxChfPrev,
    absoluteDelta: fxChfMovement.absoluteDelta,
    percentageDelta: fxChfMovement.percentageDelta,
    direction: fxChfMovement.direction,
    provenanceSource: currentMarks.fx.provenance?.sourceName || 'SNB / ECB Reference Rate',
    observedAt: currentMarks.fx.provenance?.observedAt || currentMarks.fx.updatedAt || null,
    commentary: 'Swiss Franc cross steady across European clearing houses.',
    isBaseline,
    badgeLabel,
  });

  return movers;
}

/**
 * Evaluates freshness and staleness across all active market marks.
 */
export function evaluateMarkStaleness(
  marks: MarksState,
  referenceDate?: Date
): StalenessSummary {
  const alerts: MarkStalenessAlert[] = [];
  let freshCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let unfilledCount = 0;

  for (const market of MARKETS) {
    const markEntry = marks.marks[market.id];
    const mid = markEntry?.mid ?? null;
    let ageDays: number | null = null;
    let stalenessStatus: StalenessStatus = 'UNFILLED';

    const dateStr = markEntry?.provenance?.observedAt ?? markEntry?.updatedAt ?? null;
    if (dateStr) {
      const markTime = new Date(dateStr).getTime();
      const refTime = referenceDate ? referenceDate.getTime() : Date.now();
      const msDiff = refTime - markTime;
      if (!isNaN(msDiff)) {
        ageDays = Math.max(0, Math.floor(msDiff / (1000 * 60 * 60 * 24)));
        if (ageDays >= 30) {
          stalenessStatus = 'STALE_CRITICAL';
        } else if (ageDays >= 7) {
          stalenessStatus = 'STALE_WARNING';
        } else {
          stalenessStatus = 'FRESH';
        }
      }
    }

    if (stalenessStatus === 'UNFILLED') {
      unfilledCount++;
    } else if (stalenessStatus === 'FRESH') {
      freshCount++;
    } else if (stalenessStatus === 'STALE_WARNING') {
      warningCount++;
    } else if (stalenessStatus === 'STALE_CRITICAL') {
      criticalCount++;
    }

    let recommendation = 'Mark current and verified.';
    if (stalenessStatus === 'UNFILLED') {
      recommendation = `Enter latest observed ${market.unitLabel} broker quotes.`;
    } else if (stalenessStatus === 'STALE_CRITICAL') {
      recommendation = `Mark is ${ageDays} days old (>30d). Refresh broker indications urgently.`;
    } else if (stalenessStatus === 'STALE_WARNING') {
      recommendation = `Mark is ${ageDays} days old (>7d). Review against latest trade prints.`;
    }

    alerts.push({
      marketId: market.id,
      marketName: market.name,
      unitLabel: market.unitLabel,
      currentMid: mid,
      stalenessStatus,
      ageDays,
      sourceType: markEntry?.provenance?.sourceType ?? null,
      sourceName: markEntry?.provenance?.sourceName ?? markEntry?.source ?? null,
      observedAt: markEntry?.provenance?.observedAt ?? markEntry?.updatedAt ?? null,
      recommendation,
    });
  }

  // Sort: UNFILLED and CRITICAL first
  alerts.sort((a, b) => {
    const priority = { STALE_CRITICAL: 0, UNFILLED: 1, STALE_WARNING: 2, FRESH: 3 };
    return priority[a.stalenessStatus] - priority[b.stalenessStatus];
  });

  return {
    freshCount,
    warningCount,
    criticalCount,
    unfilledCount,
    totalTracked: MARKETS.length,
    alerts,
  };
}

export const STATUTORY_REGULATORY_UPDATES: RegulatoryConsultationUpdate[] = [
  {
    id: 'UK_RTFO_TRADE_CONTINUITY',
    jurisdiction: 'United Kingdom / European Union',
    jurisdictionCode: 'GB/EU',
    title: 'UK Post-Brexit RTFO Mass Balance Border Discontinuity',
    legalBasis: 'Energy Act 2004 / RTFO Order 2007 (as amended) & RED II/III Bilateral Interface',
    status: 'CONSULTATION_OPEN',
    statusBadge: 'Active Enforcement / Gated Border',
    effectiveDate: '2026-01-01',
    summaryExcerpt: 'Cross-border physical grid mass balance between GB gas grid and continental European transmission system operators remains legally severed for statutory certificate transfer.',
    tradingDeskImpact: 'UK injected volumes remain gated with HARD_BLOCK for EU quota surrender pending formal bilateral treaty signing.',
    impactLevel: 'HIGH',
    affectedMarkets: ['UK_RTFO', 'DE_THG', 'NL_ERE', 'FR_CPB'],
  },
  {
    id: 'RED_III_NATIONAL_TRANSPOSITION',
    jurisdiction: 'European Union',
    jurisdictionCode: 'EU',
    title: 'RED III National Transposition & Article 29(10) GHG Baselines',
    legalBasis: 'Directive (EU) 2023/2413 (RED III)',
    status: 'ENACTED',
    statusBadge: 'Enacted / In Force',
    effectiveDate: '2025-05-21',
    summaryExcerpt: 'Harmonized 65% GHG savings threshold for transport and advanced sub-targets (1% by 2025, 5.5% by 2030) binding across member state registries.',
    tradingDeskImpact: 'High-CI consignments (>32.9 gCO2e/MJ) face universal compliance gating across all 24 European jurisdictions.',
    impactLevel: 'MEDIUM',
    affectedMarkets: ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'AT_SUBSIDY', 'ES_GUARANTEE'],
  },
  {
    id: 'FR_CPB_PERIOD_1_AUCTION_CAP',
    jurisdiction: 'France',
    jurisdictionCode: 'FR',
    title: 'CPB Period 1 Obligation & Statutory Ceiling Clamp',
    legalBasis: "Code de l'énergie Art. L. 446-24 / Décret n° 2022-640",
    status: 'ENACTED',
    statusBadge: 'Enacted / In Force',
    effectiveDate: '2026-01-01',
    summaryExcerpt: 'Gas supplier CPB purchase obligation in effect with statutory penalty ceiling fixed at €100.00/MWh clamping all auction certificates.',
    tradingDeskImpact: 'Strict netback ceiling at €100.00/MWh; valuation upside clamped regardless of high gas or certificate bids.',
    impactLevel: 'MEDIUM',
    affectedMarkets: ['FR_CPB'],
  },
  {
    id: 'FUELEU_MARITIME_2025_INSETTING',
    jurisdiction: 'EU Maritime Scope',
    jurisdictionCode: 'EU',
    title: 'FuelEU Maritime -2% GHG Intensity Target & Bio-LNG Insetting',
    legalBasis: 'Regulation (EU) 2023/1805 Art. 4 & Art. 23',
    status: 'ENACTED',
    statusBadge: 'Active Enforcement',
    effectiveDate: '2025-01-01',
    summaryExcerpt: 'Binding 2% GHG intensity reduction from 91.16 gCO2e/MJ baseline with €2,400/t VLSFO-eq penalty deficit avoidance.',
    tradingDeskImpact: 'Substantial compliance value for deep-negative CI manure biomethane (-100 gCO2e/MJ), unlocking premium insetting margins.',
    impactLevel: 'HIGH',
    affectedMarkets: ['FUELEU'],
  },
];

/**
 * Pure functional engine to generate a complete Morning Market Briefing.
 */
export function generateMorningBriefing(params: BriefingParams): MorningBriefingSummary {
  const {
    currentMarks,
    previousMarks,
    costs,
    selectedFeedstockKey = 'manure',
    ciOverride,
    scheme = 'ISCC_EU',
    chainOfCustody = 'MASS_BALANCE',
    scenario = DEFAULT_WHAT_IF_SCENARIO,
    defaultDealVolumeMWh = getAssumption('deal.defaultVolumeMwh'),
    asOfDate = new Date(),
  } = params;

  const dateStr = typeof asOfDate === 'string' ? asOfDate : asOfDate.toISOString();
  const isBaseline = !previousMarks;
  const benchmarkLabel = isBaseline ? 'Δ vs. Desk Baseline' : '24h Overnight Change';

  // 1. Overnight Movers
  const overnightMovers = synthesizeOvernightMovers(currentMarks, previousMarks);

  // 2. Mark Staleness
  const stalenessSummary = evaluateMarkStaleness(currentMarks);

  // 3. Scan Arbitrage Corridors
  const feedstockInfo = FEEDSTOCK_REGISTRY[selectedFeedstockKey] || FEEDSTOCK_REGISTRY.manure;
  // Desk default CI for the feedstock (Pricing desk → Desk assumptions), not the registry's static value.
  const targetCI = ciOverride ?? feedstockDefaultCi(selectedFeedstockKey) ?? feedstockInfo.defaultCI;

  const arbScan = scanEuropeanArbitrage(
    currentMarks,
    costs,
    selectedFeedstockKey,
    targetCI,
    scheme,
    chainOfCustody,
    scenario,
    defaultDealVolumeMWh
  );

  // 4. Extract Top 3 Corridors & Origination Opportunities
  const topArbitrageCorridors: OriginationOpportunity[] = arbScan.topOpportunities
    .slice(0, 3)
    .map((opp, idx) => {
      const dealParams: StructuredDealParams = {
        originCountry: opp.originCountry,
        feedstock: opp.feedstockKey,
        ci: opp.carbonIntensity,
        marketId: opp.targetMarketId,
        volume: defaultDealVolumeMWh,
        scheme: opp.certificationScheme,
        coc: opp.chainOfCustody,
      };

      return {
        corridorRank: idx + 1,
        corridorId: opp.id,
        originCountry: opp.originCountry,
        originCountryName: opp.originCountryName,
        targetMarketId: opp.targetMarketId,
        targetMarketName: opp.targetMarketName,
        targetCountry: opp.targetCountry,
        feedstockKey: opp.feedstockKey,
        feedstockName: opp.feedstockName,
        carbonIntensity: opp.carbonIntensity,
        grossDeliveredValueEurPerMWh: opp.totalTerminalValueStackEurPerMWh ?? 0,
        producerProcurementEurPerMWh: opp.producerPayableEurPerMWh ?? 0,
        logisticsTariffEurPerMWh: opp.transitCostEurPerMWh ?? 0,
        deskMarginEurPerMWh: opp.deskNetMarginEurPerMWh ?? 0,
        marginPercent: opp.marginPercent ?? 0,
        annualVolumeMWh: defaultDealVolumeMWh,
        projectedDeskPnLEur: opp.totalDealProfitEur ?? 0,
        complianceVerdict: opp.overallVerdict,
        keyRiskOrTrap: opp.keyRiskOrTrap,
        structuredDealParams: dealParams,
        structuredDealUrl: formatStructuredDealUrl(dealParams),
      };
    });

  // 5. Generate Macro Headline
  const ttfMover = overnightMovers.find(m => m.instrumentId === 'TTF_GAS');
  const ttfDeltaStr = ttfMover && ttfMover.absoluteDelta !== null
    ? `${ttfMover.direction === 'UP' ? '+' : ''}${ttfMover.absoluteDelta.toFixed(2)} €/MWh (${ttfMover.percentageDelta && ttfMover.percentageDelta > 0 ? '+' : ''}${ttfMover.percentageDelta?.toFixed(1) ?? '0.0'}%)`
    : 'flat';

  let macroHeadline = `European Biomethane Desk Morning Briefing: TTF M+1 brown gas trading ${ttfDeltaStr}. `;
  if (topArbitrageCorridors.length > 0) {
    const top = topArbitrageCorridors[0];
    macroHeadline += `Top cross-border arbitrage corridor: ${top.originCountry} ${top.feedstockName} ➔ ${top.targetMarketName} delivering €${top.deskMarginEurPerMWh.toFixed(2)}/MWh desk margin.`;
  } else {
    macroHeadline += 'No active positive-margin tradeable corridors identified under current pricing.';
  }

  // 6. Generate Actionable Desk Remedies
  const topRemedies: DeskRemedy[] = [];

  if (topArbitrageCorridors.length > 0) {
    const top = topArbitrageCorridors[0];
    topRemedies.push({
      id: 'ORIGINATE_TOP_CORRIDOR',
      title: `Structure Top Corridor: ${top.originCountry} ➔ ${top.targetMarketName}`,
      description: `Capture €${top.deskMarginEurPerMWh.toFixed(2)}/MWh net margin (€${Math.round(top.projectedDeskPnLEur).toLocaleString()} projected P&L on ${Math.round(top.annualVolumeMWh / 1000)} GWh).`,
      actionLabel: '1-Click Structure Deal',
      targetRoute: top.structuredDealUrl,
      priority: 'HIGH',
    });
  }

  if (stalenessSummary.criticalCount > 0) {
    topRemedies.push({
      id: 'REFRESH_CRITICAL_MARKS',
      title: `Refresh ${stalenessSummary.criticalCount} Critically Stale Marks`,
      description: `${stalenessSummary.criticalCount} active compliance markets have marks >30 days old. Update marks with latest broker indications.`,
      actionLabel: 'Open Marks Matrix',
      targetRoute: '/marks',
      priority: 'HIGH',
    });
  } else if (stalenessSummary.warningCount > 0) {
    topRemedies.push({
      id: 'REVIEW_STALE_WARNINGS',
      title: `Review ${stalenessSummary.warningCount} Aging Marks`,
      description: `${stalenessSummary.warningCount} active markets have marks older than 7 days. Verify market consistency.`,
      actionLabel: 'Check Marks',
      targetRoute: '/marks',
      priority: 'MEDIUM',
    });
  }

  if (stalenessSummary.unfilledCount > 0) {
    topRemedies.push({
      id: 'FILL_UNENTERED_MARKS',
      title: `Enter Prices for ${stalenessSummary.unfilledCount} Unfilled Markets`,
      description: 'Active compliance markets are missing observed price marks.',
      actionLabel: 'Enter Marks',
      targetRoute: '/marks',
      priority: 'MEDIUM',
    });
  }

  return {
    generatedAt: dateStr,
    macroHeadline,
    overnightMovers,
    stalenessSummary,
    regulatoryUpdates: STATUTORY_REGULATORY_UPDATES,
    topArbitrageCorridors,
    topRemedies,
    isBaseline,
    benchmarkLabel,
  };
}
