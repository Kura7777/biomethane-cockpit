import { MarkEntry, PriceSide, MarkProvenance } from '../markets/types';

export type ProducerPricingMode = 'FIXED_PRICE' | 'INDEX_LINKED';

export interface ProducerPricing {
  mode: ProducerPricingMode;
  /** FIXED_PRICE only: all-in €/MWh paid to the producer. */
  fixedPriceEurPerMwh: number | null;
  /** INDEX_LINKED only: producer's share of the delivered value stack, 0–1. */
  indexLinkedShare: number | null;   // no default value — user must set it
  source: string | null;
  lastVerified: string | null;
  confidence: 'VERIFIED' | 'LIKELY' | 'CONTESTED' | 'UNVERIFIED';
}

export interface CostInputs {
  transferCosts: number | null;     // €/MWh
  certificationCosts: number | null; // €/MWh
  logistics: number | null;         // €/MWh
  otherCosts: number | null;        // €/MWh
  producerPricing?: ProducerPricing | null;
}

export interface FuelEUOptions {
  shipActualCI?: number;            // Vessel's actual baseline intensity in gCO2e/MJ (default 91.16)
  consecutiveYears?: number;        // Consecutive non-compliance years: 1 (0%), 2 (+10%), 3 (+20%), 4 (+30%)
  targetYear?: 2025 | 2030;         // Target compliance year (default 2025 -> 89.34 gCO2e/MJ)
  deficitMWhCap?: number | null;    // Maximum deficit MWh cap for vessel
}

export interface PricingSides {
  certificateSide: PriceSide;   // default 'bid' — you are selling certificates
  moleculeSide: PriceSide;      // default 'bid' — you are selling the molecule
}

export interface NetbackSides {
  atChosenSides: number | null;   // what you can actually transact at
  atMid: number | null;           // theoretical mid value
  crossingCost: number | null;    // atMid − atChosenSides (positive: spread crossing cost; negative: spread benefit / optimistic pricing)
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
  provenance?: MarkProvenance | null;
}

export interface NetbackBranch {
  branchId: string;
  branchLabel: string;
  certificateValue: CertificateValueResult;
  netNetback: number | null;
  grossValueSpread: number | null;   // Delivered Netback − Producer Payable
  producerPayable: number | null;   // Amount paid to producer (€/MWh)
  deskMargin: number | null;        // Realized commercial desk margin (€/MWh)
  marginPercent: number | null;     // deskMargin / netNetback * 100
  grossSpreadPnL: number | null;    // grossValueSpread * volume
  deskPnL: number | null;           // deskMargin * volume
  isComplete: boolean;
  missingInputs: string[];
  sides?: NetbackSides;
}

export interface ValuationRange {
  low: number;                  // conservative branch (e.g. DC_OFF)
  high: number;                 // upside branch (e.g. DC_ON)
  deltaPerMwh: number;          // high − low
  deltaNotional: number | null; // deltaPerMwh × volumeMWh (null if volume is null)
  driver: string;               // human description, e.g. "German THG double-counting eligibility (§37a BImSchG)"
  gateId: string;               // 'MARKET_SPECIFIC'
}

export interface NetbackResult {
  marketId: string;
  marketName: string;
  certificateValue: CertificateValueResult | null;
  moleculeValue: number | null;     // Gas index (€/MWh)
  totalCosts: number | null;        // Sum of all entered cost inputs
  netNetback: number | null;        // cert + molecule - costs (null if cert is null)
  grossValueSpread: number | null;   // Delivered Netback − Producer Payable (€/MWh)
  producerPayable: number | null;   // Amount paid to producer (€/MWh)
  deskMargin: number | null;        // Realized commercial desk margin (€/MWh)
  marginPercent: number | null;     // deskMargin / netNetback * 100
  grossSpreadPnL: number | null;    // grossValueSpread * volume
  deskPnL: number | null;           // deskMargin * volume
  isTheoretical: boolean;           // true if market is blocked
  blockingReason: string | null;
  isComplete: boolean;              // true ONLY if certificate, molecule, and all standard cost components are entered
  missingInputs: string[];          // List of missing cost/molecule components (e.g. ['moleculeValue', 'transferCosts', 'logistics'])
  uncertaintyBranches: NetbackBranch[] | null;  // For Germany: both DC branches
  valuationRange?: ValuationRange | null;       // Headline valuation range under regulatory uncertainty
  statusNote?: string | null;       // Any cautionary status notice (e.g. UNVERIFIED)
  markSideUsed: PriceSide;          // 'bid' | 'mid' | 'offer' (primary/certificate side)
  pricingSides?: PricingSides;      // Explicit per-leg pricing sides used
  sides?: NetbackSides;             // atChosenSides, atMid, and crossingCost
  isModelled?: boolean;             // true if value is purely modelled (e.g. unquoted FuelEU)
  provenance?: MarkProvenance | null;
}

export interface GasIndexMark {
  bid: number | null;
  offer: number | null;
  mid: number | null;
  updatedAt: string | null;
  provenance?: MarkProvenance | null;
}

export interface FxMark {
  gbpEur: number | null;
  chfEur: number | null;
  updatedAt: string | null;
  provenance?: MarkProvenance | null;
}

export interface MarksState {
  marks: Record<string, MarkEntry>;
  gasIndex: GasIndexMark;
  fx: FxMark;
  /**
   * The desk's pricing sides, per leg. This is the single stored source of truth.
   *
   * There was previously also a scalar `pricingSide` here. Every screen read the
   * scalar and passed it down, which broadcast one side to both legs and silently
   * discarded whatever was in this object — so per-leg pricing was unreachable in
   * the running app. Callers now pass this object, or a scalar explicitly when they
   * really do mean "both legs at the same side".
   */
  pricingSides: PricingSides;
  fuelEUOptions?: FuelEUOptions;
}

export interface RankedNetback extends NetbackResult {
  rank: number | null;
  eligibilityVerdict: string;       // from eligibility engine
}
