import React, { useState, useMemo } from 'react';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { SourcedOpportunity } from './PlantScannerTable';
import { Step1OrderIntake } from './Step1OrderIntake';
import { Step2PlantScan } from './Step2PlantScan';
import { Step3RouteAndCosts } from './Step3RouteAndCosts';
import { Step4DealSummary } from './Step4DealSummary';
import { calculateLogisticsRoute } from '../../domain/logistics/engine';
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
};

const STEPS = [
  { step: 1, title: '1. Order Intake', desc: 'Enter order specs' },
  { step: 2, title: '2. Sourced Plants', desc: 'Scan 1,975+ facilities' },
  { step: 3, title: '3. Route & Costs', desc: 'Corridor map & pricing' },
  { step: 4, title: '4. Deal Summary', desc: 'Finalized term sheet' },
];

export function CommercialFlowStepper() {
  const { state } = useAppState();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [request, setRequest] = useState<ClientRequest>(INITIAL_REQUEST);
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
      const countryPlants = BIOMETHANE_PLANTS.filter(
        p => p.countryCode === opp.originCountry || p.country.toLowerCase() === opp.originCountry.toLowerCase()
      );

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
            originPlantCoords: p.coordinates || null,
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
          });
        });
      } else {
        const route = calculateLogisticsRoute(opp.originCountry, opp.targetCountry);
        plantOpps.push({
          ...opp,
          originPlantName: `${opp.originCountry} Biomethane Facility`,
          originPlantCoords: null,
          isDirectPlantSource: false,
          logisticsDistanceKm: route.distanceKm ?? 0,
          deliveryMode: 'PIPELINE_GRID',
        });
      }
    }

    return plantOpps;
  }, [searchResult.tradeable]);

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
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-100 dark:bg-[#08090d] text-slate-900 dark:text-zinc-100 min-h-screen">
      {/* Sleek Step Progress Indicator Bar */}
      <div className="bg-white dark:bg-[#0e1118] border-b border-slate-200 dark:border-[#1e2433] px-4 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
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
                    className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-bold transition-all shrink-0 ${
                      isDone
                        ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950'
                        : isCurrent
                        ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-2 border-cyan-500 ring-2 ring-cyan-500/20'
                        : 'bg-slate-100 dark:bg-[#08090d] text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-[#1e2433]'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.step}
                  </div>

                  {/* Step Text */}
                  <div className="hidden sm:block">
                    <span
                      className={`font-mono text-xs font-bold tracking-wider block ${
                        isCurrent
                          ? 'text-cyan-700 dark:text-cyan-300'
                          : isDone
                          ? 'text-slate-800 dark:text-zinc-300'
                          : 'text-slate-400 dark:text-zinc-600'
                      }`}
                    >
                      {s.title}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 dark:text-zinc-500 block">
                      {s.desc}
                    </span>
                  </div>
                </button>

                {/* Arrow Divider between steps */}
                {idx < STEPS.length - 1 && (
                  <div className="w-8 md:w-16 h-[2px] bg-slate-200 dark:bg-[#141824] shrink-0 mx-1">
                    <div
                      className={`h-full bg-cyan-600 dark:bg-cyan-500 transition-all duration-300 ${
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
