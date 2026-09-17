import React, { useState } from 'react';
import { CounterpartyDirectoryTable } from './CounterpartyDirectoryTable';
import { VesselArchetypeCalculator } from './VesselArchetypeCalculator';
import { DualCommercialPathwaySimulator } from './DualCommercialPathwaySimulator';
import { ShippingExposureStep } from './dealflow/ShippingExposureStep';
import { ShippingBunkerPricingStep } from './dealflow/ShippingBunkerPricingStep';
import { ShippingTermSheetStep } from './dealflow/ShippingTermSheetStep';
import {
  Ship,
  Sliders,
  Scale,
  BookOpen,
  ShieldCheck,
  ArrowLeft,
  Check,
  Flame,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { ShippingCounterparty } from '../../domain/fueleu/types';
import {
  DEFAULT_TTF_GAS_INDEX_EUR_MWH,
  DEFAULT_LIQUEFACTION_FEE_EUR_MWH,
  DEFAULT_GREEN_PREMIUM_EUR_MWH,
  DEFAULT_VLSFO_PRICE_USD_PER_TONNE,
  EUA_BENCHMARK_EUR_PER_TONNE,
} from '../../domain/fueleu/calculator';

type ActiveTab = 'DIRECTORY' | 'CALCULATOR' | 'PATHWAYS';

const DEAL_STEPS = [
  { step: 1, title: '1. Select Counterparty', desc: '1,850 shipping groups' },
  { step: 2, title: '2. Exposure & Contacts', desc: 'Statutory risk & CRM' },
  { step: 3, title: '3. Price Solution', desc: 'Bio-LNG & pooling margins' },
  { step: 4, title: '4. Term Sheet & Trade', desc: 'OTC deal execution' },
];

export function FuelEUShippingScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const totalGroups = FUEL_EU_SHIPPING_COUNTERPARTIES.length;
  const totalVessels = FUEL_EU_SHIPPING_COUNTERPARTIES.reduce((acc, c) => acc + c.vessels_in_scope, 0);

  const tabParam = searchParams.get('tab')?.toUpperCase();
  const initialTab: ActiveTab = (tabParam === 'CALCULATOR' || tabParam === 'PATHWAYS') ? tabParam : 'DIRECTORY';
  const [activeTab, setActiveTabState] = useState<ActiveTab>(initialTab);

  // 4-Screen Deal Flow Stepper State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedCounterparty, setSelectedCounterparty] = useState<ShippingCounterparty | null>(null);

  // Pricing Engine State
  const [pathway, setPathway] = useState<'PHYSICAL' | 'POOLING'>('PHYSICAL');
  const [ttfGasIndex, setTtfGasIndex] = useState<number>(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
  const [liquefactionFee, setLiquefactionFee] = useState<number>(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
  const [greenPremium, setGreenPremium] = useState<number>(DEFAULT_GREEN_PREMIUM_EUR_MWH);
  const [euaPrice, setEuaPrice] = useState<number>(EUA_BENCHMARK_EUR_PER_TONNE);
  const [vlsfoPrice, setVlsfoPrice] = useState<number>(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTabState(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'DIRECTORY') {
        next.delete('tab');
      } else {
        next.set('tab', tab.toLowerCase());
      }
      return next;
    }, { replace: true });
  };

  const handleSelectCounterparty = (c: ShippingCounterparty) => {
    setSelectedCounterparty(c);
    setPathway(c.fleetCapability === 'DUAL_FUEL_LNG' ? 'PHYSICAL' : 'POOLING');
    setCurrentStep(2);
  };

  const handleResetDeal = () => {
    setSelectedCounterparty(null);
    setCurrentStep(1);
    setPathway('PHYSICAL');
    setTtfGasIndex(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
    setLiquefactionFee(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
    setGreenPremium(DEFAULT_GREEN_PREMIUM_EUR_MWH);
    setEuaPrice(EUA_BENCHMARK_EUR_PER_TONNE);
    setVlsfoPrice(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Screen Title & Statutory Gating Bar */}
      <div
        style={{
          padding: '12px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <h3 className="ptitle" style={{ margin: 0, fontSize: '18px', letterSpacing: '-0.01em' }}>
              FuelEU Maritime Compliance Desk
            </h3>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', display: 'inline-block' }} />
              REGULATION (EU) 2023/1805
            </span>
            <span
              style={{
                fontSize: '10px',
                fontFamily: 'monospace',
                fontWeight: 600,
                letterSpacing: '0.04em',
                padding: '2px 7px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
                color: 'var(--color-muted)',
              }}
            >
              EMSA THETIS-MRV AUDITED
            </span>
          </div>
          <div className="subttl" style={{ fontSize: '12px' }}>
            Pan-European compliance ledger · {totalGroups.toLocaleString()} shipping groups · {totalVessels.toLocaleString()} commercial vessels · Article 20 physical Bio-LNG &amp; Article 21 pooling
          </div>
        </div>

        {/* Action / Reference Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => navigate('/citations')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '0 10px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <BookOpen size={12} style={{ color: 'var(--color-accent)' }} /> Citations &amp; Legal Basis
          </button>
          <button
            type="button"
            onClick={() => navigate('/data-sources')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '0 10px', height: '28px', display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            <ShieldCheck size={12} style={{ color: 'var(--color-status-pos-text)' }} /> EU MRV Provenance
          </button>
        </div>
      </div>

      {/* Institutional Desk Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          padding: '0 18px',
          gap: '2px',
        }}
      >
        {[
          { id: 'DIRECTORY' as const, label: `Deal Flow & Directory (${totalGroups.toLocaleString()})`, icon: Ship },
          { id: 'CALCULATOR' as const, label: 'Vessel Archetypes', icon: Sliders },
          { id: 'PATHWAYS' as const, label: 'Commercial Pathways (Art. 21)', icon: Scale },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectTab(tab.id)}
              style={{
                height: '36px',
                padding: '0 16px',
                border: 'none',
                borderBottom: isActive ? '2px solid var(--color-accent)' : '2px solid transparent',
                backgroundColor: isActive ? 'var(--color-surface)' : 'transparent',
                color: isActive ? 'var(--color-text)' : 'var(--color-muted)',
                fontWeight: isActive ? 700 : 500,
                fontSize: '12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={13} style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)' }} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Tab Body */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'DIRECTORY' && (
          <div className="flex flex-col min-h-full">
            {/* Stepper Navigation Header (Visible when a counterparty is active) */}
            {selectedCounterparty && (
              <div className="bg-white dark:bg-[#0e1118] border-b border-slate-200 dark:border-[#1e2433] px-4 py-3 sticky top-0 z-20 shadow-xs">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
                  {/* Breadcrumb back to directory */}
                  <button
                    type="button"
                    onClick={() => {
                      if (currentStep === 1) {
                        handleResetDeal();
                      } else {
                        setCurrentStep(1);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors shrink-0 cursor-pointer"
                  >
                    <ArrowLeft size={14} className="text-cyan-600 dark:text-cyan-400" />
                    <span>{currentStep === 1 ? 'Clear Active Selection' : 'Back to Directory'}</span>
                  </button>

                  {/* Stepper Navigation Flow */}
                  <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto py-1">
                    {DEAL_STEPS.map((s, idx) => {
                      const isDone = currentStep > s.step;
                      const isCurrent = currentStep === s.step;

                      return (
                        <React.Fragment key={s.step}>
                          <button
                            type="button"
                            onClick={() => setCurrentStep(s.step as any)}
                            className="flex items-center gap-2 text-left cursor-pointer transition-all shrink-0"
                          >
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0 ${
                                isDone
                                  ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-stone-950'
                                  : isCurrent
                                  ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-2 border-cyan-500 ring-2 ring-cyan-500/20'
                                  : 'bg-slate-100 dark:bg-[#08090d] text-slate-400 dark:text-zinc-600 border border-slate-200 dark:border-[#1e2433]'
                              }`}
                            >
                              {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                            </div>
                            <div className="hidden md:block">
                              <div
                                className={`text-xs font-semibold leading-tight ${
                                  isCurrent
                                    ? 'text-cyan-700 dark:text-cyan-300'
                                    : isDone
                                    ? 'text-slate-800 dark:text-zinc-200'
                                    : 'text-slate-400 dark:text-zinc-500'
                                }`}
                              >
                                {s.title}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-zinc-500 leading-tight">
                                {s.desc}
                              </div>
                            </div>
                          </button>
                          {idx < DEAL_STEPS.length - 1 && (
                            <div className="w-6 sm:w-10 h-[2px] bg-slate-200 dark:bg-[#1e2433] shrink-0">
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

                  {/* Active Counterparty Info Pill */}
                  <div className="hidden lg:flex items-center gap-2 bg-slate-100 dark:bg-[#141a29] border border-slate-200 dark:border-[#1e2433] px-3 py-1.5 rounded-lg shrink-0">
                    <Ship size={13} className="text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200 max-w-[180px] truncate">
                      #{selectedCounterparty.rank} {selectedCounterparty.parent_name}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#1e2738] text-slate-600 dark:text-zinc-400">
                      {selectedCounterparty.fleetCapability === 'DUAL_FUEL_LNG' ? 'LNG Ready' : 'Conv'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Step Content */}
            <div className="flex-1">
              {currentStep === 1 && (
                <CounterpartyDirectoryTable
                  onSelectCounterparty={handleSelectCounterparty}
                  selectedCounterparty={selectedCounterparty}
                />
              )}

              {currentStep === 2 && selectedCounterparty && (
                <ShippingExposureStep
                  counterparty={selectedCounterparty}
                  onBack={() => setCurrentStep(1)}
                  onNext={() => setCurrentStep(3)}
                />
              )}

              {currentStep === 3 && selectedCounterparty && (
                <ShippingBunkerPricingStep
                  counterparty={selectedCounterparty}
                  pathway={pathway}
                  setPathway={setPathway}
                  ttfGasIndex={ttfGasIndex}
                  setTtfGasIndex={setTtfGasIndex}
                  liquefactionFee={liquefactionFee}
                  setLiquefactionFee={setLiquefactionFee}
                  greenPremium={greenPremium}
                  setGreenPremium={setGreenPremium}
                  euaPrice={euaPrice}
                  setEuaPrice={setEuaPrice}
                  vlsfoPrice={vlsfoPrice}
                  setVlsfoPrice={setVlsfoPrice}
                  onBack={() => setCurrentStep(2)}
                  onNext={() => setCurrentStep(4)}
                />
              )}

              {currentStep === 4 && selectedCounterparty && (
                <ShippingTermSheetStep
                  counterparty={selectedCounterparty}
                  pathway={pathway}
                  ttfGasIndex={ttfGasIndex}
                  liquefactionFee={liquefactionFee}
                  greenPremium={greenPremium}
                  euaPrice={euaPrice}
                  vlsfoPrice={vlsfoPrice}
                  onBack={() => setCurrentStep(3)}
                  onReset={handleResetDeal}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'CALCULATOR' && <VesselArchetypeCalculator />}
        {activeTab === 'PATHWAYS' && <DualCommercialPathwaySimulator />}
      </div>
    </div>
  );
}
