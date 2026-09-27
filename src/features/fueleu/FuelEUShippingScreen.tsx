import React, { useState, useMemo, useEffect } from 'react';
import './fueleuDesk.css';
import { FuelEuHeader } from './FuelEuHeader';
import { FuelEuKpiTiles } from './FuelEuKpiTiles';
import { FuelEuDirectoryDesk } from './FuelEuDirectoryDesk';
import { FuelEuToolsTab } from './FuelEuToolsTab';
import { LngVesselBookTable } from './LngVesselBookTable';
import { PoolMatchingTab } from './PoolMatchingTab';
import { ShippingExposureStep } from './dealflow/ShippingExposureStep';
import { ShippingBunkerPricingStep } from './dealflow/ShippingBunkerPricingStep';
import { ShippingTermSheetStep } from './dealflow/ShippingTermSheetStep';
import { ArrowLeft, Check, BookOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FUEL_EU_SHIPPING_COUNTERPARTIES } from '../../domain/fueleu/shippingTargetsData';
import { FUEL_EU_LNG_SHIPS } from '../../domain/fueleu/lngShipsData';
import { ShippingCounterparty } from '../../domain/fueleu/types';
import {
  DEFAULT_TTF_GAS_INDEX_EUR_MWH,
  DEFAULT_LIQUEFACTION_FEE_EUR_MWH,
  DEFAULT_GREEN_PREMIUM_EUR_MWH,
  DEFAULT_VLSFO_PRICE_USD_PER_TONNE,
  EUA_BENCHMARK_EUR_PER_TONNE,
  FUELEU_ACTIVE_PERIOD,
} from '../../domain/fueleu/calculator';

type ActiveTab = 'DIRECTORY' | 'LNG_BOOK' | 'POOL_MATCHING' | 'TOOLS';

const DEAL_STEPS = [
  { step: 1, title: '1. Select Counterparty', desc: `${FUEL_EU_SHIPPING_COUNTERPARTIES.length.toLocaleString('en-US')} shipping groups` },
  { step: 2, title: '2. Exposure & Contacts', desc: 'Statutory risk & CRM' },
  { step: 3, title: '3. Price Solution', desc: 'Bio-LNG & pooling margins' },
  { step: 4, title: '4. Term Sheet & Trade', desc: 'OTC deal execution' },
];

