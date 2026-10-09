import React from 'react';
import { ArrowRight } from 'lucide-react';
import { FlowSteps } from '../../shared/ui/FlowSteps';
import { DealStep, DEAL_STEPS, ORIGINS, FEEDSTOCKS, SCHEMES, CUSTODIES } from './options';
import { TradeConsignmentStep } from './steps/TradeConsignmentStep';
import { TradeMarketAuditStep } from './steps/TradeMarketAuditStep';
import { TradeEconomicsStep } from './steps/TradeEconomicsStep';
import { TradeExecutionStep } from './steps/TradeExecutionStep';
import { TradeSummaryRail } from './TradeSummaryRail';
import { DocumentTab } from './LegalPackageModal';
import { useDealInputs } from './hooks/useDealInputs';
import { useDealPricing } from './hooks/useDealPricing';
import { AppState } from '../../store/state';
import { focusFieldWhenReady } from './custody/checklistModel';

interface TradeStepperViewProps {
  currentStep: DealStep;
  onStepChange: (step: DealStep) => void;
  stepSummary: Record<DealStep, string>;
  isMobile: boolean;
  isTicketOpen: boolean;
  setIsTicketOpen: (open: boolean) => void;
  dealInputs: ReturnType<typeof useDealInputs>;
  pricing: ReturnType<typeof useDealPricing>;
  state: AppState;
  justSavedId: string | null;
  onOpenDocReview: (tab: DocumentTab) => void;
  onOpenLogistics: () => void;
  onOpenPoS: () => void;
  onSaveDossier: () => void;
  onExportPdf: () => void;
  onExportTermSheetPdf: () => void;
  onResetDeal: () => void;
  onNavigateDeals: () => void;
}

