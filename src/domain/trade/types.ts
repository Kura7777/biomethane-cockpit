import { Consignment } from '../consignment/types';
import { EligibilityAssessment } from '../eligibility/types';
import { NetbackResult, MarksState, CostInputs } from '../netback/types';

/** Where a saved deal sits in the blotter's workflow, oldest-first by typical progression. */
export type AssessmentStatus = 'INDICATIVE' | 'QUOTED' | 'AGREED' | 'TRANSFERRED' | 'DEAD';

export interface AssessmentStatusEvent {
  status: AssessmentStatus;
  at: string;  // ISO timestamp
  note?: string;
}

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
  /** Absent on deals saved before the blotter existed; a read-time default of INDICATIVE applies. */
  status?: AssessmentStatus;
  statusHistory?: AssessmentStatusEvent[];
}

export interface TradeLibrary {
  assessments: TradeAssessment[];
}
