import { Consignment } from '../domain/consignment/types';
import { MarksState, CostInputs, PricingSides } from '../domain/netback/types';
import { TradeAssessment, AssessmentStatus } from '../domain/trade/types';
import { PriceSide, MarkProvenance } from '../domain/markets/types';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';
import { simulateDesk } from '../domain/marks/simulate';
import {
  PricingBookEntry,
  BrokerRunMeta,
  INITIAL_PRICING_BOOK,
  BASELINE_RUN_META,
} from '../domain/markets/brokerRun.seed';
import { seedMarksFromPricingBook } from '../domain/marks/applyMarks';

export const CURRENT_SCHEMA_VERSION = 16;

/** Where a scalar CostInputs field's current value came from, for the Pricing desk → Costs tab. */
export type CostFieldSource = 'SIMULATED' | 'MANUAL';

// State shape
export interface AppState {
  schemaVersion: number;
  marks: MarksState;
  pricingBook: PricingBookEntry[];
  pricingRunMeta: BrokerRunMeta;
  referenceRowIds: Record<string, string>;
  consignments: Consignment[];
  activeConsignmentId: string | null;
  costs: CostInputs;
  /** Per-field provenance for state.costs (producerPricing carries its own `source` instead). */
  costsSource: Record<string, CostFieldSource>;
  savedAssessments: TradeAssessment[];
  selectedMarketId: string | null;
}

// Actions
export type AppAction =
  | { type: 'SET_MARK'; marketId: string; bid: number | null; offer: number | null; mid: number | null; source?: string | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_GAS_INDEX'; bid: number | null; offer: number | null; mid: number | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_FX'; currency: 'gbpEur' | 'chfEur'; value: number | null; updatedAt?: string | null; provenance?: MarkProvenance | null }
  | { type: 'SET_PRICING_SIDE'; side: PriceSide }
  | { type: 'SET_PRICING_SIDES'; sides: Partial<PricingSides> }
  | { type: 'ADD_CONSIGNMENT'; consignment: Consignment }
  | { type: 'UPDATE_CONSIGNMENT'; consignment: Consignment }
  | { type: 'SET_ACTIVE_CONSIGNMENT'; id: string | null }
  | { type: 'SET_COSTS'; costs: Partial<CostInputs> }
  | { type: 'SAVE_ASSESSMENT'; assessment: TradeAssessment }
  | { type: 'DELETE_ASSESSMENT'; id: string }
  | { type: 'SET_ASSESSMENT_STATUS'; id: string; status: AssessmentStatus; note?: string }
  | { type: 'UPDATE_ASSESSMENT_NOTES'; id: string; notes: string }
  | { type: 'SELECT_MARKET'; id: string | null }
  | { type: 'IMPORT_STATE'; state: AppState }
  | { type: 'SIMULATE_DESK' }
  | { type: 'RESET' }
  | { type: 'UPDATE_PRICING_BOOK_CELL'; id: string; field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume'; value: string }
  | { type: 'SET_PRICING_RUN_DATE'; runId: string; receivedOn: string }
  | { type: 'SET_MARKET_REFERENCE_ROW'; marketId: string; rowId: string }
  | { type: 'ADD_PRICING_RUN'; runMeta: BrokerRunMeta; rows: PricingBookEntry[] };

/**
 * The state a brand-new desk starts from.
 *
 * Marks and costs are seeded from simulateDesk() and then seeded with real
 * broker marks for markets that have broker indication rows in the master pricing book.
 */
export function createDefaultState(): AppState {
  const { marks: simMarks, costs } = simulateDesk();
  const pricingBook = INITIAL_PRICING_BOOK;
  const pricingRunMeta = BASELINE_RUN_META;
  const { nextMarks, referenceRowIds } = seedMarksFromPricingBook(simMarks, pricingBook, pricingRunMeta.receivedOn);

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    marks: nextMarks,
    pricingBook,
    pricingRunMeta,
    referenceRowIds,
    consignments: [
      REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      REFERENCE_CONSIGNMENTS.SPANISH_MANURE,
      REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
      REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY,
    ],
    activeConsignmentId: REFERENCE_CONSIGNMENTS.DANISH_MANURE.id,
    costs,
    costsSource: {
      transferCosts: 'SIMULATED',
      certificationCosts: 'SIMULATED',
      logistics: 'SIMULATED',
      otherCosts: 'MANUAL',
      greenAlpha: 'MANUAL',
    },
    savedAssessments: [],
    selectedMarketId: 'DE_THG',
  };
}
