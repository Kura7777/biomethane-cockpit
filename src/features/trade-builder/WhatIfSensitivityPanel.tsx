import React, { useState, useMemo } from 'react';
import { 
  SlidersHorizontal, 
  RotateCcw, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  HelpCircle,
  BarChart2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Market, PriceSide } from '../../domain/markets/types';
import { Consignment } from '../../domain/consignment/types';
import { CostInputs, MarksState, PricingSides, FuelEUOptions } from '../../domain/netback/types';
import {
  SensitivityShockConfig,
  DEFAULT_SHOCK_CONFIG,
  SENSITIVITY_PRESETS,
  evaluateSensitivityScenario,
  runSensitivityMatrix,
  compareScenarios,
  MarketSensitivityResult,
} from '../../domain/sensitivity';

interface WhatIfSensitivityPanelProps {
  consignment: Consignment;
  selectedMarket: Market;
  marks: MarksState;
  costs: CostInputs;
  pricingSide?: PriceSide | PricingSides;
  fuelEUOptions?: FuelEUOptions;
  onSelectMarket?: (marketId: string) => void;
  className?: string;
}

function getVerdictBadgeStyle(verdict: string) {
  switch (verdict) {
    case 'PASS':
    case 'ELIGIBLE':
      return 'text-emerald-300 bg-emerald-950 border-emerald-800';
    case 'CONDITIONAL':
      return 'text-amber-300 bg-amber-950 border-amber-800';
    case 'UNRESOLVED':
      return 'text-sky-300 bg-sky-950 border-sky-800';
    case 'HARD_BLOCK':
    case 'FAIL':
    default:
      return 'text-red-300 bg-red-950 border-red-800';
  }
}

