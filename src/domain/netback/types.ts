import { MarkEntry, PriceSide } from '../markets/types';

export interface CostInputs {
  transferCosts: number | null;     // €/MWh
  certificationCosts: number | null; // €/MWh
  logistics: number | null;         // €/MWh
  deliveredCost: number | null;     // €/MWh (procurement cost)
  otherCosts: number | null;        // €/MWh
}

export interface FuelEUOptions {
  shipActualCI?: number;            // Vessel's actual baseline intensity in gCO2e/MJ (default 91.16)
  consecutiveYears?: number;        // Consecutive non-compliance years: 1 (0%), 2 (+10%), 3 (+20%), 4 (+30%)
  targetYear?: 2025 | 2030;         // Target compliance year (default 2025 -> 89.34 gCO2e/MJ)
  deficitMWhCap?: number | null;    // Maximum deficit MWh cap for vessel
}

export interface CertificateValueResult {
  valueEurPerMWh: number | null;
  calculation: string;              // Human-readable working
  unitConversion: string;           // Show the unit conversion step
  capped: boolean;                  // true if capped (e.g., France CPB)
  capReason: string | null;
  statusNote?: string | null;       // Warning or status note (e.g., UNVERIFIED for UK dRTFC or FuelEU)
  markAgeDays?: number | null;      // Staleness age in days
  isModelled?: boolean;             // true if value is derived from regulatory model (e.g. FuelEU penalty avoidance) rather than market mark
}

export interface NetbackBranch {
  branchId: string;
  branchLabel: string;
  certificateValue: CertificateValueResult;
  netNetback: number | null;
  impliedMargin: number | null;
  marginPercent: number | null;
  totalPnL: number | null;
  isComplete: boolean;
  missingInputs: string[];
}

export interface NetbackResult {
  marketId: string;
  marketName: string;
  certificateValue: CertificateValueResult | null;
  moleculeValue: number | null;     // Gas index (€/MWh)
  totalCosts: number | null;        // Sum of all entered cost inputs
  netNetback: number | null;        // cert + molecule - costs (null if cert is null)
  impliedMargin: number | null;     // netNetback - deliveredCost
  marginPercent: number | null;     // impliedMargin / netNetback * 100
  totalPnL: number | null;          // impliedMargin * volume
  isTheoretical: boolean;           // true if market is blocked
  blockingReason: string | null;
  isComplete: boolean;              // true ONLY if certificate, molecule, and all standard cost components are entered
  missingInputs: string[];          // List of missing cost/molecule components (e.g. ['moleculeValue', 'transferCosts', 'logistics'])
  uncertaintyBranches: NetbackBranch[] | null;  // For Germany: both DC branches
  statusNote?: string | null;       // Any cautionary status notice (e.g. UNVERIFIED)
  markSideUsed: PriceSide;          // 'bid' | 'mid' | 'offer'
  isModelled?: boolean;             // true if value is purely modelled (e.g. unquoted FuelEU)
}

export interface MarksState {
  marks: Record<string, MarkEntry>;
  gasIndex: {
    bid: number | null;
    offer: number | null;
    mid: number | null;
    updatedAt: string | null;
  };
  fx: {
    gbpEur: number | null;
    chfEur: number | null;
    updatedAt: string | null;
  };
  pricingSide: PriceSide;           // Global default pricing side (default 'bid' for selling certificates)
  fuelEUOptions?: FuelEUOptions;
}

export interface RankedNetback extends NetbackResult {
  rank: number | null;
  eligibilityVerdict: string;       // from eligibility engine
}
