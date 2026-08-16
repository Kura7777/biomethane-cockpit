export type GateName = 
  | 'SCHEME_RECOGNITION'
  | 'UDB_RECORDING'
  | 'CHAIN_OF_CUSTODY'
  | 'FEEDSTOCK_CATEGORY'
  | 'GHG_THRESHOLD'
  | 'MARKET_SPECIFIC';

export type GateVerdict = 'PASS' | 'HARD_BLOCK' | 'CONDITIONAL' | 'UNRESOLVED' | 'UNKNOWN';

export interface LegalCitation {
  shortName: string;           // "RED III Art. 30(4)"
  fullReference: string;       // Full legal reference
  establishes: string;         // What this citation establishes
  sourceUrl: string;           // EUR-Lex or national legislation URL
  verifiedDate: string | null; // ISO date or null if unverified
  nationalTransposition?: string; // e.g., "§37a BImSchG"
}

export interface GateResult {
  gate: GateName;
  gateLabel: string;           // Human-readable gate name
  verdict: GateVerdict;
  reason: string;              // Plain English, paste-into-email quality
  remedy: string | null;       // What would fix it
  citations: LegalCitation[];  // Legal references
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export type OverallVerdict = 'ELIGIBLE' | 'CONDITIONAL' | 'HARD_BLOCK' | 'UNRESOLVED' | 'UNKNOWN';

export interface EligibilityAssessment {
  marketId: string;
  marketName: string;
  overallVerdict: OverallVerdict;
  blockingGate: GateName | null;  // First gate that blocked
  gates: GateResult[];
  summary: string;  // One-line summary for display
}
