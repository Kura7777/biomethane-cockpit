import { ChevronUp } from 'lucide-react';
import { Sheet } from '../../shared/ui';
import { DealTicket, BestRouteEntry, SensitivityDeltas } from './DealTicket';
import { GateBadge } from './ticketMath';
import { WaterfallRow } from './steps/TradeEconomicsStep';
import { ProducerPricing, NetbackResult } from '../../domain/netback/types';
import { Market } from '../../domain/markets/types';
import { UDBStatus, PoSStatus } from '../../domain/consignment/types';
import { GateResult } from '../../domain/eligibility/types';
import { GgeBreakdown } from '../../domain/netback/gge';

interface TradeSummaryRailProps {
  isMobile: boolean;
  isTicketOpen: boolean;
  setIsTicketOpen: (open: boolean) => void;
  dealId: string;
  originFlag: string;
  originCode: string;
  originName: string;
  ticketMarketLabel: string;
  netback: NetbackResult;
  netNetbackVal: number;
  annualPnl: number;
  headerGateBadge: GateBadge;
  gates: GateResult[];
  overallVerdict: string;
  udbStatus: UDBStatus;
  posStatus: PoSStatus;
  ci: number;
  ciProvenance: 'pos' | 'estimated' | null;
  ciIsManual: boolean;
  volumeMwh: number;
  volumeIsEstimated?: boolean;
  isTtfSimulated: boolean;
  markSourceLabel: string | null;
  feedstockLabel: string;
  schemeLabel: string;
  custodyLabel: string;
  vintageLabel: string;
  producerPricing: ProducerPricing | null;
  onProducerPricingChange: (patch: Partial<ProducerPricing>) => void;
  selectedMarket: Market;
  breakEvenMark: number | null;
  currentMark: number | null;
  ticketSensitivities: SensitivityDeltas | null;
  bestRoutes: BestRouteEntry[];
  waterfallRows: WaterfallRow[];
  waterfallMax: number;
  onSwitchMarket: (id: string) => void;
  onBuildDealPackage: () => void;
  onGoToGate: () => void;
  gge?: GgeBreakdown | null;
}

export function TradeSummaryRail({
  isMobile,
  isTicketOpen,
  setIsTicketOpen,
  dealId,
  originFlag,
  originCode,
  originName,
  ticketMarketLabel,
  netback,
  netNetbackVal,
  annualPnl,
  headerGateBadge,
  gates,
  overallVerdict,
  udbStatus,
  posStatus,
  ci,
  ciProvenance,
  ciIsManual,
  volumeMwh,
  volumeIsEstimated,
  isTtfSimulated,
  markSourceLabel,
  feedstockLabel,
  schemeLabel,
  custodyLabel,
  vintageLabel,
  producerPricing,
  onProducerPricingChange,
  selectedMarket,
  breakEvenMark,
  currentMark,
  ticketSensitivities,
  bestRoutes,
  waterfallRows,
  waterfallMax,
  onSwitchMarket,
  onBuildDealPackage,
  onGoToGate,
  gge,
}: TradeSummaryRailProps) {
  const headlineTone = netNetbackVal >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)';
  const pnlTone = (netback.deskMargin ?? 0) >= 0 ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)';

  const renderTicket = (closeSheet: boolean) => (
    <DealTicket
      ciIsManual={ciIsManual}
      dealId={dealId}
      originFlag={originFlag}
      originCode={originCode}
      originName={originName}
      marketLabel={ticketMarketLabel}
      netback={netback}
      volumeMwh={volumeMwh}
      volumeIsEstimated={volumeIsEstimated}
      annualPnl={annualPnl}
      gates={gates}
      overallVerdict={overallVerdict}
      udbStatus={udbStatus}
      posStatus={posStatus}
      ci={ci}
      ciProvenance={ciProvenance}
      isTtfSimulated={isTtfSimulated}
      markSourceLabel={markSourceLabel}
      onBuildDealPackage={() => {
        if (closeSheet) setIsTicketOpen(false);
        onBuildDealPackage();
      }}
      onGoToGate={() => {
        if (closeSheet) setIsTicketOpen(false);
        onGoToGate();
      }}
      feedstockLabel={feedstockLabel}
      schemeLabel={schemeLabel}
      custodyLabel={custodyLabel}
      vintageLabel={vintageLabel}
      producerPricing={producerPricing}
      onProducerPricingChange={onProducerPricingChange}
      marketUnitLabel={selectedMarket.unitLabel}
      breakEvenMark={breakEvenMark}
      currentMark={currentMark}
      sensitivities={ticketSensitivities}
      bestRoutes={bestRoutes}
      onSwitchMarket={onSwitchMarket}
      gge={gge}
    />
  );

  if (isMobile) {
    return (
      <>
        <button
          type="button"
          className="tb-strip"
          onClick={() => setIsTicketOpen(true)}
          aria-haspopup="dialog"
          aria-label="Open deal ticket and waterfall"
          data-testid="tb-summary-strip"
        >
          <span className="tb-strip-cell">
            <span className="tb-strip-label">Netback</span>
            <span className="tb-strip-value num" style={{ color: headlineTone }}>
              {netNetbackVal >= 0 ? `+€${netNetbackVal.toFixed(2)}` : `−€${Math.abs(netNetbackVal).toFixed(2)}`}
              <span className="tb-strip-unit">/MWh</span>
            </span>
          </span>
          <span className="tb-strip-cell">
            <span className="tb-strip-label">P&amp;L</span>
            <span className="tb-strip-value num" style={{ color: pnlTone }}>
              {netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}
            </span>
          </span>
          <span className="tb-strip-cell tb-strip-gate">
            <span className="tb-strip-label">Gates</span>
            <span className={`tb-strip-badge ${headerGateBadge.tone}`}>
              ● {headerGateBadge.label.split(' · ')[0]}
            </span>
          </span>
          <ChevronUp size={18} className="tb-strip-chevron" aria-hidden="true" />
        </button>
        <Sheet
          open={isTicketOpen}
          onClose={() => setIsTicketOpen(false)}
          title="Deal ticket"
          subtitle={`${originFlag} ${originCode} → ${ticketMarketLabel}`}
          variant="full"
          testId="tb-ticket-sheet"
        >
          <div className="tb-sheet-waterfall">
            <div className="tt-subhead">Netback waterfall · EUR / MWh</div>
            <div className="tb-waterfall">
              {waterfallRows.map((w, wIdx) => {
                const barPct = Math.min(100, (w.num / waterfallMax) * 100);
                return (
                  <div key={wIdx} className="tb-waterfall-row">
                    <span className="tb-waterfall-label">{w.label}</span>
                    <div className="tb-waterfall-track">
                      <div className={`tb-waterfall-bar ${w.kind}`} style={{ width: `${barPct}%` }} />
                    </div>
                    <span className="tb-waterfall-value tb-num">{w.val}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {renderTicket(true)}
        </Sheet>
      </>
    );
  }

  return (
    <div className="tb-ticket-rail">
      {renderTicket(false)}
    </div>
  );
}
