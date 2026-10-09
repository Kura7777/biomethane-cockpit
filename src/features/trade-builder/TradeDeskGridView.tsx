import { CertificationScheme, ChainOfCustody, UDBStatus, PoSStatus, DeliveryProfile, CustodyPack } from '../../domain/consignment/types';
import { Market } from '../../domain/markets/types';
import { TradeAssessment } from '../../domain/trade/types';
import { EligibilityAssessment, GateResult } from '../../domain/eligibility/types';
import { NetbackResult } from '../../domain/netback/types';
import { GgeBreakdown } from '../../domain/netback/gge';
import { DealParams } from '../../domain/trade/dealParams';
import { BiomethanePlant } from '../../domain/plants/types';
import { DocumentTab } from './LegalPackageModal';
import { WaterfallRow } from './steps/TradeEconomicsStep';
import { ORIGINS, FEEDSTOCKS, SCHEMES, CUSTODIES } from './options';
import { TradeGridConsignmentCol } from './grid/TradeGridConsignmentCol';
import { TradeGridDestinationCol } from './grid/TradeGridDestinationCol';
import { TradeGridNetbackCol } from './grid/TradeGridNetbackCol';

interface TradeDeskGridViewProps {
  origin: string;
  setOrigin: (origin: string) => void;
  currentOriginObj: typeof ORIGINS[0];
  feedstockKey: string;
  setFeedstockKey: (key: string) => void;
  currentFeedstockObj: typeof FEEDSTOCKS[0];
  scheme: CertificationScheme;
  setScheme: (scheme: CertificationScheme) => void;
  currentSchemeObj: typeof SCHEMES[0];
  chainOfCustody: ChainOfCustody;
  setChainOfCustody: (coc: ChainOfCustody) => void;
  currentCustodyObj: typeof CUSTODIES[0];
  udbStatus: UDBStatus;
  setUdbStatus: (status: UDBStatus) => void;
  effectiveUdbStatus: UDBStatus;
  isNonEuOrigin: boolean;
  posStatus: PoSStatus;
  setPosStatus: (status: PoSStatus) => void;
  ci: number;
  setCi: (ci: number) => void;
  ciSource: 'deal' | 'estimate' | 'pos' | 'manual';
  setCiSource: (source: 'deal' | 'estimate' | 'pos' | 'manual') => void;
  ghgSavingPct: number;
  ghgComparator: number;
  volumeMwh: number;
  setVolumeMwh: (vol: number) => void;
  plantTotalMWh: number | null;
  plantCommittedMwh: number;
  setPlantCommittedMwh: (vol: number) => void;
  availablePlantCapacity: number | null;
  isOversubscribed: boolean;
  plantCommittedPct: number | null;
  complianceYear: number;
  handleComplianceYearChange: (yr: number) => void;
  vintagePreset: string;
  handleVintagePreset: (preset: string) => void;
  prodStartDate: string;
  setProdStartDate: (date: string) => void;
  prodEndDate: string;
  setProdEndDate: (date: string) => void;
  deliveryProfile: DeliveryProfile;
  setDeliveryProfile: (profile: DeliveryProfile) => void;
  monthlyRateMwh: number;
  dailyRateMwh: number;
  statutorySurrenderDeadline: string;
  deal: Partial<DealParams>;
  linkedPlant: BiomethanePlant | null | undefined;
  setIsPoSUploaderOpen: (open: boolean) => void;
  marketId: string;
  setMarketId: (id: string) => void;
  selectedMarket: Market;
  assessment: EligibilityAssessment;
  netback: NetbackResult;
  netNetbackVal: number;
  currentSide: string;
  waterfallRows: WaterfallRow[];
  waterfallMax: number;
  grossTotal: number;
  deskMarginEurMwh: string;
  annualPnl: number;
  currentTradeAssessment: TradeAssessment;
  handleSaveDossier: () => void;
  justSavedId: string | null;
  handleOpenDocReview: (tab: DocumentTab) => void;
  handleExportPdf: () => void;
  handleExportTermSheetPdf: () => void;
  setIsLogisticsOpen: (open: boolean) => void;
  onViewInBlotter: () => void;
  molVal: number;
  certVal: number;
  custody: CustodyPack | null;
  onCustodyChange: (patch: (c: CustodyPack) => CustodyPack) => void;
  cocGate?: GateResult;
  gge?: GgeBreakdown | null;
}

