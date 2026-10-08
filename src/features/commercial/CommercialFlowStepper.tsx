import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { findPlantsForOrigination, getVerifiedPlantCoordinates } from '../../domain/plants/registry';
import { SourcedOpportunity } from './PlantScannerTable';
import { Step1OrderIntake } from './Step1OrderIntake';
import { Step2PlantScan } from './Step2PlantScan';
import { Step3RouteAndCosts } from './Step3RouteAndCosts';
import { Step4DealSummary } from './Step4DealSummary';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
import { parseOriginationUrl, OriginationUrlParams } from './originationUrl';
import { MARKETS } from '../../domain/markets/registry';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import './commercialMobile.css';
import { Check, ArrowRight, Sparkles, Building2, TrendingUp, Navigation } from 'lucide-react';

const INITIAL_REQUEST: ClientRequest = {
  feedstockKey: 'manure',
  targetMarketId: 'DE_THG',
  scheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  delivery: {
    type: 'MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    complianceYear: 2026,
  },
  volumeMwh: 10000,
  constraints: {
    maxCarbonIntensity: null,
    maxDeliveredCostEurMwh: null,
    physicalDeliveryRequired: false,
  },
  counterparty: null,
  notes: null,
  ciOverride: null,
};

/**
 * Builds Step 1's starting request from a hand-off (Corporate, Clients, ETS1/2, FuelEU). Any field
 * the hand-off didn't carry, or carried a value the registries don't recognise, falls back to
 * `INITIAL_REQUEST` — never a fabricated default of its own.
 */
export function buildInitialRequestFromParams(params: OriginationUrlParams): ClientRequest {
  const request: ClientRequest = { ...INITIAL_REQUEST, constraints: { ...INITIAL_REQUEST.constraints } };

  if (params.market && MARKETS.some(m => m.id === params.market)) {
    request.targetMarketId = params.market;
  }
  if (params.feedstock && params.feedstock in FEEDSTOCK_REGISTRY) {
    request.feedstockKey = params.feedstock;
  }
  if (params.mwh !== undefined) {
    request.volumeMwh = params.mwh;
  }
  if (params.maxCi !== undefined) {
    request.constraints.maxCarbonIntensity = params.maxCi;
  }
  if (params.buyer) {
    request.counterparty = params.buyer;
  }

  return request;
}

/** Pure helper behind the Step 1 CI override: replaces every opportunity's own CI when set. */
export function applyCiOverride(opps: SourcedOpportunity[], ciOverride: number | null | undefined): SourcedOpportunity[] {
  if (ciOverride === null || ciOverride === undefined || Number.isNaN(ciOverride)) return opps;
  return opps.map(opp => ({ ...opp, carbonIntensity: ciOverride, ciIsOverridden: true }));
}

const STEPS = [
  { step: 1, title: '1. Order Intake', desc: 'Enter order specs' },
  { step: 2, title: '2. Sourced Plants', desc: 'Scan 1,975+ facilities' },
  { step: 3, title: '3. Route & Costs', desc: 'Corridor map & pricing' },
  { step: 4, title: '4. Deal Summary', desc: 'Indicative term sheet' },
];

