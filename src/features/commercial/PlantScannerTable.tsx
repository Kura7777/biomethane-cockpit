import { ArbitrageOpportunity } from '../../domain/arbitrage/types';

export interface SourcedOpportunity extends ArbitrageOpportunity {
  originPlantId?: string;
  originPlantName?: string;
  originPlantCoords?: [number, number] | null;
  isDirectPlantSource?: boolean;
  isPlantVerified?: boolean;
  logisticsDistanceKm?: number;
  deliveryMode?: string;
  plantCapacityNm3h?: number | null;
  plantAnnualGWh?: number | null;
  legalEntityName?: string | null;
  networkOperator?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  transitSteps?: string[];
  /** True when the desk's Step 1 CI override replaced this plant's own carbon intensity. */
  ciIsOverridden?: boolean;
  gridConnectionType?: string | null;
}

export function getCountryFlag(iso: string): string {
  const flags: Record<string, string> = {
    DK: '🇩🇰',
    DE: '🇩🇪',
    FR: '🇫🇷',
    NL: '🇳🇱',
    GB: '🇬🇧',
    UK: '🇬🇧',
    IT: '🇮🇹',
    SE: '🇸🇪',
    ES: '🇪🇸',
    AT: '🇦🇹',
    BE: '🇧🇪',
    PL: '🇵🇱',
    FI: '🇫🇮',
    CH: '🇨🇭',
    IE: '🇮🇪',
    NO: '🇳🇴',
  };
  return flags[iso?.toUpperCase()] || '🇪🇺';
}