export function FuelEUShippingScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State derived directly from searchParams
  const tabParam = searchParams.get('tab')?.toUpperCase();
  const activeTab: ActiveTab =
    tabParam === 'LNG_BOOK' || tabParam === 'POOL_MATCHING' || tabParam === 'TOOLS' || tabParam === 'CALCULATOR' || tabParam === 'PATHWAYS'
      ? (tabParam === 'CALCULATOR' || tabParam === 'PATHWAYS' ? 'TOOLS' : (tabParam as ActiveTab))
      : 'DIRECTORY';

  // Group id to highlight in Pool matching when arriving via "Add to pool"
  const [highlightGroupId, setHighlightGroupId] = useState<string | null>(null);

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

  const handleAddToPool = (groupId: string) => {
    setHighlightGroupId(groupId);
    handleSelectTab('POOL_MATCHING');
  };

  const handleNavigateStep = (step: 1 | 2 | 3 | 4) => {
    if (step === 1) {
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

  if (isInDealFlow && selectedCounterparty) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => handleNavigateStep(1)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', height: '28px', padding: '0 10px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
              title={`Return to ${FUEL_EU_SHIPPING_COUNTERPARTIES.length.toLocaleString('en-US')} Counterparties Directory`}
            >
              <ArrowLeft size={13} style={{ color: 'var(--color-accent)' }} />
              <span>Directory ({FUEL_EU_SHIPPING_COUNTERPARTIES.length.toLocaleString('en-US')})</span>
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

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {DEAL_STEPS.map((s, idx) => {
              const isDone = currentStep > s.step;
              const isCurrent = currentStep === s.step;
              return (
                <React.Fragment key={s.step}>
                  <button
                    type="button"
                    onClick={() => handleNavigateStep(s.step as any)}
                    style={{ background: 'none', border: 'none', padding: '2px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', opacity: isCurrent || isDone ? 1 : 0.45, transition: 'opacity 150ms ease' }}
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
                        backgroundColor: isCurrent ? 'var(--color-accent)' : isDone ? 'var(--color-status-pos-bg, rgba(16, 185, 129, 0.15))' : 'var(--color-subtier)',
                        color: isCurrent ? '#000000' : isDone ? 'var(--color-status-pos-text)' : 'var(--color-muted)',
                        border: isCurrent ? '1px solid var(--color-accent)' : isDone ? '1px solid var(--color-status-pos-border, #10b981)' : '1px solid var(--color-divider)',
                      }}
                    >
                      {isDone ? <Check size={12} strokeWidth={3} /> : s.step}
                    </div>
                    <span style={{ fontSize: '11.5px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? 'var(--color-text)' : 'var(--color-muted)', whiteSpace: 'nowrap' }}>
                      {s.title}
                    </span>
                  </button>
                  {idx < DEAL_STEPS.length - 1 && (
                    <div style={{ width: '24px', height: '1px', backgroundColor: currentStep > s.step ? 'var(--color-accent)' : 'var(--color-divider)', flexShrink: 0 }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '2px 8px', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-subtier)', fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: 'var(--color-muted)' }}>{FUELEU_ACTIVE_PERIOD} Risk:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-status-neg-text)' }}>
                €{(selectedCounterparty.combined_regulatory_exposure_2026_eur / 1e6).toFixed(2)}M
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

        <div style={{ flex: 1, minHeight: 0 }}>
          {currentStep === 2 && (
            <ShippingExposureStep counterparty={selectedCounterparty} onBack={() => handleNavigateStep(1)} onNext={() => handleNavigateStep(3)} />
          )}
          {currentStep === 3 && (
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
          {currentStep === 4 && (
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
    );
  }

  return (
    <div className="fueleu-desk">
      <FuelEuHeader />

      <div className="fe-tabs" role="tablist" aria-label="FuelEU Maritime sections">
        <button type="button" role="tab" aria-selected={activeTab === 'DIRECTORY'} className={`fe-tab ${activeTab === 'DIRECTORY' ? 'active' : ''}`} onClick={() => handleSelectTab('DIRECTORY')}>
          Directory
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'LNG_BOOK'} className={`fe-tab ${activeTab === 'LNG_BOOK' ? 'active' : ''}`} onClick={() => handleSelectTab('LNG_BOOK')}>
          LNG vessel book <span className="num">{FUEL_EU_LNG_SHIPS.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'POOL_MATCHING'} className={`fe-tab ${activeTab === 'POOL_MATCHING' ? 'active' : ''}`} onClick={() => handleSelectTab('POOL_MATCHING')}>
          Pool matching
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'TOOLS'} className={`fe-tab ${activeTab === 'TOOLS' ? 'active' : ''}`} onClick={() => handleSelectTab('TOOLS')}>
          Tools
        </button>
      </div>

      {activeTab === 'DIRECTORY' && (
        <>
          <FuelEuKpiTiles />
          <FuelEuDirectoryDesk onBuildTermSheet={handleSelectCounterparty} onAddToPool={handleAddToPool} />
        </>
      )}

      {activeTab === 'LNG_BOOK' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 24px' }}>
          <LngVesselBookTable />
        </div>
      )}

      {activeTab === 'POOL_MATCHING' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '0 24px 24px' }}>
          <PoolMatchingTab highlightGroupId={highlightGroupId} />
        </div>
      )}

      {activeTab === 'TOOLS' && (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <FuelEuToolsTab />
        </div>
      )}
    </div>
  );
}
