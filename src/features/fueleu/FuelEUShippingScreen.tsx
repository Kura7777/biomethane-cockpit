import React, { useState, useMemo, useEffect } from 'react';
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

  // Tab State derived directly from searchParams
  const tabParam = searchParams.get('tab')?.toUpperCase();
  const activeTab: ActiveTab = (tabParam === 'CALCULATOR' || tabParam === 'PATHWAYS') ? tabParam : 'DIRECTORY';

  // 4-Screen Deal Flow State derived from searchParams for seamless browser back/forward and deep linking
  const companyParam = searchParams.get('company');
  const stepParam = searchParams.get('step');

  const selectedCounterparty = useMemo<ShippingCounterparty | null>(() => {
    if (!companyParam) return null;
    const rank = parseInt(companyParam, 10);
    if (!isNaN(rank)) {
      const byRank = FUEL_EU_SHIPPING_COUNTERPARTIES.find(c => c.rank === rank);
      if (byRank) return byRank;
    }
    const lower = companyParam.toLowerCase();
    return (
      FUEL_EU_SHIPPING_COUNTERPARTIES.find(
        c => c.parent_name.toLowerCase() === lower || c.contactDomain?.toLowerCase() === lower
      ) || null
    );
  }, [companyParam]);

  const currentStep: 1 | 2 | 3 | 4 = useMemo(() => {
    if (!selectedCounterparty) return 1;
    const parsedStep = parseInt(stepParam || '2', 10);
    if (parsedStep >= 1 && parsedStep <= 4) {
      return parsedStep as 1 | 2 | 3 | 4;
    }
    return 2;
  }, [selectedCounterparty, stepParam]);

  // Pricing Engine State
  const [pathway, setPathway] = useState<'PHYSICAL' | 'POOLING'>('PHYSICAL');
  const [ttfGasIndex, setTtfGasIndex] = useState<number>(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
  const [liquefactionFee, setLiquefactionFee] = useState<number>(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
  const [greenPremium, setGreenPremium] = useState<number>(DEFAULT_GREEN_PREMIUM_EUR_MWH);
  const [euaPrice, setEuaPrice] = useState<number>(EUA_BENCHMARK_EUR_PER_TONNE);
  const [vlsfoPrice, setVlsfoPrice] = useState<number>(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);

  // Calibrate pathway when selected counterparty changes
  useEffect(() => {
    if (selectedCounterparty) {
      setPathway(selectedCounterparty.fleetCapability === 'DUAL_FUEL_LNG' ? 'PHYSICAL' : 'POOLING');
    }
  }, [selectedCounterparty?.rank]);

  const handleSelectTab = (tab: ActiveTab) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'DIRECTORY') {
        next.delete('tab');
      } else {
        next.set('tab', tab.toLowerCase());
        // If moving to calculator or pathways, clear dealflow step params
        next.delete('company');
        next.delete('step');
      }
      return next;
    });
  };

  const handleSelectCounterparty = (c: ShippingCounterparty) => {
    setPathway(c.fleetCapability === 'DUAL_FUEL_LNG' ? 'PHYSICAL' : 'POOLING');
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('tab');
      next.set('company', String(c.rank));
      next.set('step', '2');
      return next;
    });
  };

  const handleNavigateStep = (step: 1 | 2 | 3 | 4) => {
    if (step === 1) {
      // Returning to directory clears company and step to prevent sticky header conflict
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('company');
        next.delete('step');
        return next;
      });
      return;
    }
    if (selectedCounterparty) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        next.delete('tab');
        next.set('company', String(selectedCounterparty.rank));
        next.set('step', String(step));
        return next;
      });
    }
  };

  const handleResetDeal = () => {
    setPathway('PHYSICAL');
    setTtfGasIndex(DEFAULT_TTF_GAS_INDEX_EUR_MWH);
    setLiquefactionFee(DEFAULT_LIQUEFACTION_FEE_EUR_MWH);
    setGreenPremium(DEFAULT_GREEN_PREMIUM_EUR_MWH);
    setEuaPrice(EUA_BENCHMARK_EUR_PER_TONNE);
    setVlsfoPrice(DEFAULT_VLSFO_PRICE_USD_PER_TONNE);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('company');
      next.delete('step');
      return next;
    });
  };

  const isInDealFlow = Boolean(selectedCounterparty && currentStep > 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* 1. When NOT in deal flow: Show standard Screen Title & Desk Tabs */}
      {!isInDealFlow && (
        <>
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
        </>
      )}

      {/* 2. When IN deal flow (Steps 2..4): Show a single, sleek, unified Bloomberg Deal Flow Command Bar */}
      {isInDealFlow && selectedCounterparty && (
        <div
          style={{
            padding: '8px 18px',
            borderBottom: '1px solid var(--color-divider)',
            backgroundColor: 'var(--color-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexWrap: 'nowrap',
          }}
        >
          {/* Left: Quick Back to Directory & Active Target ID */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleNavigateStep(1)}
              className="btn btn-secondary"
              style={{
                fontSize: '11px',
                height: '28px',
                padding: '0 10px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
              }}
              title="Return to 1,850 Counterparties Directory"
            >
              <ArrowLeft size={13} style={{ color: 'var(--color-accent)' }} />
              <span>Directory (1,850)</span>
            </button>

            <div style={{ width: '1px', height: '18px', backgroundColor: 'var(--color-divider)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: 'var(--color-accent)',
                  padding: '1px 5px',
                  border: '1px solid var(--color-divider)',
                  backgroundColor: 'var(--color-subtier)',
                }}
              >
                #{selectedCounterparty.rank}
              </span>
              <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text)', letterSpacing: '-0.01em' }}>
                {selectedCounterparty.parent_name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  border: '1px solid var(--color-divider)',
                  color: 'var(--color-muted)',
                  backgroundColor: 'var(--color-subtier)',
                }}
              >
                {selectedCounterparty.fleetCapability === 'DUAL_FUEL_LNG'
                  ? `Dual-Fuel LNG (${selectedCounterparty.lng_vessels_in_scope}v)`
                  : `Conventional (${selectedCounterparty.vessels_in_scope}v)`}
              </span>
            </div>
          </div>

          {/* Center: Sleek 4-Step Stepper Flow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {DEAL_STEPS.map((s, idx) => {
              const isDone = currentStep > s.step;
              const isCurrent = currentStep === s.step;

              return (
                <React.Fragment key={s.step}>
                  <button
                    type="button"
                    onClick={() => handleNavigateStep(s.step as any)}
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '2px 4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      opacity: isCurrent || isDone ? 1 : 0.45,
                      transition: 'opacity 150ms ease',
                    }}
                  >
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        fontFamily: 'monospace',
                        backgroundColor: isCurrent
                          ? 'var(--color-accent)'
                          : isDone
                          ? 'var(--color-status-pos-bg, rgba(16, 185, 129, 0.15))'
                          : 'var(--color-subtier)',
                        color: isCurrent
                          ? '#000000'
                          : isDone
                          ? 'var(--color-status-pos-text)'
                          : 'var(--color-muted)',
                        border: isCurrent
                          ? '1px solid var(--color-accent)'
                          : isDone
                          ? '1px solid var(--color-status-pos-border, #10b981)'
                          : '1px solid var(--color-divider)',
                      }}
                    >
                      {isDone ? <Check size={12} strokeWidth={3} /> : s.step}
                    </div>
                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: isCurrent ? 700 : 500,
                        color: isCurrent ? 'var(--color-text)' : 'var(--color-muted)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {s.title}
                    </span>
                  </button>

                  {idx < DEAL_STEPS.length - 1 && (
                    <div
                      style={{
                        width: '24px',
                        height: '1px',
                        backgroundColor: currentStep > s.step ? 'var(--color-accent)' : 'var(--color-divider)',
                        flexShrink: 0,
                      }}
                    />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Right: Key Liability Badge & Legal Reference */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-subtier)',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            >
              <span style={{ color: 'var(--color-muted)' }}>2025 Risk:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-status-neg-text)' }}>
                €{(selectedCounterparty.combined_regulatory_exposure_2025_eur / 1e6).toFixed(2)}M
              </span>
            </div>

            <button
              type="button"
              onClick={() => navigate('/citations')}
              className="btn btn-secondary"
              style={{ fontSize: '10.5px', padding: '0 8px', height: '26px', display: 'flex', alignItems: 'center', gap: '4px' }}
              title="View statutory legislation & formulas"
            >
              <BookOpen size={11} style={{ color: 'var(--color-accent)' }} /> Citations
            </button>
          </div>
        </div>
      )}

      {/* Main Tab Body */}
      <div style={{ flex: 1, minHeight: 0 }}>
        {activeTab === 'DIRECTORY' && (
          <div className="flex flex-col min-h-full">
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
                  onBack={() => handleNavigateStep(1)}
                  onNext={() => handleNavigateStep(3)}
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
                  onBack={() => handleNavigateStep(2)}
                  onNext={() => handleNavigateStep(4)}
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
                  onBack={() => handleNavigateStep(3)}
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