export function CommercialFlowStepper() {
  const { state } = useAppState();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [request, setRequest] = useState<ClientRequest>(() => buildInitialRequestFromParams(parseOriginationUrl(searchParams)));
  const [selectedOpp, setSelectedOpp] = useState<SourcedOpportunity | null>(null);

  // Scan opportunities in real-time
  const searchResult = useMemo(() => {
    return searchSourcingRoutes(request, state.marks, state.costs, DEFAULT_WHAT_IF_SCENARIO);
  }, [request, state.marks, state.costs]);

  // Enrich with 1,975+ plants
  const opportunities: SourcedOpportunity[] = useMemo(() => {
    const rawOpps = searchResult.tradeable;
    if (rawOpps.length === 0) return [];

    const plantOpps: SourcedOpportunity[] = [];

    for (const opp of rawOpps) {
      const countryPlants = findPlantsForOrigination(opp.originCountry, opp.feedstockKey);

      if (countryPlants.length > 0) {
        // Provide top matching plants for each tradeable origin corridor
        countryPlants.forEach((p, idx) => {
          const route = calculateLogisticsRoute(opp.originCountry, opp.targetCountry);
          const distanceKm = route.distanceKm ?? 0;
          const plantAnnualGWh = p.annualEnergyGWh ?? null;
          const plantCapacityNm3h = p.capacityNm3h ?? null;

          plantOpps.push({
            ...opp,
            id: `${opp.id}_${p.id || idx}`,
            originPlantId: p.id,
            originPlantName: p.name,
            originPlantCoords: getVerifiedPlantCoordinates(p),
            isDirectPlantSource: true,
            isPlantVerified: Boolean(p.isVerified),
            logisticsDistanceKm: distanceKm,
            deliveryMode: 'PIPELINE_GRID',
            plantCapacityNm3h,
            plantAnnualGWh,
            legalEntityName: p.legalEntityName || p.operator || p.operatingCompany || null,
            networkOperator: p.networkOperator || null,
            contactEmail: p.contactEmail || null,
            contactPhone: p.contactPhone || null,
            gridConnectionType: p.gridConnectionType || null,
          });
        });
      } else {
        const route = calculateLogisticsRoute(opp.originCountry, opp.targetCountry);
        plantOpps.push({
          ...opp,
          originPlantName: `${opp.originCountry} origin — no registry plant matched for ${opp.feedstockName}`,
          originPlantCoords: null,
          isDirectPlantSource: false,
          logisticsDistanceKm: route.distanceKm ?? 0,
          deliveryMode: 'PIPELINE_GRID',
        });
      }
    }

    return applyCiOverride(plantOpps, request.ciOverride);
  }, [searchResult.tradeable, request.ciOverride]);

  // How many plants behind the excluded origin x feedstock corridors, for Step 2's "excluded" count.
  const excludedPlantCount = useMemo(() => {
    return searchResult.excludedOriginFeedstocks.reduce(
      (sum, { originCountry, feedstockKey }) => sum + findPlantsForOrigination(originCountry, feedstockKey).length,
      0
    );
  }, [searchResult.excludedOriginFeedstocks]);

  // Automatically select top plant if none chosen
  const activeOpp = useMemo(() => {
    if (selectedOpp && opportunities.some(o => o.id === selectedOpp.id)) {
      return selectedOpp;
    }
    return opportunities[0] || null;
  }, [selectedOpp, opportunities]);

  const handleReset = () => {
    setRequest(INITIAL_REQUEST);
    setSelectedOpp(null);
    setCurrentStep(1);
  };

  return (
    <div className="cf-root flex-1 flex flex-col overflow-y-auto max-md:overflow-y-visible max-md:min-h-0 bg-slate-100 [.dark_&]:bg-[#08090d] text-slate-900 [.dark_&]:text-zinc-100 min-h-screen">
      {/* Sleek Step Progress Indicator Bar */}
      <div className="bg-white [.dark_&]:bg-[#0e1118] border-b border-slate-200 [.dark_&]:border-[#1e2433] px-4 py-3.5 sticky top-0 z-30 shadow-xs">
        {/* Mobile: compact "Step N of 4 · Name" line with a progress bar (same pattern as FlowSteps) */}
        <div className="md:hidden" data-testid="cf-mobile-progress">
          <div className="ds-flow-mobile-head">
            <span className="ds-flow-mobile-step num">Step {currentStep} of {STEPS.length}</span>
            <span className="ds-flow-mobile-sep" aria-hidden="true">·</span>
            <span className="ds-flow-mobile-label">{STEPS[currentStep - 1].title.replace(/^\d\.\s*/, '')}</span>
          </div>
          <div className="ds-flow-mobile-track">
            <div className="ds-flow-mobile-fill" style={{ width: `${(currentStep / STEPS.length) * 100}%` }} />
          </div>
        </div>
        <div className="max-w-6xl mx-auto flex items-center justify-between max-md:hidden">
          {STEPS.map((s, idx) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;

            return (
              <React.Fragment key={s.step}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.step < currentStep) setCurrentStep(s.step as any);
                  }}
                  disabled={s.step > currentStep}
                  className={`flex items-center gap-2.5 transition-all text-left ${
                    s.step < currentStep ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Step Number Circle */}
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 ${
                      isDone
                        ? 'bg-[var(--color-status-pos-text)] text-white [.dark_&]:text-stone-950'
                        : isCurrent
                        ? 'bg-[var(--color-text)] text-[var(--color-bg)] border-2 border-[var(--color-text)]'
                        : 'bg-[var(--color-subtier)] text-[var(--color-muted)] border border-[var(--color-divider)]'
                    }`}
                  >
                    {isDone ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : s.step}
                  </div>

                  {/* Step Text */}
                  <div className="hidden sm:block">
                    <span
                      className={`text-xs font-medium block ${
                        isCurrent
                          ? 'text-[var(--color-text)]'
                          : isDone
                          ? 'text-[var(--color-text)]'
                          : 'text-[var(--color-muted)]'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="text-[11px] text-[var(--color-muted)] block">
                      {s.desc}
                    </span>
                  </div>
                </button>

                {/* Arrow Divider between steps */}
                {idx < STEPS.length - 1 && (
                  <div className="w-8 md:w-16 h-[1px] bg-[var(--color-divider)] shrink-0 mx-1">
                    <div
                      className={`h-full bg-[var(--color-text)] transition-all duration-300 ${
                        currentStep > s.step ? 'w-full' : 'w-0'
                      }`}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Step Content */}
      <div className="flex-1">
        {currentStep === 1 && (
          <Step1OrderIntake
            request={request}
            onChange={updated => setRequest(prev => ({ ...prev, ...updated }))}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <Step2PlantScan
            opportunities={opportunities}
            selectedOpp={activeOpp}
            onSelectOpp={opp => setSelectedOpp(opp)}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
            excludedPlantCount={excludedPlantCount}
            maxCarbonIntensity={request.constraints.maxCarbonIntensity}
          />
        )}

        {currentStep === 3 && activeOpp && (
          <Step3RouteAndCosts
            request={request}
            opportunity={activeOpp}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && activeOpp && (
          <Step4DealSummary
            request={request}
            opportunity={activeOpp}
            onBack={() => setCurrentStep(3)}
            onReset={handleReset}
          />
        )}
      </div>
    </div>
  );
}