export function TradeDeskGridView(props: TradeDeskGridViewProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        minHeight: 0,
        flex: 1,
        overflowY: 'auto',
      }}
    >
      {/* ─── Column 1: Consignment ─── */}
      <TradeGridConsignmentCol
        origin={props.origin}
        setOrigin={props.setOrigin}
        currentOriginObj={props.currentOriginObj}
        feedstockKey={props.feedstockKey}
        setFeedstockKey={props.setFeedstockKey}
        currentFeedstockObj={props.currentFeedstockObj}
        scheme={props.scheme}
        setScheme={props.setScheme}
        currentSchemeObj={props.currentSchemeObj}
        chainOfCustody={props.chainOfCustody}
        setChainOfCustody={props.setChainOfCustody}
        currentCustodyObj={props.currentCustodyObj}
        udbStatus={props.udbStatus}
        setUdbStatus={props.setUdbStatus}
        isNonEuOrigin={props.isNonEuOrigin}
        posStatus={props.posStatus}
        setPosStatus={props.setPosStatus}
        ci={props.ci}
        setCi={props.setCi}
        ciSource={props.ciSource}
        setCiSource={props.setCiSource}
        ghgSavingPct={props.ghgSavingPct}
        ghgComparator={props.ghgComparator}
        volumeMwh={props.volumeMwh}
        setVolumeMwh={props.setVolumeMwh}
        plantTotalMWh={props.plantTotalMWh}
        plantCommittedMwh={props.plantCommittedMwh}
        setPlantCommittedMwh={props.setPlantCommittedMwh}
        availablePlantCapacity={props.availablePlantCapacity}
        isOversubscribed={props.isOversubscribed}
        plantCommittedPct={props.plantCommittedPct}
        complianceYear={props.complianceYear}
        handleComplianceYearChange={props.handleComplianceYearChange}
        vintagePreset={props.vintagePreset}
        handleVintagePreset={props.handleVintagePreset}
        prodStartDate={props.prodStartDate}
        setProdStartDate={props.setProdStartDate}
        prodEndDate={props.prodEndDate}
        setProdEndDate={props.setProdEndDate}
        deliveryProfile={props.deliveryProfile}
        setDeliveryProfile={props.setDeliveryProfile}
        monthlyRateMwh={props.monthlyRateMwh}
        dailyRateMwh={props.dailyRateMwh}
        statutorySurrenderDeadline={props.statutorySurrenderDeadline}
        deal={props.deal}
        linkedPlant={props.linkedPlant}
        setIsPoSUploaderOpen={props.setIsPoSUploaderOpen}
        selectedMarket={props.selectedMarket}
        marketId={props.marketId}
        molVal={props.molVal}
        certVal={props.certVal}
        netNetbackVal={props.netNetbackVal}
        custody={props.custody}
        onCustodyChange={props.onCustodyChange}
        cocGate={props.cocGate}
      />

      {/* ─── Column 2: Destination & Legal Validation ─── */}
      <TradeGridDestinationCol
        marketId={props.marketId}
        setMarketId={props.setMarketId}
        selectedMarket={props.selectedMarket}
        assessment={props.assessment}
        origin={props.origin}
        ghgSavingPct={props.ghgSavingPct}
        custody={props.custody}
      />

      {/* ─── Column 3: Netback & Dossier ─── */}
      <TradeGridNetbackCol
        netback={props.netback}
        netNetbackVal={props.netNetbackVal}
        currentSide={props.currentSide}
        selectedMarket={props.selectedMarket}
        waterfallRows={props.waterfallRows}
        waterfallMax={props.waterfallMax}
        volumeMwh={props.volumeMwh}
        grossTotal={props.grossTotal}
        deskMarginEurMwh={props.deskMarginEurMwh}
        annualPnl={props.annualPnl}
        origin={props.origin}
        currentTradeAssessment={props.currentTradeAssessment}
        handleSaveDossier={props.handleSaveDossier}
        justSavedId={props.justSavedId}
        handleOpenDocReview={props.handleOpenDocReview}
        handleExportPdf={props.handleExportPdf}
        handleExportTermSheetPdf={props.handleExportTermSheetPdf}
        setIsLogisticsOpen={props.setIsLogisticsOpen}
        onViewInBlotter={props.onViewInBlotter}
        linkedPlant={props.linkedPlant}
        deal={props.deal}
        marketId={props.marketId}
        feedstockKey={props.feedstockKey}
        ci={props.ci}
        molVal={props.molVal}
        certVal={props.certVal}
        gge={props.gge}
      />
    </div>
  );
}
