import { Consignment } from '../consignment/types';
import { EligibilityAssessment } from '../eligibility/types';
import { NetbackResult, MarksState, CostInputs } from '../netback/types';

export interface TradeAssessment {
  id: string;
  createdAt: string;  // ISO timestamp
  consignment: Consignment;
  targetMarketId: string;
  targetMarketName: string;
  eligibility: EligibilityAssessment;
  netback: NetbackResult;
  marks: MarksState;        // Snapshot of marks at time of assessment
  costs: CostInputs;        // Cost inputs used
  userNotes: string;
}

export interface TradeLibrary {
  assessments: TradeAssessment[];
}