export function WhatIfSensitivityPanel({
  consignment,
  selectedMarket,
  marks,
  costs,
  pricingSide,
  fuelEUOptions,
  onSelectMarket,
  className = '',
}: WhatIfSensitivityPanelProps) {
  const [shockConfig, setShockConfig] = useState<SensitivityShockConfig>(DEFAULT_SHOCK_CONFIG);
  const [activePresetId, setActivePresetId] = useState<string>('BASE_CASE');
  const [showAdvancedControls, setShowAdvancedControls] = useState<boolean>(false);
  const [tableFilter, setTableFilter] = useState<'ALL' | 'TRADEABLE' | 'BLOCKED'>('ALL');

  // Evaluate focus market result
  const focusResult: MarketSensitivityResult = useMemo(() => {
    return evaluateSensitivityScenario(
      {
        consignment,
        baseMarks: marks,
        baseCosts: costs,
        shockConfig,
        pricingSide,
        fuelEUOptions,
      },
      selectedMarket
    );
  }, [consignment, marks, costs, shockConfig, pricingSide, fuelEUOptions, selectedMarket]);

  // Evaluate all markets sensitivity matrix
  const sensitivityMatrix = useMemo(() => {
    return runSensitivityMatrix({
      consignment,
      baseMarks: marks,
      baseCosts: costs,
      shockConfig,
      pricingSide,
      fuelEUOptions,
    });
  }, [consignment, marks, costs, shockConfig, pricingSide, fuelEUOptions]);

  // Comparison vs baseline
  const scenarioComparison = useMemo(() => {
    return compareScenarios(
      {
        consignment,
        baseMarks: marks,
        baseCosts: costs,
        shockConfig: DEFAULT_SHOCK_CONFIG,
        pricingSide,
        fuelEUOptions,
      },
      {
        consignment,
        baseMarks: marks,
        baseCosts: costs,
        shockConfig,
        pricingSide,
        fuelEUOptions,
      },
      'Base Case',
      activePresetId
    );
  }, [consignment, marks, costs, shockConfig, pricingSide, fuelEUOptions, activePresetId]);

  const handleApplyPreset = (presetId: string) => {
    const preset = SENSITIVITY_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setShockConfig(preset.config);
      setActivePresetId(preset.id);
    }
  };

  const handleReset = () => {
    setShockConfig(DEFAULT_SHOCK_CONFIG);
    setActivePresetId('BASE_CASE');
  };

  const handleConfigChange = (updates: Partial<SensitivityShockConfig>) => {
    setShockConfig(prev => ({ ...prev, ...updates }));
    setActivePresetId('CUSTOM');
  };

  // Base TTF mark price for visual context
  const baseTtfMid = marks.gasIndex.mid ?? marks.gasIndex.bid ?? null;
  const shockedTtfEstimate = baseTtfMid !== null
    ? Number((baseTtfMid * (1 + shockConfig.ttfPriceShockPercent / 100)).toFixed(2))
    : null;

  // Filtered matrix rows
  const filteredRows = useMemo(() => {
    if (tableFilter === 'TRADEABLE') {
      return sensitivityMatrix.marketResults.filter(r => r.isTradeable);
    }
    if (tableFilter === 'BLOCKED') {
      return sensitivityMatrix.marketResults.filter(r => r.isBlocked);
    }
    return sensitivityMatrix.marketResults;
  }, [sensitivityMatrix.marketResults, tableFilter]);

  return (
    <div className={`bg-stone-950 border border-stone-800 flex flex-col font-sans ${className}`}>
      
      {/* Header */}
      <div className="p-3 px-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center rounded-xs">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="m-0 font-mono text-xs font-semibold tracking-[0.12em] text-stone-100 uppercase">
                What-If Sensitivity Simulator
              </h3>
              <span className="font-mono text-micro text-teal-300 bg-teal-950 border border-teal-800 px-1.5 py-0.5 rounded-xs">
                R4 PURE DOMAIN
              </span>
            </div>
            <p className="m-0 text-meta text-stone-400 mt-0.5">
              Simulate wholesale TTF shocks, German §37a repeal, UK UDB accords & quota cap shifts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-stone-100 border border-stone-700 font-mono text-micro font-medium rounded-xs cursor-pointer transition-colors"
            title="Reset all scenario parameters to unmodified Base Case"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Baseline</span>
          </button>
        </div>
      </div>

      {/* Preset Chips Bar */}
      <div className="p-3 px-4 bg-stone-950/80 border-b border-stone-800 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
            ⚡ Quick Scenario Presets
          </span>
          <span className="font-mono text-micro text-stone-500">
            Active: <strong className="text-teal-300">{focusResult.shockSummary}</strong>
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {SENSITIVITY_PRESETS.map(preset => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyPreset(preset.id)}
                aria-pressed={isActive}
                title={preset.description}
                className={`px-2.5 py-1.5 font-mono text-micro font-semibold rounded-xs border transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-teal-600 text-teal-950 border-teal-600 shadow-xs'
                    : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:text-stone-100'
                }`}
              >
                <span>{preset.shortLabel}</span>
                {preset.badge && (
                  <span className={`text-[9px] px-1 py-0.2 rounded-xs ${
                    isActive ? 'bg-teal-950 text-teal-300' : 'bg-stone-800 text-stone-400'
                  }`}>
                    {preset.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Scenario Controls */}
      <div className="p-3 px-4 bg-stone-900/40 border-b border-stone-800 flex flex-col gap-3">
        
        {/* Row 1: TTF Gas Shock & German Multiplier Branch */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          
          {/* TTF Slider & Step Buttons */}
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                Wholesale TTF Gas Shock
              </span>
              <span className="font-mono font-num text-xs font-bold text-stone-100">
                {shockConfig.ttfPriceShockPercent > 0 ? `+${shockConfig.ttfPriceShockPercent}` : shockConfig.ttfPriceShockPercent}%
                <span className="text-stone-400 text-micro font-normal"> ({shockedTtfEstimate !== null ? `~€${shockedTtfEstimate.toFixed(2)}/MWh` : 'No TTF mark'})</span>
              </span>
            </div>

            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={shockConfig.ttfPriceShockPercent}
              onChange={e => handleConfigChange({ ttfPriceShockPercent: Number(e.target.value) })}
              aria-label="TTF Gas Shock Percentage"
              className="w-full my-1"
            />

            <div className="flex items-center justify-between gap-1">
              {[-30, -20, -10, 0, 10, 20, 30].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleConfigChange({ ttfPriceShockPercent: val })}
                  className={`flex-1 py-0.5 font-mono text-[10px] font-medium rounded-xs border cursor-pointer transition-colors ${
                    shockConfig.ttfPriceShockPercent === val
                      ? 'bg-teal-600 text-teal-950 border-teal-600 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {val > 0 ? `+${val}%` : `${val}%`}
                </button>
              ))}
            </div>
          </div>

          {/* German THG Multiplier & UK UDB Accord */}
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                German THG Multiplier (§37a BImSchG)
              </span>
              <span className="font-mono text-micro text-teal-300">
                {shockConfig.deDoubleCounting === 'DC_OFF' ? '1× Repeal Scenario' : shockConfig.deDoubleCounting === 'DC_ON' ? '2× Retained Scenario' : 'Engine Baseline'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'DC_OFF', label: '1× Single Count', sub: 'Repeal' },
                { id: 'AUTO', label: 'Engine Default', sub: 'Dual Branch' },
                { id: 'DC_ON', label: '2× Double Count', sub: 'Retained' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleConfigChange({ deDoubleCounting: opt.id as 'DC_OFF' | 'DC_ON' | 'AUTO' })}
                  className={`py-1 px-1.5 font-mono text-micro rounded-xs border cursor-pointer text-center transition-colors ${
                    shockConfig.deDoubleCounting === opt.id
                      ? 'bg-teal-600 text-teal-950 border-teal-600 font-bold'
                      : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                </button>
              ))}
            </div>

            {/* UK UDB Accord Quick Toggle */}
            <div className="pt-1.5 border-t border-stone-800 flex items-center justify-between">
              <span className="font-mono text-micro text-stone-400">
                UK UDB Treaty Accord
              </span>
              <button
                type="button"
                onClick={() => handleConfigChange({ ukUdbRecognition: !shockConfig.ukUdbRecognition })}
                className={`px-2 py-0.5 font-mono text-micro font-semibold rounded-xs border cursor-pointer transition-colors ${
                  shockConfig.ukUdbRecognition
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                }`}
              >
                {shockConfig.ukUdbRecognition ? '✓ Recognition Enabled' : '✗ Grid Boundary Active'}
              </button>
            </div>
          </div>

        </div>

        {/* Collapsible Advanced Policy Controls */}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowAdvancedControls(!showAdvancedControls)}
            className="self-start flex items-center gap-1.5 font-mono text-micro text-stone-400 hover:text-stone-200 cursor-pointer bg-transparent border-none p-0"
          >
            {showAdvancedControls ? <ChevronUp className="w-3 h-3 text-teal-400" /> : <ChevronDown className="w-3 h-3 text-teal-400" />}
            <span>{showAdvancedControls ? 'Hide Advanced Policy & FX Levers' : 'Show Advanced Levers (French CPB Cap, FuelEU Escalation, FX Shock)'}</span>
          </button>

          {showAdvancedControls && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 bg-stone-950 border border-stone-800 rounded-xs">
              
              {/* French CPB Statutory Ceiling */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                    French CPB Ceiling
                  </span>
                  <span className="font-mono font-num text-micro font-bold text-stone-100">
                    €{shockConfig.frCpbCeilingEurMwh}/MWh
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[80, 100, 120].map(cap => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => handleConfigChange({ frCpbCeilingEurMwh: cap })}
                      className={`py-1 font-mono text-micro font-medium rounded-xs border cursor-pointer ${
                        shockConfig.frCpbCeilingEurMwh === cap
                          ? 'bg-teal-600 text-teal-950 border-teal-600 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      €{cap}
                    </button>
                  ))}
                </div>
              </div>

              {/* FuelEU Non-Compliance Year Escalation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                    FuelEU Escalation
                  </span>
                  <span className="font-mono text-micro font-bold text-stone-100">
                    Yr {shockConfig.fuelEUEscalationYears} (+{(shockConfig.fuelEUEscalationYears - 1) * 10}%)
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {([1, 2, 3, 4] as const).map(yr => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => handleConfigChange({ fuelEUEscalationYears: yr })}
                      className={`py-1 font-mono text-micro font-medium rounded-xs border cursor-pointer ${
                        shockConfig.fuelEUEscalationYears === yr
                          ? 'bg-teal-600 text-teal-950 border-teal-600 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      Y{yr}
                    </button>
                  ))}
                </div>
              </div>

              {/* FX Rate Shock */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                    GBP/EUR FX Cross Shock
                  </span>
                  <span className="font-mono font-num text-micro font-bold text-stone-100">
                    {shockConfig.fxShockPercent > 0 ? `+${shockConfig.fxShockPercent}` : shockConfig.fxShockPercent}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {[-10, 0, 10].map(fx => (
                    <button
                      key={fx}
                      type="button"
                      onClick={() => handleConfigChange({ fxShockPercent: fx })}
                      className={`py-1 font-mono text-micro font-medium rounded-xs border cursor-pointer ${
                        shockConfig.fxShockPercent === fx
                          ? 'bg-teal-600 text-teal-950 border-teal-600 font-bold'
                          : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      {fx > 0 ? `+${fx}%` : `${fx}%`}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

      </div>

      {/* Focus Market Delta Spotlight & Uncertainty Range */}
      <div className="p-4 bg-stone-950 border-b border-stone-800 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Spotlight: Selected Market Impact
            </span>
            <span className="font-mono text-meta font-bold text-stone-100 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-xs">
              {selectedMarket.name} ({selectedMarket.country})
            </span>
          </div>
          <span className={`font-mono text-micro font-bold px-2 py-0.5 border rounded-xs ${getVerdictBadgeStyle(focusResult.shockedEligibilityVerdict)}`}>
            {focusResult.shockedEligibilityVerdict}
          </span>
        </div>

        {/* Metric Delta Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-[1px] bg-stone-800 border border-stone-800 rounded-xs overflow-hidden">
          
          {/* Delivered Net Netback */}
          <div className="bg-stone-950 p-3 flex flex-col gap-1">
            <span className="font-mono text-micro text-stone-400 uppercase">Delivered Netback</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-num text-lg font-bold text-stone-100">
                {focusResult.shockedNetback !== null ? `€${focusResult.shockedNetback.toFixed(2)}` : '—'}
              </span>
              <span className="text-micro text-stone-400">/MWh</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-num text-micro mt-0.5">
              <span className="text-stone-400">Base: €{focusResult.baseNetback?.toFixed(2) ?? '—'}</span>
              <span className="text-stone-500">·</span>
              <span className={`font-semibold ${
                (focusResult.netbackDeltaEurPerMwh ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(focusResult.netbackDeltaEurPerMwh ?? 0) >= 0 ? '+' : ''}
                {focusResult.netbackDeltaEurPerMwh !== null ? `€${focusResult.netbackDeltaEurPerMwh.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* Desk Net Margin */}
          <div className="bg-stone-950 p-3 flex flex-col gap-1">
            <span className="font-mono text-micro text-stone-400 uppercase">Desk Net Margin</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-num text-lg font-bold text-stone-100">
                {focusResult.shockedDeskMargin !== null ? `€${focusResult.shockedDeskMargin.toFixed(2)}` : 'Unset'}
              </span>
              <span className="text-micro text-stone-400">/MWh</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-num text-micro mt-0.5">
              <span className="text-stone-400">Base: {focusResult.baseDeskMargin !== null ? `€${focusResult.baseDeskMargin.toFixed(2)}` : '—'}</span>
              <span className="text-stone-500">·</span>
              <span className={`font-semibold ${
                (focusResult.marginDeltaEurPerMwh ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(focusResult.marginDeltaEurPerMwh ?? 0) >= 0 ? '+' : ''}
                {focusResult.marginDeltaEurPerMwh !== null ? `€${focusResult.marginDeltaEurPerMwh.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

          {/* Deal / Annual Notional P&L */}
          <div className="bg-stone-950 p-3 flex flex-col gap-1">
            <span className="font-mono text-micro text-stone-400 uppercase">Notional P&L Impact</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className={`font-mono font-num text-lg font-bold ${
                (focusResult.notionalDeltaEur ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(focusResult.notionalDeltaEur ?? 0) >= 0 ? '+€' : '−€'}
                {focusResult.notionalDeltaEur !== null ? Math.abs(focusResult.notionalDeltaEur).toLocaleString('en-GB') : '—'}
              </span>
            </div>
            <span className="font-mono text-micro text-stone-400">
              Volume: {(consignment.volumeMWh ?? 120000).toLocaleString()} MWh/y
            </span>
          </div>

          {/* Certificate Component Delta */}
          <div className="bg-stone-950 p-3 flex flex-col gap-1">
            <span className="font-mono text-micro text-stone-400 uppercase">Certificate Leg</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-mono font-num text-lg font-bold text-stone-100">
                {focusResult.shockedCertificateValue !== null ? `€${focusResult.shockedCertificateValue.toFixed(2)}` : '—'}
              </span>
              <span className="text-micro text-stone-400">/MWh</span>
            </div>
            <div className="flex items-center gap-1 font-mono font-num text-micro mt-0.5">
              <span className="text-stone-400">Base: €{focusResult.baseCertificateValue?.toFixed(2) ?? '—'}</span>
              <span className="text-stone-500">·</span>
              <span className={`font-semibold ${
                (focusResult.certificateDeltaEurPerMwh ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {(focusResult.certificateDeltaEurPerMwh ?? 0) >= 0 ? '+' : ''}
                {focusResult.certificateDeltaEurPerMwh !== null ? `€${focusResult.certificateDeltaEurPerMwh.toFixed(2)}` : '—'}
              </span>
            </div>
          </div>

        </div>

        {/* Regulatory Uncertainty Range Corridor Bar (if uncertainty branches exist) */}
        {focusResult.uncertaintyRange && (
          <div className="p-2.5 bg-stone-900/60 border border-stone-800 rounded-xs flex flex-col gap-1.5">
            <div className="flex items-center justify-between font-mono text-micro">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>Statutory Uncertainty Range (§37a BImSchG 1× vs 2× branch)</span>
              </span>
              <span className="font-num text-stone-200">
                Spread: <strong className="text-sky-300">Δ €{focusResult.uncertaintyRange.deltaPerMwh.toFixed(2)}/MWh</strong>
              </span>
            </div>

            <div className="flex items-center justify-between text-meta font-mono text-stone-400">
              <span>Conservative (1×): €{focusResult.uncertaintyRange.low.toFixed(2)}/MWh</span>
              <span>Upside (2×): €{focusResult.uncertaintyRange.high.toFixed(2)}/MWh</span>
            </div>
          </div>
        )}

      </div>

      {/* Cross-Market Sensitivity Comparison Table */}
      <div className="flex flex-col flex-1 min-h-0 bg-stone-950">
        
        {/* Table Controls */}
        <div className="p-2.5 px-4 bg-stone-900 border-b border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-3.5 h-3.5 text-teal-400" />
            <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-300 uppercase">
              Cross-Market Simulation Matrix ({filteredRows.length} destinations)
            </span>
          </div>

          <div className="flex items-center gap-1 bg-stone-950 border border-stone-800 p-0.5 rounded-xs">
            {(['ALL', 'TRADEABLE', 'BLOCKED'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setTableFilter(tab)}
                className={`px-2 py-0.5 font-mono text-[10px] font-semibold rounded-xs cursor-pointer transition-colors ${
                  tableFilter === tab
                    ? 'bg-teal-600 text-teal-950 font-bold'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto overflow-y-auto max-h-[380px]">
          <table className="w-full text-left border-collapse font-sans">
            <thead className="sticky top-0 bg-stone-900 text-stone-400 font-mono text-micro uppercase tracking-wider border-b border-stone-800 z-10">
              <tr>
                <th className="py-2 px-3 font-semibold">Target Market</th>
                <th className="py-2 px-3 text-right font-semibold">Base Netback</th>
                <th className="py-2 px-3 text-right font-semibold">Shocked Netback</th>
                <th className="py-2 px-3 text-right font-semibold">Netback Δ</th>
                <th className="py-2 px-3 text-right font-semibold">Margin Δ</th>
                <th className="py-2 px-3 text-right font-semibold">Notional Variance</th>
                <th className="py-2 px-3 text-center font-semibold">Verdict</th>
                <th className="py-2 px-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono text-xs">
              {filteredRows.map(row => {
                const isCurrent = row.marketId === selectedMarket.id;
                const netDelta = row.netbackDeltaEurPerMwh ?? 0;
                const marginDelta = row.marginDeltaEurPerMwh ?? 0;
                const pnlDelta = row.notionalDeltaEur ?? 0;

                return (
                  <tr
                    key={row.marketId}
                    className={`hover:bg-stone-900/60 transition-colors ${
                      isCurrent ? 'bg-teal-950/20 border-l-2 border-teal-500' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-stone-200">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-stone-100">{row.marketName}</span>
                        <span className="text-micro text-stone-400 font-normal">({row.country})</span>
                      </div>
                    </td>

                    <td className="py-2 px-3 text-right font-num text-stone-400">
                      {row.baseNetback !== null ? `€${row.baseNetback.toFixed(2)}` : '—'}
                    </td>

                    <td className="py-2 px-3 text-right font-num font-semibold text-stone-100">
                      {row.shockedNetback !== null ? `€${row.shockedNetback.toFixed(2)}` : '—'}
                    </td>

                    <td className={`py-2 px-3 text-right font-num font-bold ${
                      netDelta > 0 ? 'text-emerald-400' : netDelta < 0 ? 'text-red-400' : 'text-stone-400'
                    }`}>
                      {netDelta > 0 ? '+' : ''}{row.netbackDeltaEurPerMwh !== null ? `€${row.netbackDeltaEurPerMwh.toFixed(2)}` : '—'}
                    </td>

                    <td className={`py-2 px-3 text-right font-num ${
                      marginDelta > 0 ? 'text-emerald-400' : marginDelta < 0 ? 'text-red-400' : 'text-stone-400'
                    }`}>
                      {marginDelta > 0 ? '+' : ''}{row.marginDeltaEurPerMwh !== null ? `€${row.marginDeltaEurPerMwh.toFixed(2)}` : '—'}
                    </td>

                    <td className={`py-2 px-3 text-right font-num font-semibold ${
                      pnlDelta > 0 ? 'text-emerald-400' : pnlDelta < 0 ? 'text-red-400' : 'text-stone-400'
                    }`}>
                      {pnlDelta > 0 ? '+€' : pnlDelta < 0 ? '−€' : '€'}
                      {row.notionalDeltaEur !== null ? Math.abs(pnlDelta).toLocaleString('en-GB') : '—'}
                    </td>

                    <td className="py-2 px-3 text-center">
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 border rounded-xs ${getVerdictBadgeStyle(row.shockedEligibilityVerdict)}`}>
                        {row.shockedEligibilityVerdict}
                      </span>
                    </td>

                    <td className="py-2 px-3 text-center">
                      {onSelectMarket && !isCurrent && (
                        <button
                          type="button"
                          onClick={() => onSelectMarket(row.marketId)}
                          className="px-2 py-0.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-teal-300 font-mono text-micro font-medium rounded-xs cursor-pointer transition-colors"
                        >
                          Select
                        </button>
                      )}
                      {isCurrent && (
                        <span className="text-micro font-mono text-teal-400">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Portfolio Summary Strip */}
        <div className="p-2.5 px-4 bg-stone-900 border-t border-stone-800 flex items-center justify-between text-micro font-mono text-stone-400">
          <div className="flex items-center gap-3">
            <span>
              Best Upside: <strong className="text-emerald-400 font-num">{scenarioComparison.bestUpsideMarket?.marketName ?? 'None'} ({scenarioComparison.maxNetbackDeltaEurPerMwh !== null && scenarioComparison.maxNetbackDeltaEurPerMwh > 0 ? `+€${scenarioComparison.maxNetbackDeltaEurPerMwh.toFixed(2)}` : '€0.00'})</strong>
            </span>
            <span>·</span>
            <span>
              Worst Downside: <strong className="text-red-400 font-num">{scenarioComparison.worstDownsideMarket?.marketName ?? 'None'} ({scenarioComparison.minNetbackDeltaEurPerMwh !== null && scenarioComparison.minNetbackDeltaEurPerMwh < 0 ? `€${scenarioComparison.minNetbackDeltaEurPerMwh.toFixed(2)}` : '€0.00'})</strong>
            </span>
          </div>

          <div className="font-num font-semibold text-stone-200">
            Total Portfolio Notional Delta: <span className={(scenarioComparison.totalPortfolioPnlDeltaEur ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {(scenarioComparison.totalPortfolioPnlDeltaEur ?? 0) >= 0 ? '+€' : '−€'}
              {scenarioComparison.totalPortfolioPnlDeltaEur !== null ? Math.abs(scenarioComparison.totalPortfolioPnlDeltaEur).toLocaleString('en-GB') : '0'}
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
