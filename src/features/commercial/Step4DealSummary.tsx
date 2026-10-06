import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { SourcedOpportunity } from './PlantScannerTable';
import { buildOpportunityDealUrl } from './dealUrl';
import { defaultVolumeMwh } from '../../domain/trade/dealDefaults';
import {
  computeOriginationBreakdown,
  fmtEurPerMwh,
  fmtEurTotal,
  ttfMarkLine,
  type PriceSource,
} from '../../domain/arbitrage/originationBreakdown';
import { originationRouteStatus } from '../../domain/arbitrage/routeStatus';
import { SourceChip } from '../../shared/ui/SourceChip';
import { RouteStatusBadge } from './RouteStatusBadge';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Printer, 
  RotateCcw, 
  Building2, 
  TrendingUp, 
  FileText, 
  ArrowLeft,
  ShieldCheck,
  Flame,
  ArrowRight,
  Zap,
  Scale
} from 'lucide-react';

interface Step4DealSummaryProps {
  request: ClientRequest;
  opportunity: SourcedOpportunity;
  onBack: () => void;
  onReset: () => void;
}

export function Step4DealSummary({
  request,
  opportunity,
  onBack,
  onReset
}: Step4DealSummaryProps) {
  const [copied, setCopied] = useState(false);
  const { state } = useAppState();
  const vol = request.volumeMwh || defaultVolumeMwh();
  const b = computeOriginationBreakdown({
    opportunity,
    volumeMwh: vol,
    marks: state.marks,
    costs: state.costs,
  });
  const {
    plantGateEur,
    gridLogisticsEur,
    transferEur,
    otherCostsEur,
    certificationEur,
    totalDeliveredCostEur,
    grossRevenueEur: totalGrossRevenueEur,
    gasIndexEur,
    certificateValueEur,
    netMarginEurPerMwh,
    totalDealProfitEur,
    totalDealCostEur,
    totalDealRevenueEur,
    isProfitable,
  } = b;
  const routeStatus = originationRouteStatus(opportunity.overallVerdict);
  const sourceChip = (src: PriceSource | null) =>
    src ? <SourceChip badge={src.badge} suffix={src.asOf ? `mark ${src.asOf}` : 'no date on record'} /> : null;
  const indicativeLine = `Indicative: ${ttfMarkLine(b)}`;
  const certSourceText = b.certificationSource ? ` [${b.certificationSource.badge.label}]` : '';
  const transferSourceText = b.transferSource ? ` [${b.transferSource.badge.label}]` : '';
  const gasSourceText = b.gasIndexSource ? ` [${b.gasIndexSource.badge.label}, ${b.gasIndexSource.asOf ?? 'no date'}]` : '';

  const dealRef = `BIO-${opportunity.originCountry}-${opportunity.targetCountry}-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toISOString().slice(0, 10);
  const periodLabel = request.delivery.type || 'FRONT_MONTH';

  const formattedSummary = `[BIOMETHANE INDICATIVE TERM SHEET]
Deal Ref: ${dealRef}
Date: ${dateStr}
${indicativeLine}
Route status: ${routeStatus === 'TRADEABLE' ? 'Tradeable (all eligibility gates cleared)' : routeStatus === 'REVIEW' ? 'REVIEW NEEDED (open eligibility conditions: ' + opportunity.eligibility.summary + ')' : 'Blocked'}

1. SOURCING & ROUTE${request.counterparty ? `
• Buyer: ${request.counterparty}` : ''}
• Origin Plant: ${opportunity.originPlantName || `${opportunity.originCountry} Sourced Plant`} (${opportunity.originCountry})
• Buyer Hub: ${opportunity.targetMarketName} (${opportunity.targetCountry})
• Substrate: ${opportunity.feedstockName} (CI: ${opportunity.carbonIntensity} gCO₂e/MJ${opportunity.ciIsOverridden ? ', your assumption' : ''})
• Volume: ${vol.toLocaleString()} MWh (${periodLabel} Delivery)
• Mode: Pipeline Grid Injection (Mass Balance)

2. COMMERCIAL PRICING & MARGINS
• Plant Gate Sourcing Price: ${fmtEurPerMwh(plantGateEur)} (${fmtEurTotal(plantGateEur * vol)})
• Grid & Transit Logistics: ${fmtEurPerMwh(gridLogisticsEur)} (${fmtEurTotal(gridLogisticsEur * vol)})
• Registry Transfer: ${transferEur === null ? 'Not set (excluded from delivered cost)' : `${fmtEurPerMwh(transferEur)} (${fmtEurTotal(transferEur * vol)})${transferSourceText}`}
${otherCostsEur !== null ? `• Other Costs: ${fmtEurPerMwh(otherCostsEur)} (${fmtEurTotal(otherCostsEur * vol)})
` : ''}• Mass Balance Proof: ${certificationEur === null ? 'Not set (excluded from delivered cost)' : `${fmtEurPerMwh(certificationEur)} (${fmtEurTotal(certificationEur * vol)})${certSourceText}`}
• Total Delivered Cost${b.deliveredCostExclCertification ? ' (excl. certification)' : ''}: ${fmtEurPerMwh(totalDeliveredCostEur)} (${fmtEurTotal(totalDealCostEur)})

• Wholesale Gas Offtake (TTF ${b.gasIndexSide}): ${gasIndexEur === null ? 'No TTF mark' : `${fmtEurPerMwh(gasIndexEur)} (${fmtEurTotal(gasIndexEur * vol)})${gasSourceText}`}
• ${b.brokerBundle ? `Certificate (broker bundle, certificate only; ${b.brokerBundle.source.badge.label}, ${b.brokerBundle.source.asOf ?? 'no date'})` : 'Green Certificate Premium'}: ${certificateValueEur === null ? '—' : `${fmtEurPerMwh(certificateValueEur)} (${fmtEurTotal(certificateValueEur * vol)})`}
${b.sideWarning ? `• WARNING: ${b.sideWarning}
` : ''}• Total Realizable Revenue${b.revenueExclMolecule ? ' (excl. gas: no TTF mark)' : ''}: ${fmtEurPerMwh(totalGrossRevenueEur)} (${fmtEurTotal(totalDealRevenueEur)})${b.brokerBundle ? `
• Broker bundle: certificate only, gas index (TTF) added on top` : ''}${b.netbackCapped ? `
• Held to €${b.netbackCapped.capEurPerMwh}/MWh (${b.netbackCapped.kind === 'OBSERVED_ALL_IN' ? 'observed all-in price on the deal' : 'unsourced desk estimate, not a market price'})` : ''}

3. NET COMMERCIAL SPREAD
• Net Margin: ${fmtEurPerMwh(netMarginEurPerMwh)}${b.marginSplit === 'DESK_POLICY' ? ' (desk-policy split)' : ''}
• INDICATIVE NET DEAL PROFIT: ${fmtEurTotal(totalDealProfitEur)}
`.trim();

  const handleCopy = () => {
    navigator.clipboard.writeText(formattedSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const navigate = useNavigate();

  const handleOpenTradeBuilder = () => {
    navigate(buildOpportunityDealUrl(opportunity, opportunity.targetMarketId, vol));
  };

  const handleVerifyStatutoryCompliance = () => {
    const plantVolume = opportunity.plantAnnualGWh ? Math.round(opportunity.plantAnnualGWh * 1000) : (vol || defaultVolumeMwh());
    window.dispatchEvent(
      new CustomEvent('open-compliance-auditor', {
        detail: {
          originCountry: opportunity.originCountry,
          targetMarketId: opportunity.targetMarketId,
                                      destinationMarket: opportunity.targetMarketId,
          feedstockCategory: opportunity.feedstockKey,
                                      feedstock: opportunity.feedstockKey,
          carbonIntensity: opportunity.carbonIntensity,
                                      ghgIntensity: opportunity.carbonIntensity,
          annualVolumeMWh: plantVolume,
                                      volumeMWh: plantVolume,
          counterparty: opportunity.legalEntityName || opportunity.originPlantName || 'European Biomethane Producer',
          plantName: opportunity.originPlantName,
          operatorName: opportunity.legalEntityName,
          gridOperator: opportunity.networkOperator,
          initialTab: 'GATE_BREAKDOWN',
          focusedGateIndex: 0,
        }
      })
    );
  };

  return (
    <div className="cf-step max-w-5xl mx-auto py-6 px-4">
      {/* Step Header */}
      <div className="mb-5">
        <div
          style={{
            borderRadius: 'var(--radius-control)',
            backgroundColor: 'var(--color-status-pass-bg)',
            borderColor: 'var(--color-status-pass-border)',
            color: 'var(--color-status-pass-ink)',
          }}
          className="cf-pill inline-flex items-center gap-2 px-3 py-1 border text-xs font-medium mb-2.5"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Step 4 of 4: Indicative deal structured
        </div>
        <h1 style={{ color: 'var(--color-text)' }} className="text-xl sm:text-2xl font-semibold mb-1.5">
          Indicative term sheet
        </h1>
        <p style={{ color: 'var(--color-muted)' }} className="text-xs sm:text-sm font-normal max-w-2xl">
          Economics are indicative and priced off the desk's marks, each tagged with its source and date. Nothing here is a firm price or a cleared route.
        </p>
      </div>

      {/* Main Container */}
      <div
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-line)',
          borderRadius: 'var(--radius-card)',
        }}
        className="border overflow-hidden shadow-xs mb-5"
      >
        {/* Deal Ref & Action Bar */}
        <div
          style={{
            backgroundColor: 'var(--color-bg)',
            borderColor: 'var(--color-line)',
          }}
          className="p-3.5 sm:p-4 border-b flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <span style={{ color: 'var(--color-muted)' }} className="text-xs font-medium">
              Reference: <span style={{ color: 'var(--color-text)' }} className="font-mono font-semibold">{dealRef}</span>
            </span>
            <RouteStatusBadge verdict={opportunity.overallVerdict} detail={opportunity.eligibility.summary} />
            <span className="chip chip-neutral" data-testid="indicative-chip">Indicative</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
                color: 'var(--color-text)',
              }}
              className="px-3 py-1.5 border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-track)]"
            >
              {copied ? <Check className="w-3.5 h-3.5" style={{ color: 'var(--color-status-pass-ink)' }} /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied term sheet' : 'Copy term sheet'}</span>
            </button>
          </div>
        </div>

        <div
          style={{ borderColor: 'var(--color-line)', color: 'var(--color-muted)' }}
          className="px-4 sm:px-5 py-2 border-b text-xs flex items-center gap-2 flex-wrap"
          data-testid="indicative-line"
        >
          <span className="font-medium">{indicativeLine}</span>
          {b.gasIndexSource && <SourceChip badge={b.gasIndexSource.badge} />}
          <Link to="/pricing" style={{ color: 'var(--color-accent)' }} className="font-medium hover:underline">Change in Pricing desk →</Link>
        </div>

        {/* Top Highlight Cards */}
        <div
          style={{ borderColor: 'var(--color-line)' }}
          className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--color-line)] border-b"
        >
          <div className="p-4 sm:p-5">
            <span style={{ color: 'var(--color-muted)' }} className="text-xs font-medium block">
              Order volume &amp; tenor
            </span>
            <span style={{ color: 'var(--color-text)' }} className="text-xl sm:text-2xl font-bold tabular-nums block mt-1">
              {vol.toLocaleString()} MWh
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-xs block mt-0.5">
              {periodLabel} delivery (2026)
            </span>
          </div>

          <div className="p-4 sm:p-5">
            <span style={{ color: 'var(--color-muted)' }} className="text-xs font-medium block">
              Delivered production cost
            </span>
            <span style={{ color: 'var(--color-pnl-neg)' }} className="text-xl sm:text-2xl font-bold tabular-nums block mt-1">
              {fmtEurPerMwh(totalDeliveredCostEur)}
            </span>
            <span style={{ color: 'var(--color-muted)' }} className="text-xs block mt-0.5 tabular-nums">
              Total: {fmtEurTotal(totalDealCostEur)}{b.deliveredCostExclCertification ? ' (excl. certification)' : ''}
            </span>
          </div>

          {/* Net profit: blue token */}
          <div
            style={{
              backgroundColor: isProfitable ? 'var(--color-status-info-bg)' : 'var(--color-status-fail-bg)',
            }}
            className="p-4 sm:p-5"
          >
            <span
              style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
              className="text-xs font-medium block"
            >
              Indicative net deal profit
            </span>
            <span
              style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
              className="text-2xl sm:text-3xl font-bold tabular-nums block mt-1 whitespace-nowrap"
            >
              {isProfitable ? '+' : ''}{fmtEurTotal(totalDealProfitEur)}
            </span>
            <span
              style={{ color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)' }}
              className="text-xs block mt-0.5 opacity-90"
            >
              Spread: <strong className="tabular-nums">{fmtEurPerMwh(netMarginEurPerMwh)}</strong>
            </span>
          </div>
        </div>

        {/* Details Breakdown */}
        <div className="p-5 sm:p-6 space-y-5">
          {/* Specifications */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
              }}
              className="p-3 border"
            >
              <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block mb-0.5">Source plant</span>
              <span style={{ color: 'var(--color-text)' }} className="font-semibold text-xs sm:text-sm block">{opportunity.originPlantName || `${opportunity.originCountry} Facility`}</span>
              <span style={{ color: 'var(--color-muted)' }} className="mt-0.5 block text-[11px]">Origin: {opportunity.originCountryName} ({opportunity.originCountry})</span>
              {opportunity.originPlantId && (
                <Link
                  to={`/plants?plant=${encodeURIComponent(opportunity.originPlantId)}`}
                  style={{ color: 'var(--color-accent)' }}
                  className="mt-1 inline-block text-[11px] font-medium hover:underline"
                  data-testid="producer-360-link"
                >
                  Producer 360 →
                </Link>
              )}
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
              }}
              className="p-3 border"
            >
              <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block mb-0.5">Buyer market</span>
              <span style={{ color: 'var(--color-text)' }} className="font-semibold text-xs sm:text-sm block">{opportunity.targetMarketName}</span>
              <span style={{ color: 'var(--color-muted)' }} className="mt-0.5 block text-[11px]">Destination: {opportunity.targetCountry}</span>
              {request.counterparty && (
                <span style={{ color: 'var(--color-muted)' }} className="mt-0.5 block text-[11px]" data-testid="step4-buyer-name">Buyer: {request.counterparty}</span>
              )}
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
              }}
              className="p-3 border"
            >
              <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block mb-0.5">Feedstock &amp; carbon intensity</span>
              <span style={{ color: 'var(--color-text)' }} className="font-semibold text-xs sm:text-sm block">{opportunity.feedstockName}</span>
              <span style={{ color: 'var(--color-text)' }} className="mt-0.5 block text-[11px] font-medium">
                CI: {opportunity.carbonIntensity} gCO₂e/MJ{opportunity.ciIsOverridden ? ' (your assumption)' : ''}
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--color-bg)',
                borderColor: 'var(--color-line)',
                borderRadius: 'var(--radius-control)',
              }}
              className="p-3 border"
            >
              <span style={{ color: 'var(--color-muted)' }} className="text-[10px] block mb-0.5">Logistics &amp; chain of custody</span>
              <span style={{ color: 'var(--color-text)' }} className="font-semibold text-xs sm:text-sm block">Pipeline grid injection</span>
              <span style={{ color: 'var(--color-muted)' }} className="mt-0.5 block text-[11px]">Mass balance via Union Database (UDB)</span>
            </div>
          </div>

          {/* Pricing Ledger Table */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
            }}
            className="border overflow-hidden text-xs shadow-2xs"
          >
            <div
              style={{
                backgroundColor: 'var(--color-track)',
                borderColor: 'var(--color-line)',
                color: 'var(--color-text)',
              }}
              className="p-3 border-b font-semibold text-xs"
            >
              Complete accounting ledger
            </div>
            <table className="w-full text-left">
              <tbody style={{ color: 'var(--color-text)' }} className="divide-y divide-[var(--color-line)]">
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">1. Plant gate sourcing cost</td>
                  <td className="p-3 text-right font-medium tabular-nums">{fmtEurPerMwh(plantGateEur)}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{fmtEurTotal(plantGateEur * vol)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">2. Grid entry/exit &amp; transit tariffs</td>
                  <td style={{ color: 'var(--color-pnl-neg)' }} className="p-3 text-right font-medium tabular-nums">{fmtEurPerMwh(gridLogisticsEur)}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{fmtEurTotal(gridLogisticsEur * vol)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">
                    3. Registry transfer (GO transfer / ERGaR / cancellation){' '}
                    {transferEur === null ? null : sourceChip(b.transferSource)}
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{transferEur === null ? 'Not set' : fmtEurPerMwh(transferEur)}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{transferEur === null ? '—' : fmtEurTotal(transferEur * vol)}</td>
                </tr>
                {otherCostsEur !== null && (
                  <tr>
                    <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">
                      Other costs{' '}
                      {sourceChip(b.otherCostsSource)}
                    </td>
                    <td className="p-3 text-right font-medium tabular-nums">{fmtEurPerMwh(otherCostsEur)}</td>
                    <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{fmtEurTotal(otherCostsEur * vol)}</td>
                  </tr>
                )}
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">
                    4. Mass balance &amp; proof of sustainability{' '}
                    {sourceChip(b.certificationSource)}
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{certificationEur === null ? 'Not set' : fmtEurPerMwh(certificationEur)}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{certificationEur === null ? '—' : fmtEurTotal(certificationEur * vol)}</td>
                </tr>
                <tr style={{ backgroundColor: 'var(--color-bg)' }} className="font-semibold">
                  <td className="p-3">Total delivered cost (debits){b.deliveredCostExclCertification ? ' (excl. certification)' : ''}</td>
                  <td style={{ color: 'var(--color-pnl-neg)' }} className="p-3 text-right tabular-nums">{fmtEurPerMwh(totalDeliveredCostEur)}</td>
                  <td style={{ color: 'var(--color-pnl-neg)' }} className="p-3 text-right tabular-nums">{fmtEurTotal(totalDealCostEur)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">
                    5. Wholesale gas offtake (TTF index, {b.gasIndexSide}){' '}
                    {gasIndexEur === null ? <span style={{ color: 'var(--color-pnl-neg)' }}>No TTF mark</span> : sourceChip(b.gasIndexSource)}
                  </td>
                  <td className="p-3 text-right font-medium tabular-nums">{fmtEurPerMwh(gasIndexEur)}</td>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 text-right tabular-nums">{gasIndexEur === null ? '—' : fmtEurTotal(gasIndexEur * vol)}</td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--color-muted)' }} className="p-3 font-normal">
                    6. {opportunity.targetMarketName} {b.brokerBundle ? 'certificate (broker bundle, certificate only)' : 'certificate premium'}{' '}
                    {b.brokerBundle && sourceChip(b.brokerBundle.source)}
                    {b.sideWarning && (
                      <span className="chip chip-warn ml-1.5" data-testid="cert-side-warning">{b.sideWarning}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--color-pnl-pos)' }} className="p-3 text-right font-medium tabular-nums">{fmtEurPerMwh(certificateValueEur)}</td>
                  <td style={{ color: 'var(--color-pnl-pos)' }} className="p-3 text-right tabular-nums">{certificateValueEur === null ? '—' : fmtEurTotal(certificateValueEur * vol)}</td>
                </tr>
                <tr style={{ backgroundColor: 'var(--color-bg)' }} className="font-semibold">
                  <td className="p-3">Total realizable revenue (credits){b.revenueExclMolecule ? ' (excl. gas: no TTF mark)' : ''}</td>
                  <td style={{ color: 'var(--color-text)' }} className="p-3 text-right tabular-nums">{fmtEurPerMwh(totalGrossRevenueEur)}</td>
                  <td style={{ color: 'var(--color-text)' }} className="p-3 text-right tabular-nums">{fmtEurTotal(totalDealRevenueEur)}</td>
                </tr>
                {b.brokerBundle && (
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--color-muted)' }} className="p-3 text-[11px] font-medium">
                      Broker bundle: certificate only, with the gas index (TTF) added on top. The modelled quota value{b.brokerBundle.modelledNetbackEurPerMwh !== null ? ` (netback ${fmtEurPerMwh(b.brokerBundle.modelledNetbackEurPerMwh)})` : ''} is not what a buyer pays.
                    </td>
                  </tr>
                )}
                {b.netbackCapped && (
                  <tr>
                    <td colSpan={3} style={{ color: 'var(--color-status-warn-text)' }} className="p-3 text-[11px] font-medium">
                      Held to €{b.netbackCapped.capEurPerMwh}/MWh ({b.netbackCapped.kind === 'OBSERVED_ALL_IN' ? 'observed all-in price on the deal' : 'unsourced desk estimate, not a market price'}).{b.netbackCapped.theoreticalEurPerMwh !== null ? ` Modelled netback: ${fmtEurPerMwh(b.netbackCapped.theoreticalEurPerMwh)}.` : ''}
                    </td>
                  </tr>
                )}
                {/* Net spread: blue token */}
                <tr
                  style={{
                    backgroundColor: isProfitable ? 'var(--color-status-info-bg)' : 'var(--color-status-fail-bg)',
                    color: isProfitable ? 'var(--color-pnl-pos)' : 'var(--color-pnl-neg)',
                  }}
                  className="font-bold text-xs sm:text-sm"
                >
                  <td className="p-3 pl-3">Net commercial deal spread (indicative)</td>
                  <td className="p-3 text-right tabular-nums">{fmtEurPerMwh(netMarginEurPerMwh)}</td>
                  <td className="p-3 text-right pr-3 tabular-nums">{fmtEurTotal(totalDealProfitEur)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Navigation & Reset Actions */}
      <div
        style={{ borderColor: 'var(--color-line)' }}
        className="m-sticky-actions cf-actions cf-actions-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t"
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-line)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--color-text)',
          }}
          className="px-4 py-2 border text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer hover:bg-[var(--color-track)]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to route &amp; costs</span>
        </button>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={onReset}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-text)',
            }}
            className="px-3.5 py-2 border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-[var(--color-track)]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New order</span>
          </button>

          <button
            type="button"
            onClick={handleVerifyStatutoryCompliance}
            style={{
              backgroundColor: 'var(--color-track)',
              borderColor: 'var(--color-line)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--color-text)',
            }}
            className="px-3.5 py-2 border text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs hover:opacity-80"
            title="Verify statutory compliance and 6-gate clearance before offtake finalization"
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Verify statutory compliance</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTradeBuilder}
            style={{
              backgroundColor: 'var(--color-accent)',
              borderRadius: 'var(--radius-control)',
              color: '#ffffff',
            }}
            className="px-6 py-2.5 text-xs font-semibold transition-all shadow-xs hover:opacity-90 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Open in Trade Builder</span>
          </button>
        </div>
      </div>
    </div>
  );
}
