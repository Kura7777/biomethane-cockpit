import { MARKETS, getMarketById } from '../markets/registry';
import { getMarkAgeDays, getMarkStaleness, PriceSide, MarkEntry } from '../markets/types';
import { MarksState, CostInputs } from '../netback/types';
import { scanEuropeanArbitrage, DEFAULT_WHAT_IF_SCENARIO } from '../arbitrage/engine';
import { RegulatoryWhatIfScenario } from '../arbitrage/types';
import { CertificationScheme, ChainOfCustody } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstocks';
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
 * Used when previousMarks is omitted to compute deterministic 24h market movements.
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
 */
export function formatStructuredDealUrl(params: StructuredDealParams): string {
  const query = new URLSearchParams();
  query.set('originCountry', params.originCountry);
  query.set('feedstock', params.feedstock);
  query.set('ci', params.ci.toString());
  query.set('marketId', params.marketId);
  query.set('volume', params.volume.toString());
  if (params.scheme) {
    query.set('scheme', params.scheme);
  }
  if (params.coc) {
    query.set('coc', params.coc);
  }
  if (params.counterparty) {
    query.set('counterparty', params.counterparty);
  }
  if (params.deliveryPeriod) {
    query.set('deliveryPeriod', params.deliveryPeriod);
  }
  return `/trade?${query.toString()}`;
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
 */
export function synthesizeOvernightMovers(
  currentMarks: MarksState,
  previousMarks?: MarksState | null
): OvernightPriceMover[] {
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
    provenanceSource: deMark?.provenance?.sourceName || deMark?.source || 'Argus/Broker Indication',
    observedAt: deMark?.provenance?.observedAt || deMark?.updatedAt,
    commentary: 'Compliance buyers monitoring BMUV 38. BImSchV double-counting consultation draft.',
  });

  // 3. Dutch ERE (HBE-G)
  const nlMark = currentMarks.marks['NL_ERE'];
  const nlCurrent = nlMark?.mid ?? nlMark?.bid ?? null;
  const nlPrev = previousMarks?.marks['NL_ERE']?.mid ?? previousMarks?.marks['NL_ERE']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['NL_ERE'];
  const nlMovement = calculatePriceMovement(nlCurrent, nlPrev);
  movers.push({
    instrumentId: 'NL_ERE',
    instrumentName: 'Dutch ERE (HBE-G)',
    unitOfAccount: 'EUR/kg CO2e',
    currentPrice: nlCurrent,
    previousPrice: nlPrev,
    absoluteDelta: nlMovement.absoluteDelta,
    percentageDelta: nlMovement.percentageDelta,
    direction: nlMovement.direction,
    provenanceSource: nlMark?.provenance?.sourceName || nlMark?.source || 'NEa REV Platform',
    observedAt: nlMark?.provenance?.observedAt || nlMark?.updatedAt,
    commentary: 'Dutch renewable fuel units supported by statutory annual mandate step-up.',
  });

  // 4. French CPB (Period 1)
  const frMark = currentMarks.marks['FR_CPB'];
  const frCurrent = frMark?.mid ?? frMark?.bid ?? null;
  const frPrev = previousMarks?.marks['FR_CPB']?.mid ?? previousMarks?.marks['FR_CPB']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['FR_CPB'];
  const frMovement = calculatePriceMovement(frCurrent, frPrev);
  movers.push({
    instrumentId: 'FR_CPB',
    instrumentName: 'French CPB (Period 1)',
    unitOfAccount: 'EUR/MWh',
    currentPrice: frCurrent,
    previousPrice: frPrev,
    absoluteDelta: frMovement.absoluteDelta,
    percentageDelta: frMovement.percentageDelta,
    direction: frMovement.direction,
    provenanceSource: frMark?.provenance?.sourceName || frMark?.source || 'EEX Monthly Auction',
    observedAt: frMark?.provenance?.observedAt || frMark?.updatedAt,
    commentary: 'Auction bids constrained beneath statutory €100.00/MWh penalty ceiling.',
  });

  // 5. Italian CIC
  const itMark = currentMarks.marks['IT_CIC'];
  const itCurrent = itMark?.mid ?? itMark?.bid ?? null;
  const itPrev = previousMarks?.marks['IT_CIC']?.mid ?? previousMarks?.marks['IT_CIC']?.bid ?? DEFAULT_PRIOR_CLOSE_MARKS.marks['IT_CIC'];
  const itMovement = calculatePriceMovement(itCurrent, itPrev);
  movers.push({
    instrumentId: 'IT_CIC',
    instrumentName: 'Italian CIC Advanced',
    unitOfAccount: 'EUR/CIC',
    currentPrice: itCurrent,
    previousPrice: itPrev,
    absoluteDelta: itMovement.absoluteDelta,
    percentageDelta: itMovement.percentageDelta,
    direction: itMovement.direction,
    provenanceSource: itMark?.provenance?.sourceName || itMark?.source || 'GSE Platform/Broker',
    observedAt: itMark?.provenance?.observedAt || itMark?.updatedAt,
    commentary: 'Advanced biomethane certificates trading at firm premium for transport quota surrender.',
  });

  // 6. UK RTFO (dRTFC)
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
    provenanceSource: ukMark?.provenance?.sourceName || ukMark?.source || 'Argus Biofuels UK',
    observedAt: ukMark?.provenance?.observedAt || ukMark?.updatedAt,
    commentary: 'UK certificates steady with DfT compliance buyout penalty providing floor support.',
  });

  // 7. FX GBP/EUR
  const gbpCurrent = currentMarks.fx.gbpEur;
  const gbpPrev = previousMarks?.fx.gbpEur ?? DEFAULT_PRIOR_CLOSE_MARKS.fx.gbpEur;
  const gbpMovement = calculatePriceMovement(gbpCurrent, gbpPrev);
  movers.push({
    instrumentId: 'FX_GBP_EUR',
    instrumentName: 'GBP / EUR FX Rate',
    unitOfAccount: 'EUR',
    currentPrice: gbpCurrent,
    previousPrice: gbpPrev,
    absoluteDelta: gbpMovement.absoluteDelta,
    percentageDelta: gbpMovement.percentageDelta,
    direction: gbpMovement.direction,
    provenanceSource: currentMarks.fx.provenance?.sourceName || 'ECB Reference Rate',
    observedAt: currentMarks.fx.provenance?.observedAt || currentMarks.fx.updatedAt,
    commentary: 'Macro cross influencing UK dRTFC parity in European terms.',
  });

  return movers;
}

