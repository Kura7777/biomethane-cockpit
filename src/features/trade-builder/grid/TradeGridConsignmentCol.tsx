import React from 'react';
import { CertificationScheme, ChainOfCustody, UDBStatus, PoSStatus, DeliveryProfile } from '../../../domain/consignment/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { BiomethanePlant } from '../../../domain/plants/types';
import { ORIGINS, FEEDSTOCKS, SCHEMES, CUSTODIES } from '../options';
import { Market } from '../../../domain/markets/types';
import { TradeGridCapacityCard } from './TradeGridCapacityCard';
import { TradeGridProductCard } from './TradeGridProductCard';
import { TradeGridScheduleCard } from './TradeGridScheduleCard';

interface TradeGridConsignmentColProps {
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
  isNonEuOrigin: boolean;
  posStatus: PoSStatus;
  setPosStatus: (status: PoSStatus) => void;
  ci: number;
  setCi: (ci: number) => void;
  ciSource: 'deal' | 'estimate' | 'pos' | 'manual';
  setCiSource: (source: 'deal' | 'estimate' | 'pos' | 'manual') => void;
  ghgSavingPct: number;
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
  selectedMarket: Market;
  marketId: string;
  molVal: number;
  certVal: number;
  netNetbackVal: number;
}

export function TradeGridConsignmentCol({
  origin,
  setOrigin,
  currentOriginObj,
  feedstockKey,
  setFeedstockKey,
  currentFeedstockObj,
  scheme,
  setScheme,
  currentSchemeObj,
  chainOfCustody,
  setChainOfCustody,
  currentCustodyObj,
  udbStatus,
  setUdbStatus,
  isNonEuOrigin,
  posStatus,
  setPosStatus,
  ci,
  setCi,
  ciSource,
  setCiSource,
  ghgSavingPct,
  volumeMwh,
  setVolumeMwh,
  plantTotalMWh,
  plantCommittedMwh,
  setPlantCommittedMwh,
  availablePlantCapacity,
  isOversubscribed,
  plantCommittedPct,
  complianceYear,
  handleComplianceYearChange,
  vintagePreset,
  handleVintagePreset,
  prodStartDate,
  setProdStartDate,
  prodEndDate,
  setProdEndDate,
  deliveryProfile,
  setDeliveryProfile,
  monthlyRateMwh,
  dailyRateMwh,
  statutorySurrenderDeadline,
  deal,
  linkedPlant,
  setIsPoSUploaderOpen,
  selectedMarket,
  marketId,
  molVal,
  certVal,
  netNetbackVal,
}: TradeGridConsignmentColProps) {
  return (
    <div style={{ borderRight: '2px solid var(--color-divider)', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '13px 18px',
          borderBottom: '2px solid var(--color-divider)',
        }}
      >
        <span
          className="num"
          style={{
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-accent)',
            color: 'var(--color-bg)',
            fontSize: '12px',
            fontWeight: 800,
          }}
        >
          1
        </span>
        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>
          Consignment
        </h4>
      </div>

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '18px' }} className="noscroll">
        {/* Sourcing & Plant Asset Capacity Card */}
        <TradeGridCapacityCard
          deal={deal}
          linkedPlant={linkedPlant}
          volumeMwh={volumeMwh}
          setVolumeMwh={setVolumeMwh}
          plantTotalMWh={plantTotalMWh}
          plantCommittedMwh={plantCommittedMwh}
          setPlantCommittedMwh={setPlantCommittedMwh}
          availablePlantCapacity={availablePlantCapacity}
          isOversubscribed={isOversubscribed}
          plantCommittedPct={plantCommittedPct}
        />

        {/* Product Specification Card */}
        <TradeGridProductCard
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
          udbStatus={udbStatus}
          setUdbStatus={setUdbStatus}
          isNonEuOrigin={isNonEuOrigin}
          posStatus={posStatus}
          setPosStatus={setPosStatus}
          ci={ci}
          setCi={setCi}
          ciSource={ciSource}
          setCiSource={setCiSource}
          ghgSavingPct={ghgSavingPct}
          volumeMwh={volumeMwh}
          deal={deal}
          linkedPlant={linkedPlant}
          setIsPoSUploaderOpen={setIsPoSUploaderOpen}
          selectedMarket={selectedMarket}
          marketId={marketId}
          molVal={molVal}
          certVal={certVal}
          netNetbackVal={netNetbackVal}
        />

        {/* Production Period (Vintage) & Delivery Schedule Card */}
        <TradeGridScheduleCard
          complianceYear={complianceYear}
          handleComplianceYearChange={handleComplianceYearChange}
          vintagePreset={vintagePreset}
          handleVintagePreset={handleVintagePreset}
          prodStartDate={prodStartDate}
          setProdStartDate={setProdStartDate}
          prodEndDate={prodEndDate}
          setProdEndDate={setProdEndDate}
          deliveryProfile={deliveryProfile}
          setDeliveryProfile={setDeliveryProfile}
          monthlyRateMwh={monthlyRateMwh}
          dailyRateMwh={dailyRateMwh}
          statutorySurrenderDeadline={statutorySurrenderDeadline}
          selectedMarket={selectedMarket}
        />
      </div>
    </div>
  );
}
