import { useState } from 'react';
import { DeliveryProfile } from '../../../domain/consignment/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { NL_GGE_START_YEAR } from '../../../domain/regulatory/constants';

/** Default compliance year for a new deal: the Dutch green-gas obligation only starts in NL_GGE_START_YEAR. */
export function defaultComplianceYear(deal: Partial<DealParams>): number {
  if (deal.complianceYear) return deal.complianceYear;
  return deal.marketId === 'NL_GGE' ? NL_GGE_START_YEAR : 2026;
}

export function useDealSchedule(deal: Partial<DealParams>) {
  const startYear = defaultComplianceYear(deal);
  const [complianceYear, setComplianceYear] = useState<number>(startYear);
  const [vintagePreset, setVintagePreset] = useState<string>('CAL_YEAR');
  const [prodStartDate, setProdStartDate] = useState<string>(deal.productionStartDate || `${startYear}-01-01`);
  const [prodEndDate, setProdEndDate] = useState<string>(deal.productionEndDate || `${startYear}-12-31`);
  const [deliveryStartDate, setDeliveryStartDate] = useState<string>(deal.deliveryStartDate || `${startYear}-01-01`);
  const [deliveryEndDate, setDeliveryEndDate] = useState<string>(deal.deliveryEndDate || `${startYear}-12-31`);
  const [deliveryProfile, setDeliveryProfile] = useState<DeliveryProfile>(deal.deliveryProfile || 'FLAT_MONTHLY');

  const handleVintagePreset = (preset: string) => {
    setVintagePreset(preset);
    const yr = complianceYear;
    if (preset === 'CAL_YEAR') {
      setProdStartDate(`${yr}-01-01`);
      setProdEndDate(`${yr}-12-31`);
      setDeliveryStartDate(`${yr}-01-01`);
      setDeliveryEndDate(`${yr}-12-31`);
    } else if (preset === 'Q1') {
      setProdStartDate(`${yr}-01-01`);
      setProdEndDate(`${yr}-03-31`);
      setDeliveryStartDate(`${yr}-01-01`);
      setDeliveryEndDate(`${yr}-03-31`);
    } else if (preset === 'Q2') {
      setProdStartDate(`${yr}-04-01`);
      setProdEndDate(`${yr}-06-30`);
      setDeliveryStartDate(`${yr}-04-01`);
      setDeliveryEndDate(`${yr}-06-30`);
    } else if (preset === 'Q3') {
      setProdStartDate(`${yr}-07-01`);
      setProdEndDate(`${yr}-09-30`);
      setDeliveryStartDate(`${yr}-07-01`);
      setDeliveryEndDate(`${yr}-09-30`);
    } else if (preset === 'Q4') {
      setProdStartDate(`${yr}-10-01`);
      setProdEndDate(`${yr}-12-31`);
      setDeliveryStartDate(`${yr}-10-01`);
      setDeliveryEndDate(`${yr}-12-31`);
    } else if (preset === 'PROMPT') {
      setProdStartDate(`${yr}-10-01`);
      setProdEndDate(`${yr}-10-31`);
      setDeliveryStartDate(`${yr}-10-01`);
      setDeliveryEndDate(`${yr}-10-31`);
    }
  };

  const handleComplianceYearChange = (newYear: number) => {
    setComplianceYear(newYear);
    setProdStartDate(`${newYear}-01-01`);
    setProdEndDate(`${newYear}-12-31`);
    setDeliveryStartDate(`${newYear}-01-01`);
    setDeliveryEndDate(`${newYear}-12-31`);
  };

  const resetSchedule = () => {
    setComplianceYear(2026);
    setVintagePreset('CAL_YEAR');
    setProdStartDate('2026-01-01');
    setProdEndDate('2026-12-31');
    setDeliveryStartDate('2026-01-01');
    setDeliveryEndDate('2026-12-31');
    setDeliveryProfile('FLAT_MONTHLY');
  };

  return {
    complianceYear,
    setComplianceYear,
    vintagePreset,
    setVintagePreset,
    prodStartDate,
    setProdStartDate,
    prodEndDate,
    setProdEndDate,
    deliveryStartDate,
    setDeliveryStartDate,
    deliveryEndDate,
    setDeliveryEndDate,
    deliveryProfile,
    setDeliveryProfile,
    handleVintagePreset,
    handleComplianceYearChange,
    resetSchedule,
  };
}
