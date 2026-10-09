import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { LogisticsModal } from '../logistics/LogisticsModal';
import { LegalPackageModal, DocumentTab } from './LegalPackageModal';
import { showToast } from '../../app/DeskToastContainer';
import { downloadDealFile } from '../../domain/trade/legalPackage';
import { PoSUploaderModal } from './PoSUploaderModal';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import {
  DealStep,
  DEAL_STEPS,
  formatShortDate,
  ORIGINS,
  FEEDSTOCKS,
  SCHEMES,
  CUSTODIES,
  getVtpForMarket,
  getDefaultMarketForOrigin,
} from './options';
import { useDealInputs } from './hooks/useDealInputs';
import { useDealPricing } from './hooks/useDealPricing';
import { TradeHeader } from './TradeHeader';
import { TradeSummaryRail } from './TradeSummaryRail';
import { TradeStepperView } from './TradeStepperView';
import { TradeDeskGridView } from './TradeDeskGridView';
import './tradeBuilder.css';

export {
  ORIGINS,
  FEEDSTOCKS,
  SCHEMES,
  CUSTODIES,
  getVtpForMarket,
  getDefaultMarketForOrigin,
};

export function TradeBuilderScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, dispatch } = useAppState();

  const stepParam = Number(searchParams.get('step')) || 1;
  const currentStep = (stepParam >= 1 && stepParam <= DEAL_STEPS.length ? stepParam : 1) as DealStep;

  const modeParam = searchParams.get('mode') === 'grid' ? 'GRID' : 'STEPPER';
  const [flowMode, setFlowMode] = useState<'STEPPER' | 'GRID'>(modeParam);
  const isMobile = useIsMobile();
  // Mobile always uses the stepper flow (every input lives in its steps); the legacy 3-column grid is desktop-only.
  const showStepper = flowMode === 'STEPPER' || isMobile;
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  const [isLogisticsOpen, setIsLogisticsOpen] = useState(false);
  const [isLegalPackageOpen, setIsLegalPackageOpen] = useState(false);
  const [isPoSUploaderOpen, setIsPoSUploaderOpen] = useState(false);
  const [legalPackageTab, setLegalPackageTab] = useState<DocumentTab>('TERM_SHEET');
  const [justSavedId, setJustSavedId] = useState<string | null>(null);

  const dealInputs = useDealInputs(searchParams, setSearchParams, state.selectedMarketId, state.savedAssessments);
  const pricing = useDealPricing(dealInputs, state, dispatch);

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
    setPlantCommittedMwh,
    plantTotalMWh,
    schedule,
    handleApplyPoS,
    handleResetDeal,
  } = dealInputs;

  const {
    selectedMarket,
    statutorySurrenderDeadline,
    availablePlantCapacity,
    isOversubscribed,
    plantCommittedPct,
    isNonEuOrigin,
    effectiveUdbStatus,
    assessment,
    netback,
    ghgSavingPct,
    currentSide,
    waterfallRows,
    waterfallMax,
    grossTotal,
    deskMarginEurMwh,
    annualPnl,
    currentTradeAssessment,
    headerGateBadge,
    blockedBadgeTitle,
    netNetbackVal,
    molVal,
    certVal,
  } = pricing;

  const currentOriginObj = ORIGINS.find(o => o.code === origin) || ORIGINS[0];
  const currentFeedstockObj = FEEDSTOCKS.find(f => f.key === feedstockKey) || FEEDSTOCKS[0];
  const currentSchemeObj = SCHEMES.find(s => s.scheme === scheme) || SCHEMES[0];
  const currentCustodyObj = CUSTODIES.find(c => c.custody === chainOfCustody) || CUSTODIES[0];

  const handleStepChange = (step: DealStep) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('step', String(step));
      return next;
    });
  };

  const handleToggleMode = (mode: 'STEPPER' | 'GRID') => {
    setFlowMode(mode);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (mode === 'GRID') {
        next.set('mode', 'grid');
      } else {
        next.delete('mode');
      }
      return next;
    });
  };

  const handleOpenDocReview = (tab: DocumentTab) => {
    setLegalPackageTab(tab);
    setIsLegalPackageOpen(true);
  };

  const handleSaveDossier = () => {
    // Resaving an edited deal keeps whatever status it already reached in the blotter;
    // only a brand-new id starts at INDICATIVE.
    const existing = state.savedAssessments.find(a => a.id === currentTradeAssessment.id);
    dispatch({
      type: 'SAVE_ASSESSMENT',
      assessment: {
        ...currentTradeAssessment,
        status: existing?.status ?? 'INDICATIVE',
        statusHistory: existing?.statusHistory?.length
          ? existing.statusHistory
          : [{ status: 'INDICATIVE', at: currentTradeAssessment.createdAt }],
      },
    });
    showToast(`Saved to blotter · REF ${currentTradeAssessment.id}`);
    setJustSavedId(currentTradeAssessment.id);
  };

  const handleExportPdf = async () => {
    showToast('Preparing PDF…');
    try {
      const { generateEfetBiomethaneAnnexPdf } = await import('../../domain/trade/legalPackagePdf');
      const pdf = generateEfetBiomethaneAnnexPdf(currentTradeAssessment);
      downloadDealFile(`EFET_Annex_${selectedMarket.id}_${origin}.pdf`, pdf.output('blob'), 'application/pdf');
      showToast('EFET Annex PDF downloaded');
    } catch {
      showToast('Failed to generate EFET PDF');
    }
  };

  const handleExportTermSheetPdf = async () => {
    showToast('Preparing PDF…');
    try {
      const { generateCommercialTermSheetPdf } = await import('../../domain/trade/legalPackagePdf');
      const pdf = generateCommercialTermSheetPdf(currentTradeAssessment);
      downloadDealFile(`TermSheet_${selectedMarket.id}_${origin}.pdf`, pdf.output('blob'), 'application/pdf');
      showToast('Commercial Term Sheet PDF downloaded');
    } catch {
      showToast('Failed to generate Term Sheet PDF');
    }
  };

  const stepSummary: Record<DealStep, string> = {
    1: `${currentOriginObj.flag} ${currentOriginObj.name} · ${currentFeedstockObj.label} · ${currentSchemeObj.label} · ${currentCustodyObj.label} · CI ${ci} g/MJ`,
    2: `${volumeMwh.toLocaleString()} MWh · ${schedule.complianceYear} compliance · ${formatShortDate(schedule.deliveryStartDate)} – ${formatShortDate(schedule.deliveryEndDate)} · ${schedule.deliveryProfile.replace(/_/g, ' ').toLowerCase()}`,
    3: `${selectedMarket.name} · ${
      assessment.overallVerdict === 'ELIGIBLE'
        ? `${assessment.gates.length}/${assessment.gates.length} gates pass`
        : assessment.overallVerdict === 'HARD_BLOCK'
          ? 'blocked'
          : `${assessment.overallVerdict === 'CONDITIONAL' ? 'conditional' : assessment.overallVerdict === 'UNRESOLVED' ? 'unresolved' : 'unknown'} · ${assessment.gates.filter(g => g.verdict === 'PASS').length}/${assessment.gates.length} gates pass`
    }`,
    4: `Net netback ${netNetbackVal >= 0 ? '+' : '−'}€${Math.abs(netNetbackVal).toFixed(2)}/MWh · P&L ${netback.deskMargin !== null ? `€${annualPnl.toLocaleString()}` : '—'}`,
    5: '',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      {/* Top Deal Command Header & Stepper Bar */}
      <TradeHeader
        dealId={currentTradeAssessment.id}
        deal={deal}
        linkedPlant={linkedPlant}
        originFlag={currentOriginObj.flag}
        originName={currentOriginObj.name}
        feedstockLabel={currentFeedstockObj.label}
        netNetbackVal={netNetbackVal}
        annualPnl={annualPnl}
        deskMarginVal={netback.deskMargin}
        headerGateBadge={headerGateBadge}
        blockedBadgeTitle={blockedBadgeTitle}
        flowMode={flowMode}
        onToggleMode={handleToggleMode}
        onGoToGate={() => handleStepChange(3)}
      />

      {/* Mobile: sticky summary strip & sheet */}
      {isMobile && (
        <TradeSummaryRail
          isMobile={true}
          isTicketOpen={isTicketOpen}
          setIsTicketOpen={setIsTicketOpen}
          dealId={currentTradeAssessment.id}
          originFlag={currentOriginObj.flag}
          originCode={origin}
          originName={currentOriginObj.name}
          ticketMarketLabel={pricing.ticketMarketLabel}
          netback={netback}
          netNetbackVal={netNetbackVal}
          annualPnl={annualPnl}
          headerGateBadge={headerGateBadge}
          gates={assessment.gates}
          overallVerdict={assessment.overallVerdict}
          udbStatus={effectiveUdbStatus}
          posStatus={posStatus}
          ci={ci}
          ciProvenance={pricing.ciProvenance}
          ciIsManual={ciSource === 'manual'}
          volumeMwh={volumeMwh}
          volumeIsEstimated={deal.volumeIsEstimated}
          isTtfSimulated={pricing.isTtfSimulated}
          markSourceLabel={pricing.markSourceLabel}
          feedstockLabel={currentFeedstockObj.label}
          schemeLabel={currentSchemeObj.label}
          custodyLabel={currentCustodyObj.label}
          vintageLabel={schedule.vintagePreset === 'CAL_YEAR' ? `CAL ${schedule.complianceYear}` : `${schedule.vintagePreset} ${schedule.complianceYear}`}
          producerPricing={state.costs.producerPricing ?? null}
          onProducerPricingChange={pricing.handleProducerPricingChange}
          selectedMarket={selectedMarket}
          breakEvenMark={pricing.breakEvenMark}
          currentMark={pricing.currentMark}
          ticketSensitivities={pricing.ticketSensitivities}
          bestRoutes={pricing.bestRoutes}
          waterfallRows={waterfallRows}
          waterfallMax={waterfallMax}
          onSwitchMarket={setMarketId}
          onBuildDealPackage={() => handleStepChange(5)}
          onGoToGate={() => handleStepChange(3)}
        />
      )}

      {showStepper ? (
        <TradeStepperView
          currentStep={currentStep}
          onStepChange={handleStepChange}
          stepSummary={stepSummary}
          isMobile={isMobile}
          isTicketOpen={isTicketOpen}
          setIsTicketOpen={setIsTicketOpen}
          dealInputs={dealInputs}
          pricing={pricing}
          state={state}
          justSavedId={justSavedId}
          onOpenDocReview={handleOpenDocReview}
          onOpenLogistics={() => setIsLogisticsOpen(true)}
          onOpenPoS={() => setIsPoSUploaderOpen(true)}
          onSaveDossier={handleSaveDossier}
          onExportPdf={handleExportPdf}
          onExportTermSheetPdf={handleExportTermSheetPdf}
          onResetDeal={handleResetDeal}
          onNavigateDeals={() => navigate('/deals')}
        />
      ) : (
        /* Legacy 3-Column Desk Grid */
        <TradeDeskGridView
          origin={origin}
          setOrigin={setOrigin}
          currentOriginObj={currentOriginObj}
          feedstockKey={feedstockKey}
          setFeedstockKey={setFeedstockKey}
          currentFeedstockObj={currentFeedstockObj}
          scheme={scheme}
          setScheme={setScheme}
          currentSchemeObj={currentSchemeObj}
          chainOfCustody={chainOfCustody}
          setChainOfCustody={setChainOfCustody}
          currentCustodyObj={currentCustodyObj}
          udbStatus={dealInputs.udbStatus}
          setUdbStatus={dealInputs.setUdbStatus}
          effectiveUdbStatus={effectiveUdbStatus}
          isNonEuOrigin={isNonEuOrigin}
          posStatus={posStatus}
          setPosStatus={setPosStatus}
          ci={ci}
          setCi={setCi}
          ciSource={ciSource}
          setCiSource={setCiSource}
          ghgSavingPct={ghgSavingPct}
          volumeMwh={volumeMwh}
          setVolumeMwh={setVolumeMwh}
          plantTotalMWh={plantTotalMWh}
          plantCommittedMwh={plantCommittedMwh}
          setPlantCommittedMwh={setPlantCommittedMwh}
          availablePlantCapacity={availablePlantCapacity}
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
          deliveryProfile={schedule.deliveryProfile}
          setDeliveryProfile={schedule.setDeliveryProfile}
          monthlyRateMwh={pricing.monthlyRateMwh}
          dailyRateMwh={pricing.dailyRateMwh}
          statutorySurrenderDeadline={statutorySurrenderDeadline}
          deal={deal}
          linkedPlant={linkedPlant}
          setIsPoSUploaderOpen={setIsPoSUploaderOpen}
          marketId={marketId}
          setMarketId={setMarketId}
          selectedMarket={selectedMarket}
          assessment={assessment}
          netback={netback}
          netNetbackVal={netNetbackVal}
          currentSide={currentSide}
          waterfallRows={waterfallRows}
          waterfallMax={waterfallMax}
          grossTotal={grossTotal}
          deskMarginEurMwh={deskMarginEurMwh}
          annualPnl={annualPnl}
          currentTradeAssessment={currentTradeAssessment}
          handleSaveDossier={handleSaveDossier}
          justSavedId={justSavedId}
          handleOpenDocReview={handleOpenDocReview}
          handleExportPdf={handleExportPdf}
          handleExportTermSheetPdf={handleExportTermSheetPdf}
          setIsLogisticsOpen={setIsLogisticsOpen}
          onViewInBlotter={() => navigate('/deals')}
          molVal={molVal}
          certVal={certVal}
        />
      )}

      {/* EFET Term Sheet & Legal Package Preview Modal */}
      <LegalPackageModal
        isOpen={isLegalPackageOpen}
        onClose={() => setIsLegalPackageOpen(false)}
        assessment={currentTradeAssessment}
        initialTab={legalPackageTab}
      />

      {/* Delivery Playbook Modal */}
      <LogisticsModal
        isOpen={isLogisticsOpen}
        onClose={() => setIsLogisticsOpen(false)}
        originCountry={origin}
        targetCountry={selectedMarket.country}
      />

      {/* Automated PoS Ingestion Modal */}
      <PoSUploaderModal
        isOpen={isPoSUploaderOpen}
        onClose={() => setIsPoSUploaderOpen(false)}
        onApply={handleApplyPoS}
      />
    </div>
  );
}