export const TradeStepperView: React.FC<TradeStepperViewProps> = ({
  currentStep,
  onStepChange,
  stepSummary,
  isMobile,
  isTicketOpen,
  setIsTicketOpen,
  dealInputs,
  pricing,
  state,
  justSavedId,
  onOpenDocReview,
  onOpenLogistics,
  onOpenPoS,
  onSaveDossier,
  onExportPdf,
  onExportTermSheetPdf,
  onResetDeal,
  onNavigateDeals,
}) => {
  const {
    deal,
    linkedPlant,
    origin,
    setOrigin,
    feedstockKey,
    setFeedstockKey,
    scheme,
    setScheme,
    chainOfCustody,
    setChainOfCustody,
    posStatus,
    setPosStatus,
    ci,
    setCi,
    ciSource,
    setCiSource,
    marketId,
    setMarketId,
    volumeMwh,
    setVolumeMwh,
    plantCommittedMwh,
    plantTotalMWh,
    custody,
    patchCustody,
    schedule,
  } = dealInputs;

  const {
    selectedMarket,
    statutorySurrenderDeadline,
    availablePlantCapacity,
    isOversubscribed,
    plantCommittedPct,
    effectiveUdbStatus,
    assessment,
    cocGate,
    gge,
    routeCosts,
    netback,
    currentMark,
    breakEvenMark,
    ticketSensitivities,
    bestRoutes,
    handleProducerPricingChange,
    ghgSavingPct,
    currentSide,
    waterfallRows,
    waterfallMax,
    grossTotal,
    deskMarginEurMwh,
    annualPnl,
    currentTradeAssessment,
    headerGateBadge,
    ciProvenance,
    ticketMarketLabel,
    netNetbackVal,
    isTtfSimulated,
    markSourceLabel,
    transitLabel,
  } = pricing;

  const currentOriginObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
  const currentFeedstockObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
  const currentSchemeObj = SCHEMES.find(s => s.scheme === scheme) || SCHEMES[0];
  const currentCustodyObj = CUSTODIES.find(c => c.custody === chainOfCustody) || CUSTODIES[0];

  // A checklist row's fix link: the custody fields live in the product step.
  const handleFixField = (fieldId: string) => {
    onStepChange(1);
    focusFieldWhenReady(fieldId);
  };

  const nextAction = (step: DealStep) => (
    <div className="tb-step-actions m-sticky-actions">
      <button type="button" className="btn btn-primary" onClick={() => onStepChange((step + 1) as DealStep)}>
        {DEAL_STEPS[step - 1].next} <ArrowRight size={14} />
      </button>
    </div>
  );

  return (
    <div className="tb-deal-layout">
      <div className="ds-flow-column tb-flow">
        <FlowSteps
          steps={DEAL_STEPS.map(({ id, label }) => ({ id, label, summary: stepSummary[id] }))}
          current={currentStep}
          onSelect={onStepChange}
          ariaLabel="Deal flow steps"
          renderBody={id => {
            switch (id) {
              case 1:
              case 2:
                return (
                  <>
                    <TradeConsignmentStep
                      origin={origin}
                      setOrigin={setOrigin}
                      origins={ORIGINS}
                      currentOriginObj={currentOriginObj}
                      feedstockKey={feedstockKey}
                      setFeedstockKey={setFeedstockKey}
                      feedstocks={FEEDSTOCKS}
                      currentFeedstockObj={currentFeedstockObj}
                      scheme={scheme}
                      setScheme={setScheme}
                      schemes={SCHEMES}
                      currentSchemeObj={currentSchemeObj}
                      chainOfCustody={chainOfCustody}
                      setChainOfCustody={setChainOfCustody}
                      custodies={CUSTODIES}
                      currentCustodyObj={currentCustodyObj}
                      udbStatus={effectiveUdbStatus}
                      setUdbStatus={dealInputs.setUdbStatus}
                      posStatus={posStatus}
                      setPosStatus={setPosStatus}
                      ci={ci}
                      setCi={setCi}
                      ghgSavingPct={ghgSavingPct}
                      volumeMwh={volumeMwh}
                      setVolumeMwh={setVolumeMwh}
                      plantTotalMWh={plantTotalMWh}
                      plantCommittedMwh={plantCommittedMwh}
                      availablePlantCapacity={availablePlantCapacity}
                      ciProvenance={ciProvenance}
                      onCiSourceChange={setCiSource}
                      isOversubscribed={isOversubscribed}
                      plantCommittedPct={plantCommittedPct}
                      complianceYear={schedule.complianceYear}
                      handleComplianceYearChange={schedule.handleComplianceYearChange}
                      vintagePreset={schedule.vintagePreset}
                      handleVintagePreset={schedule.handleVintagePreset}
                      prodStartDate={schedule.prodStartDate}
                      setProdStartDate={schedule.setProdStartDate}
                      prodEndDate={schedule.prodEndDate}
                      setProdEndDate={schedule.setProdEndDate}
                      deliveryStartDate={schedule.deliveryStartDate}
                      setDeliveryStartDate={schedule.setDeliveryStartDate}
                      deliveryEndDate={schedule.deliveryEndDate}
                      setDeliveryEndDate={schedule.setDeliveryEndDate}
                      deliveryProfile={schedule.deliveryProfile}
                      setDeliveryProfile={schedule.setDeliveryProfile}
                      selectedMarket={selectedMarket}
                      statutorySurrenderDeadline={statutorySurrenderDeadline}
                      deal={deal}
                      linkedPlant={linkedPlant}
                      onOpenPoS={onOpenPoS}
                      custody={custody}
                      onCustodyChange={patchCustody}
                      cocGate={cocGate}
                      onViewChecklist={() => onStepChange(3)}
                      section={id === 1 ? 'PRODUCT' : 'SCHEDULE'}
                    />
                    {nextAction(id)}
                  </>
                );
              case 3:
                return (
                  <>
                    <TradeMarketAuditStep
                      marketId={marketId}
                      setMarketId={setMarketId}
                      selectedMarket={selectedMarket}
                      assessment={assessment}
                      ghgSavingPct={ghgSavingPct}
                      origin={origin}
                      custody={custody}
                      onFixField={handleFixField}
                    />
                    {nextAction(3)}
                  </>
                );
              case 4:
                return (
                  <>
                    <TradeEconomicsStep
                      netback={netback}
                      costs={routeCosts}
                      selectedMarket={selectedMarket}
                      currentSide={currentSide}
                      netNetbackVal={netNetbackVal}
                      waterfallRows={waterfallRows}
                      waterfallMax={waterfallMax}
                      volumeMwh={volumeMwh}
                      grossTotal={grossTotal}
                      deskMarginEurMwh={deskMarginEurMwh}
                      annualPnl={annualPnl}
                      origin={origin}
                      isTtfSimulated={isTtfSimulated}
                      transitLabel={transitLabel}
                    />
                    {nextAction(4)}
                  </>
                );
              default:
                return (
                  <TradeExecutionStep
                    currentTradeAssessment={currentTradeAssessment}
                    selectedMarket={selectedMarket}
                    origin={origin}
                    volumeMwh={volumeMwh}
                    netNetbackVal={netNetbackVal}
                    deskMarginEurMwh={deskMarginEurMwh}
                    annualPnl={annualPnl}
                    onOpenDocReview={onOpenDocReview}
                    onOpenLogistics={onOpenLogistics}
                    onSaveDossier={onSaveDossier}
                    justSaved={justSavedId === currentTradeAssessment.id}
                    onViewInBlotter={onNavigateDeals}
                    onExportPdf={onExportPdf}
                    onExportTermSheetPdf={onExportTermSheetPdf}
                    onReset={onResetDeal}
                  />
                );
            }
          }}
        />
      </div>

      {isMobile ? null : (
        <TradeSummaryRail
          isMobile={false}
          isTicketOpen={isTicketOpen}
          setIsTicketOpen={setIsTicketOpen}
          dealId={currentTradeAssessment.id}
          originFlag={currentOriginObj.flag}
          originCode={origin}
          originName={currentOriginObj.name}
          ticketMarketLabel={ticketMarketLabel}
          netback={netback}
          netNetbackVal={netNetbackVal}
          annualPnl={annualPnl}
          headerGateBadge={headerGateBadge}
          gates={assessment.gates}
          overallVerdict={assessment.overallVerdict}
          udbStatus={effectiveUdbStatus}
          posStatus={posStatus}
          ci={ci}
          ciProvenance={ciProvenance}
          ciIsManual={ciSource === 'manual'}
          volumeMwh={volumeMwh}
          volumeIsEstimated={deal.volumeIsEstimated}
          isTtfSimulated={isTtfSimulated}
          markSourceLabel={markSourceLabel}
          feedstockLabel={currentFeedstockObj.label}
          schemeLabel={currentSchemeObj.label}
          custodyLabel={currentCustodyObj.label}
          vintageLabel={schedule.vintagePreset === 'CAL_YEAR' ? `CAL ${schedule.complianceYear}` : `${schedule.vintagePreset} ${schedule.complianceYear}`}
          producerPricing={state.costs.producerPricing ?? null}
          onProducerPricingChange={handleProducerPricingChange}
          selectedMarket={selectedMarket}
          breakEvenMark={breakEvenMark}
          currentMark={currentMark}
          ticketSensitivities={ticketSensitivities}
          bestRoutes={bestRoutes}
          waterfallRows={waterfallRows}
          waterfallMax={waterfallMax}
          onSwitchMarket={setMarketId}
          onBuildDealPackage={() => onStepChange(5)}
          onGoToGate={() => onStepChange(3)}
          gge={gge}
        />
      )}
    </div>
  );
};
