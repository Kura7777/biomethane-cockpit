import React, { useMemo, useEffect } from 'react';
import { MARKETS, getMarketById } from '../../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../../domain/consignment/feedstocks';
import { Consignment, AnnexClassification, UDBStatus } from '../../../domain/consignment/types';
import { evaluateEligibility } from '../../../domain/eligibility/engine';
import { computeNetback, selectMarkPrice } from '../../../domain/netback/engine';
import { computeGgeBreakdown } from '../../../domain/netback/gge';
import { ProducerPricing, CostInputs } from '../../../domain/netback/types';
import { certificateMarkSlope } from '../../../domain/netback/headroom';
import { getRouteTransitTariff } from '../../../domain/arbitrage/origins';
import { TradeAssessment } from '../../../domain/trade/types';
import { SIMULATED_SOURCE_NAME } from '../../../domain/marks/simulate';
import { deriveSourceBadge } from '../../../domain/markets/types';
import { useAssumptionsVersion } from '../../../shared/hooks/useAssumptionsVersion';
import { BestRouteEntry, SensitivityDeltas } from '../DealTicket';
import { computeGateBadge, computeBreakEvenMark, isLinearMarkUnit } from '../ticketMath';
import { WaterfallRow } from '../steps/TradeEconomicsStep';
import { ORIGINS, FEEDSTOCKS, getVtpForMarket } from '../options';
import { AppState, AppAction } from '../../../store/state';
import { useDealInputs } from './useDealInputs';