/**
 * Evaluates mark freshness and generates staleness breakdown alerts.
 */
export function evaluateMarkStaleness(currentMarks: MarksState): StalenessSummary {
  const activeMarkets = MARKETS.filter(m => m.status === 'ACTIVE');
  const alerts: MarkStalenessAlert[] = [];

  let freshCount = 0;
  let warningCount = 0;
  let criticalCount = 0;
  let unfilledCount = 0;

  for (const market of activeMarkets) {
    const markEntry = currentMarks.marks[market.id];
    const ageDays = getMarkAgeDays(markEntry);
    const stalenessStatus = getMarkStaleness(markEntry);
    const currentMid = markEntry?.mid ?? markEntry?.bid ?? null;

    let recommendation = 'Mark is fresh (<7d) and ready for commercial valuation.';
    if (stalenessStatus === 'UNFILLED' || currentMid === null) {
      unfilledCount++;
      recommendation = 'Mark unfilled — obtain active broker or exchange quotes.';
    } else if (stalenessStatus === 'STALE_CRITICAL') {
      criticalCount++;
      recommendation = `Critically stale (${ageDays}d old) — refresh quote before submitting firm term sheet.`;
    } else if (stalenessStatus === 'STALE_WARNING') {
      warningCount++;
      recommendation = `Mark is ${ageDays}d old — verify with recent broker indication.`;
    } else {
      freshCount++;
    }

    alerts.push({
      marketId: market.id,
      marketName: market.name,
      unitLabel: market.unitLabel,
      currentMid,
      stalenessStatus,
      ageDays,
      sourceType: markEntry?.provenance?.sourceType || null,
      sourceName: markEntry?.provenance?.sourceName || markEntry?.source || null,
      observedAt: markEntry?.provenance?.observedAt || markEntry?.updatedAt || null,
      recommendation,
    });
  }

  return {
    freshCount,
    warningCount,
    criticalCount,
    unfilledCount,
    totalTracked: activeMarkets.length,
    alerts,
  };
}

/**
 * Statutory regulatory consultation updates tracker.
 */
export const STATUTORY_REGULATORY_UPDATES: RegulatoryConsultationUpdate[] = [
  {
    id: 'DE_38_BIMSCHV_DOUBLE_COUNTING',
    jurisdiction: 'Germany',
    jurisdictionCode: 'DE',
    title: '38. BImSchV Double-Counting Revision & Upstream Cap',
    legalBasis: '38. BImSchV §5 / §37a BImSchG (BMUV Draft)',
    status: 'CONSULTATION_OPEN',
    statusBadge: 'Consultation Draft',
    effectiveDate: '2026-01-01',
    summaryExcerpt: 'Draft ordinance proposing to phase out double-counting multiplier for uncertified non-EU origins and tighten Annex IX-A verification requirements.',
    tradingDeskImpact: 'Risk of THG certificate value reduction from 2.0x to 1.0x on non-compliant consignments. Test all German deals against DC_OFF branch.',
    impactLevel: 'HIGH',
    affectedMarkets: ['DE_THG'],
  },
  {
    id: 'UK_EU_UDB_MUTUAL_RECOGNITION',
    jurisdiction: 'United Kingdom / EU',
    jurisdictionCode: 'GB',
    title: 'UK GGCS/RTFO - EU Union Database (UDB) Mutual Recognition',
    legalBasis: 'RED III Art. 31a / Reg (EU) 2024/2792 Interconnection Accord',
    status: 'UNDER_NEGOTIATION',
    statusBadge: 'Bilateral Talks',
    effectiveDate: '2026-06-30',
    summaryExcerpt: 'Bilateral technical talks between UK DESNZ and European Commission regarding mass balance title transfer equivalence into the EU Union Database.',
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
    defaultDealVolumeMWh = 120000,
    asOfDate = new Date(),
  } = params;

  const dateStr = typeof asOfDate === 'string' ? asOfDate : asOfDate.toISOString();

  // 1. Overnight Movers
  const overnightMovers = synthesizeOvernightMovers(currentMarks, previousMarks);

  // 2. Mark Staleness
  const stalenessSummary = evaluateMarkStaleness(currentMarks);

  // 3. Scan Arbitrage Corridors
  const feedstockInfo = FEEDSTOCK_REGISTRY[selectedFeedstockKey] || FEEDSTOCK_REGISTRY.manure;
  const targetCI = ciOverride ?? feedstockInfo.defaultCI;

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
  };
}
