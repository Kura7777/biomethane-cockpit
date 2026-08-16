export interface CostInputs {
  transferCosts: number | null;     // €/MWh
  certificationCosts: number | null; // €/MWh
  logistics: number | null;         // €/MWh
  deliveredCost: number | null;     // €/MWh (procurement cost)
  otherCosts: number | null;        // €/MWh
}

export interface CertificateValueResult {
  valueEurPerMWh: number | null;
  calculation: string;              // Human-readable working
  unitConversion: string;           // Show the unit conversion step
  capped: boolean;                  // true if capped (e.g., France CPB)
  capReason: string | null;
}

export interface NetbackBranch {
  branchId: string;
  branchLabel: string;
  certificateValue: CertificateValueResult;
  netNetback: number | null;
  impliedMargin: number | null;
  marginPercent: number | null;
  totalPnL: number | null;
}

export interface NetbackResult {
  marketId: string;
  marketName: string;
  certificateValue: CertificateValueResult | null;
  moleculeValue: number | null;     // Gas index (€/MWh)
  totalCosts: number | null;        // Sum of all cost inputs
  netNetback: number | null;        // cert + molecule - costs
  impliedMargin: number | null;     // netNetback - deliveredCost
  marginPercent: number | null;     // impliedMargin / netNetback * 100
  totalPnL: number | null;          // impliedMargin * volume
  isTheoretical: boolean;           // true if market is blocked
  blockingReason: string | null;
  uncertaintyBranches: NetbackBranch[] | null;  // For Germany: both DC branches
}

export interface MarksState {
  marks: Record<string, { bid: number | null; offer: number | null; mid: number | null }>;
  gasIndex: { bid: number | null; offer: number | null; mid: number | null };  // TTF
  fx: {
    gbpEur: number | null;
    chfEur: number | null;
  };
}

export interface RankedNetback extends NetbackResult {
  rank: number | null;
  eligibilityVerdict: string;  // from eligibility engine
}
