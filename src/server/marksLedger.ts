import { MarksState } from '../domain/netback/types';
import { MarksAuditRecord } from '../domain/marks/marksStore';
import { simulateDesk } from '../domain/marks/simulate';

// Initialize default marks state matching desk defaults
function createInitialMarksState(): MarksState {
  return simulateDesk().marks;
}

const INITIAL_AUDIT_LOG: MarksAuditRecord[] = [
  {
    id: 'AUDIT-2026-08-15-1044',
    timestamp: '2026-08-15T08:30:00.000Z',
    brokerSource: 'Marex Spectron Daily Biofuels Run',
    assessmentDate: '2026-08-15',
    trader: 'Chris M.',
    recordsCommitted: 4,
    diffSummary: [
      {
        marketId: 'DE_THG',
        marketName: 'German THG-Quote (Double-Counted)',
        unit: 'EUR/kg',
        oldMid: 0.82,
        newMid: 0.85,
        oldBid: 0.80,
        newBid: 0.83,
        oldOffer: 0.84,
        newOffer: 0.87,
        changePct: 3.66,
      },
      {
        marketId: 'NL_ERE',
        marketName: 'Netherlands ERE (Transport Quota)',
        unit: 'EUR/GJ',
        oldMid: 18.20,
        newMid: 18.75,
        oldBid: 18.00,
        newBid: 18.50,
        oldOffer: 18.40,
        newOffer: 19.00,
        changePct: 3.02,
      },
    ],
    rawSnippet: 'Marex Spectron 15-Aug-2026: THG 0.83/0.87 | NL HBE 18.50/19.00 | TTF M+1 38.50',
  },
];

class MarksLedger {
  private state: MarksState;
  private auditHistory: MarksAuditRecord[];

  constructor() {
    this.state = createInitialMarksState();
    this.auditHistory = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG));
  }

  public getMarks(): MarksState {
    return JSON.parse(JSON.stringify(this.state));
  }

  public saveMarks(updated: Partial<MarksState>): MarksState {
    if (updated.marks) {
      this.state.marks = { ...this.state.marks, ...updated.marks };
    }
    if (updated.gasIndex) {
      this.state.gasIndex = { ...this.state.gasIndex, ...updated.gasIndex };
    }
    if (updated.fx) {
      this.state.fx = { ...this.state.fx, ...updated.fx };
    }
    if (updated.pricingSides) {
      this.state.pricingSides = { ...this.state.pricingSides, ...updated.pricingSides };
    }
    return this.getMarks();
  }

  public getAuditHistory(): MarksAuditRecord[] {
    return JSON.parse(JSON.stringify(this.auditHistory));
  }

  public appendAuditRecord(record: MarksAuditRecord): void {
    this.auditHistory = [record, ...this.auditHistory].slice(0, 100);
  }

  public reset(): void {
    this.state = createInitialMarksState();
    this.auditHistory = JSON.parse(JSON.stringify(INITIAL_AUDIT_LOG));
  }
}

export const marksLedger = new MarksLedger();