export function useDealPricing(
  dealInputs: ReturnType<typeof useDealInputs>,
  state: AppState,
  dispatch: React.Dispatch<AppAction>
) {
  const {
    deal,
    linkedPlant,
    dealId,
    origin,
    feedstockKey,
    scheme,
    chainOfCustody,
    udbStatus,
    posStatus,
    ci,
    ciSource,
    marketId,
    volumeMwh,
    plantCommittedMwh,
    plantTotalMWh,
    custody,
    schedule,
  } = dealInputs;

  const selectedMarket = useMemo(() => getMarketById(marketId) || MARKETS[0], [marketId]);

  const statutorySurrenderDeadline = selectedMarket.country === 'GB'
    ? `${schedule.complianceYear + 1}-04-30`
    : `${schedule.complianceYear + 1}-02-28`;

  const monthlyRateMwh = Math.round(volumeMwh / 12);
  const dailyRateMwh = Number((volumeMwh / 365).toFixed(1));

  const availablePlantCapacity = plantTotalMWh !== null ? Math.max(0, plantTotalMWh - plantCommittedMwh) : null;
  const isOversubscribed = availablePlantCapacity !== null && volumeMwh > availablePlantCapacity;
  const plantCommittedPct = plantTotalMWh !== null && plantTotalMWh > 0
    ? Math.min(100, Math.round(((volumeMwh + plantCommittedMwh) / plantTotalMWh) * 100))
    : null;

  const isNonEuOrigin = origin === 'GB' || origin === 'CH' || origin === 'NO';
  const effectiveUdbStatus: UDBStatus = isNonEuOrigin ? 'NOT_RECORDED' : udbStatus;

  const consignment: Consignment = useMemo(() => {
    const originObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
    const regFeedstock = FEEDSTOCK_REGISTRY[feedstockKey];
    // Never relabel an unlisted feedstock as the first list entry (manure) — fall back to the registry name.
    const feedObj = FEEDSTOCKS.find(f => f.key === feedstockKey)
      ?? { key: feedstockKey, label: regFeedstock?.name ?? feedstockKey, defaultCI: regFeedstock?.defaultCI ?? 0, hint: '' };
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
      udbStatus: effectiveUdbStatus,
      posStatus,
      volumeMWh: volumeMwh,
      deliveryPeriod: {
        type: schedule.vintagePreset === 'CUSTOM' ? 'CUSTOM' : schedule.vintagePreset.startsWith('Q') ? 'QUARTER' : 'CALENDAR',
        startDate: schedule.deliveryStartDate,
        endDate: schedule.deliveryEndDate,
        complianceYear: schedule.complianceYear,
        productionStartDate: schedule.prodStartDate,
        productionEndDate: schedule.prodEndDate,
        deliveryProfile: schedule.deliveryProfile,
        deliveryPointVtp: getVtpForMarket(selectedMarket.country),
        statutorySurrenderDeadline,
        plantTotalCapacityMWh: plantTotalMWh,
        plantCommittedVolumeMWh: plantCommittedMwh,
      },
      counterparty: deal.counterparty || deal.legalEntityName || linkedPlant?.legalEntityName || linkedPlant?.operator || null,
      custody,
    };
  }, [
    origin,
    feedstockKey,
    scheme,
    chainOfCustody,
    effectiveUdbStatus,
    posStatus,
    ci,
    volumeMwh,
    schedule.deliveryStartDate,
    schedule.deliveryEndDate,
    schedule.complianceYear,
    schedule.prodStartDate,
    schedule.prodEndDate,
    schedule.deliveryProfile,
    schedule.vintagePreset,
    selectedMarket,
    statutorySurrenderDeadline,
    deal,
    linkedPlant,
    plantTotalMWh,
    plantCommittedMwh,
    custody,
  ]);

  // Eligibility evaluation
  const assessment = useMemo(() => {
    return evaluateEligibility(consignment, selectedMarket);
  }, [consignment, selectedMarket]);

  // Corridor transit tariff: the same `getRouteTransitTariff` rule Origination's engine uses
  // (src/domain/arbitrage/engine.ts's `routeCosts`), so the two screens price the same
  // origin→market leg identically. Only `logistics` is replaced — transfer and other costs
  // are real desk costs and stay as entered. Falls back to the desk's generic logistics cost
  // when the corridor has no tariff.
  const costsForMarket = React.useCallback(
    (market: typeof selectedMarket): { costs: CostInputs; isCorridor: boolean; corridorTariff: number | null } => {
      const corridorTariff = origin && market.country ? getRouteTransitTariff(origin, market.country) : null;
      if (corridorTariff != null) {
        return {
          costs: { ...state.costs, logistics: corridorTariff },
          isCorridor: true,
          corridorTariff,
        };
      }
      return { costs: state.costs, isCorridor: false, corridorTariff: null };
    },
    [origin, state.costs]
  );
  const routeCostInfo = useMemo(() => costsForMarket(selectedMarket), [costsForMarket, selectedMarket]);
  const routeCosts = routeCostInfo.costs;

  // Netback calculation (recomputes when a commercial assumption changes)
  const assumptionsVersion = useAssumptionsVersion();
  const netback = useMemo(() => {
    return computeNetback(
      selectedMarket,
      consignment,
      state.marks,
      routeCosts,
      state.marks.pricingSides
    );
  }, [consignment, selectedMarket, state.marks, routeCosts, assumptionsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  // Deal ticket: headroom (bundle-capped markets) — the mark at which the modelled netback
  // would fall to the realisable cap, for certificate markets whose value is linear in the mark.
  const currentMark = selectMarkPrice(state.marks.marks[selectedMarket.id], state.marks.pricingSides.certificateSide);
  const certK = isLinearMarkUnit(selectedMarket.unitOfAccount) ? certificateMarkSlope(netback, currentMark) : null;
  const breakEvenMark = netback.netbackCappedAt != null
    ? computeBreakEvenMark(currentMark, certK, netback.theoreticalNetback ?? null, netback.netbackCappedAt)
    : null;

  // NL GGE: the numbers behind the green-gas value for the ticket's GGE line (null for every other market).
  const gge = selectedMarket.requiresGoAndPos && currentMark != null
    ? computeGgeBreakdown(selectedMarket, consignment, currentMark)
    : null;

  // Deal ticket: sensitivities — only modelled when the market isn't bundle-capped (headroom
  // text takes over there instead). Re-runs the existing engine with bumped inputs; no new
  // pricing formulas live here.
  const ticketSensitivities: SensitivityDeltas | null = useMemo(() => {
    if (netback.netbackCappedAt != null) return null;
    const base = netback.netNetback;
    if (base === null) return null;

    const bumpMark = (pct: number) => {
      const orig = state.marks.marks[selectedMarket.id];
      if (!orig) return null;
      const bumped = {
        ...orig,
        bid: orig.bid != null ? orig.bid * (1 + pct) : orig.bid,
        offer: orig.offer != null ? orig.offer * (1 + pct) : orig.offer,
        mid: orig.mid != null ? orig.mid * (1 + pct) : orig.mid,
      };
      const bumpedMarks = { ...state.marks, marks: { ...state.marks.marks, [selectedMarket.id]: bumped } };
      return computeNetback(selectedMarket, consignment, bumpedMarks, routeCosts, state.marks.pricingSides).netNetback;
    };
    const bumpTtf = (delta: number) => {
      const gi = state.marks.gasIndex;
      const bumped = {
        ...gi,
        bid: gi.bid != null ? gi.bid + delta : gi.bid,
        offer: gi.offer != null ? gi.offer + delta : gi.offer,
        mid: gi.mid != null ? gi.mid + delta : gi.mid,
      };
      const bumpedMarks = { ...state.marks, gasIndex: bumped };
      return computeNetback(selectedMarket, consignment, bumpedMarks, routeCosts, state.marks.pricingSides).netNetback;
    };
    const bumpCi = (delta: number) => {
      const bumpedConsignment = { ...consignment, carbonIntensity: consignment.carbonIntensity + delta };
      return computeNetback(selectedMarket, bumpedConsignment, state.marks, routeCosts, state.marks.pricingSides).netNetback;
    };
    const delta = (v: number | null) => (v === null ? null : Number((v - base).toFixed(2)));

    return {
      markUp: delta(bumpMark(0.10)),
      markDown: delta(bumpMark(-0.10)),
      ttfUp: delta(bumpTtf(2)),
      ttfDown: delta(bumpTtf(-2)),
      ciUp: delta(bumpCi(10)),
      ciDown: delta(bumpCi(-10)),
    };
  }, [netback, consignment, selectedMarket, state.marks, routeCosts]);

  // Deal ticket: best route — realisable netback in every other active market, using the same
  // engine and eligibility function this screen already uses, excluding hard blocks. Each
  // candidate market prices its own origin→market corridor leg, same as Origination's scan.
  const bestRoutes: BestRouteEntry[] = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity -- debug timing measurement in non-production environment
    const t0 = process.env.NODE_ENV !== 'production' ? performance.now() : 0;
    const results = MARKETS
      .filter(m => m.status === 'ACTIVE' && m.id !== selectedMarket.id)
      .map(m => {
        const a = evaluateEligibility(consignment, m);
        if (a.overallVerdict === 'HARD_BLOCK') return null;
        const nb = computeNetback(m, consignment, state.marks, costsForMarket(m).costs, state.marks.pricingSides);
        if (nb.netNetback === null) return null;
        return { marketId: m.id, marketName: m.name, netNetback: nb.netNetback, verdict: a.overallVerdict, bundleChecked: nb.bundleReferenceEurPerMwh != null } as BestRouteEntry;
      })
      .filter((r): r is BestRouteEntry => r !== null)
      .sort((a, b) => (b.netNetback ?? -Infinity) - (a.netNetback ?? -Infinity))
      .slice(0, 3);
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line react-hooks/purity -- debug log in non-production
      console.log(`[DealTicket] best-route recompute: ${(performance.now() - t0).toFixed(1)}ms`);
    }
    return results;
  }, [consignment, selectedMarket, state.marks, costsForMarket]);

  const handleProducerPricingChange = (patch: Partial<ProducerPricing>) => {
    const current = state.costs.producerPricing;
    dispatch({
      type: 'SET_COSTS',
      costs: {
        producerPricing: {
          mode: current?.mode ?? 'INDEX_LINKED',
          fixedPriceEurPerMwh: current?.fixedPriceEurPerMwh ?? null,
          indexLinkedShare: current?.indexLinkedShare ?? null,
          source: current?.source ?? null,
          lastVerified: current?.lastVerified ?? null,
          confidence: current?.confidence ?? 'UNVERIFIED',
          ...patch,
        },
      },
    });
  };

  // GHG savings % uses the market's own comparator when it sets one (NL GGE: 80), else the sector's:
  // Heat/Industrial (EU_ETS, DE_GO, NL_GO, FR_GO, VOL_SCOPE1) → 80 gCO₂e/MJ comparator (RED III Art. 29(10) heat)
  // Transport/Maritime/RTFO → 94 gCO₂e/MJ comparator (RED III Art. 29(10) transport)
  const ghgComparator = selectedMarket.fossilComparatorGCo2eMj
    ?? (['EU_ETS_INDUSTRIAL', 'DE_GO', 'NL_GO', 'FR_GO', 'VOL_SCOPE1', 'UK_RGGO'].includes(selectedMarket.id) ? 80.0 : 94.0);
  const ghgSavingPct = Math.round(((ghgComparator - ci) / ghgComparator) * 100);
  const currentSide = state.marks.pricingSides?.certificateSide || 'mid';

  // Waterfall rows: Leg 1 value stack to Net Netback, then Producer Payable to Desk Margin
  const certVal = netback.certificateValue?.valueEurPerMWh ?? 0;
  const molVal = netback.moleculeValue ?? (state.marks.gasIndex.mid ?? 0);
  const transferCost = routeCosts.transferCosts ?? 0;
  const certCost = state.costs.certificationCosts ?? 0;
  const transitCost = routeCosts.logistics ?? 0;
  const transitLabel = routeCostInfo.isCorridor
    ? `Corridor transit ${origin}→${selectedMarket.country} €${transitCost.toFixed(2)}/MWh`
    : 'generic logistics cost (no corridor tariff)';
  const otherCost = routeCosts.otherCosts ?? 0;
  const netNetbackVal = netback.netNetback ?? 0;
  const producerPayable = netback.producerPayable;
  const deskMarginVal = netback.deskMargin;

  const vtpLabel = getVtpForMarket(selectedMarket.country);

  // The TTF/gas index mark that feeds the molecule value leg — same provenance check the
  // Marks screen and header use to raise the "running on simulated marks" signal.
  const gasIndexProvenance = state.marks.gasIndex.provenance;
  // Source and observation date of the selected market's own mark, so the ticket shows what it prices from.
  const marketMarkProvenance = state.marks.marks[selectedMarket.id]?.provenance;
  const marketMarkBadge = deriveSourceBadge(marketMarkProvenance, SIMULATED_SOURCE_NAME);
  const markSourceLabel = marketMarkProvenance?.sourceType
    ? `${marketMarkBadge.label}${marketMarkProvenance.observedAt ? ` · observed ${marketMarkProvenance.observedAt.slice(0, 10)}` : ''}`
    : null;
  const isTtfSimulated = gasIndexProvenance?.sourceName === SIMULATED_SOURCE_NAME || gasIndexProvenance?.sourceType === 'ESTIMATE';

  const waterfallMax = Math.max(
    certVal, 
    molVal, 
    Math.abs(netNetbackVal), 
    producerPayable ?? 0, 
    Math.abs(deskMarginVal ?? 0), 
    1
  );
  const waterfallRows: WaterfallRow[] = [
    { label: 'Certificate value', val: `+${certVal.toFixed(2)}`, num: certVal, kind: 'add' },
    { label: `Molecule value (${vtpLabel})`, val: `+${molVal.toFixed(2)}`, num: molVal, kind: 'add' },
    { label: 'Transfer & registry', val: `−${transferCost.toFixed(2)}`, num: transferCost, kind: 'sub' },
    { label: 'Certification', val: `−${certCost.toFixed(2)}`, num: certCost, kind: 'sub' },
    { label: transitLabel, val: `−${transitCost.toFixed(2)}`, num: transitCost, kind: 'sub' },
    ...(otherCost > 0 ? [{ label: 'Other costs', val: `−${otherCost.toFixed(2)}`, num: otherCost, kind: 'sub' as const }] : []),
    // Route-specific costs the engine added (NL GGE: GO export / import fees, TTF spread for structure B), so the waterfall adds up.
    ...(netback.routeCostLines ?? []).map(l => ({ label: l.label, val: `−${l.eurPerMwh.toFixed(2)}`, num: l.eurPerMwh, kind: 'sub' as const })),
    // Realisable cap: the market pays the traded bundle, not the full modelled value.
    ...(netback.netbackCappedAt != null && netback.theoreticalNetback != null ? [{ label: 'Bundle cap (not captured)', val: `−${(netback.theoreticalNetback - netNetbackVal).toFixed(2)}`, num: netback.theoreticalNetback - netNetbackVal, kind: 'sub' as const }] : []),
    { label: 'Net netback', val: `${netNetbackVal >= 0 ? '+' : '−'}${Math.abs(netNetbackVal).toFixed(2)}`, num: Math.abs(netNetbackVal), kind: 'net' },
    ...(producerPayable !== null ? [
      { label: 'Producer payable', val: `−${producerPayable.toFixed(2)}`, num: producerPayable, kind: 'sub' as const },
      { label: 'Desk margin', val: `${(deskMarginVal ?? 0) >= 0 ? '+' : '−'}${Math.abs(deskMarginVal ?? 0).toFixed(2)}`, num: Math.abs(deskMarginVal ?? 0), kind: 'margin' as const },
    ] : []),
  ];

  // Gross deal value = certificate value + molecule value (both legs)
  const grossTotal = Math.round((certVal + molVal) * volumeMwh);
  const deskMarginEurMwh = (netback.deskMargin ?? 0).toFixed(2);
  const annualPnl = Math.round((netback.deskMargin ?? 0) * volumeMwh);

  const currentTradeAssessment: TradeAssessment = useMemo(() => ({
    id: dealId,
    createdAt: new Date().toISOString(),
    consignment,
    targetMarketId: selectedMarket.id,
    targetMarketName: selectedMarket.name,
    eligibility: assessment,
    netback,
    marks: state.marks,
    costs: routeCosts,
    userNotes: deal.plantName ? `Physical asset sourcing from ${deal.plantName}` : 'Trade Builder Assessment',
  }), [dealId, deal, selectedMarket, consignment, assessment, netback, state.marks, routeCosts]);

  // Continuously sync active trade builder deal state to global window for the Auditor
  useEffect(() => {
    const currentDealPayload = {
      originCountry: origin,
      originPlantId: linkedPlant?.id || deal.plantId || `${origin}-CUSTOM`,
      plantName: linkedPlant?.name || deal.plantName || `${origin} Biomethane Production Asset`,
      annualVolumeMWh: volumeMwh,
      targetMarketId: marketId,
      targetMarketName: selectedMarket?.name || marketId,
      feedstockCategory: FEEDSTOCKS.find(f => f.key === feedstockKey)?.label || feedstockKey,
      carbonIntensity: ci,
      deliveredValueEurMwh: netback.netNetback ?? (molVal + certVal),
    };
    (window as unknown as { __ACTIVE_TRADE_BUILDER_DEAL__: unknown }).__ACTIVE_TRADE_BUILDER_DEAL__ = currentDealPayload;
    window.dispatchEvent(new CustomEvent('trade-builder-deal-updated', { detail: currentDealPayload }));
  }, [origin, marketId, feedstockKey, ci, volumeMwh, linkedPlant, deal, selectedMarket, netback, molVal, certVal]);

  const failingGates = assessment.gates.filter(g => g.verdict !== 'PASS');
  // The one chain-of-custody gate; its checklist is what the trader works through.
  const cocGate = assessment.gates.find(g => g.gate === 'CHAIN_OF_CUSTODY');
  const headerGateBadge = computeGateBadge(assessment.gates, assessment.overallVerdict);
  const blockedBadgeTitle = failingGates
    .map(g => `${g.gateLabel}: ${g.reason}`)
    .join('\n');

  // Same CI-source classification the step 1 chip uses (deal.ciIsEstimated / linkedPlant / ciSource) —
  // the ticket reuses it rather than deriving its own.
  const ciProvenance: 'pos' | 'estimated' | null =
    ciSource === 'pos' ? 'pos' : ciSource !== 'manual' && (ciSource === 'estimate' || deal.ciIsEstimated || linkedPlant) ? 'estimated' : null;

  // "Origin → market" label for the deal ticket header, e.g. "DK → Germany THG" — country prefix
  // stripped from the market short name the same way the market directory chips do.
  const marketShortNameNoPrefix = selectedMarket.shortName.startsWith(`${selectedMarket.country} `)
    ? selectedMarket.shortName.slice(selectedMarket.country.length + 1)
    : selectedMarket.shortName;
  const ticketMarketLabel = `${selectedMarket.countryName} ${marketShortNameNoPrefix}`;

  return {
    selectedMarket,
    statutorySurrenderDeadline,
    monthlyRateMwh,
    dailyRateMwh,
    availablePlantCapacity,
    isOversubscribed,
    plantCommittedPct,
    isNonEuOrigin,
    effectiveUdbStatus,
    consignment,
    assessment,
    costsForMarket,
    routeCostInfo,
    routeCosts,
    netback,
    currentMark,
    certK,
    breakEvenMark,
    ticketSensitivities,
    bestRoutes,
    handleProducerPricingChange,
    ghgComparator,
    ghgSavingPct,
    currentSide,
    waterfallRows,
    waterfallMax,
    grossTotal,
    deskMarginEurMwh,
    annualPnl,
    currentTradeAssessment,
    failingGates,
    cocGate,
    gge,
    headerGateBadge,
    blockedBadgeTitle,
    ciProvenance,
    ticketMarketLabel,
    vtpLabel,
    certVal,
    molVal,
    netNetbackVal,
    isTtfSimulated,
    markSourceLabel,
    transitLabel,
  };
}
