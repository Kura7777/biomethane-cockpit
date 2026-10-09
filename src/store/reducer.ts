import { BrokerRunMeta, PricingBookEntry } from '../domain/markets/brokerRun.seed';
import { DE_THG_BUNDLE_MARK_PREFIX } from '../domain/markets/deThgBundle';
import { simulateDesk } from '../domain/marks/simulate';
import {
  applyMarkUpdates,
  deThgBundleMarkUpdates,
  isSimulatedMark,
  rowFeedsMarket,
  rowHasPrice,
  resolveMarketForQuote,
  createMarkUpdateFromRow,
  MarkUpdate,
} from '../domain/marks/applyMarks';
import { AppState, AppAction, CostFieldSource, createDefaultState } from './state';
import { migrateState } from './migrations';

// Reducer
export function appReducer(state: AppState, action: AppAction): AppState {
  const now = new Date().toISOString();

  switch (action.type) {
    case 'SET_MARK': {
      const nextMarks = applyMarkUpdates(state.marks, [{
        marketId: action.marketId,
        bid: action.bid,
        offer: action.offer,
        mid: action.mid,
        source: action.source ?? 'Desk · manual',
        updatedAt: action.updatedAt ?? now,
        provenance: action.provenance !== undefined ? action.provenance : {
          sourceType: 'BROKER_INDICATION',
          sourceName: action.source ?? 'Desk · manual',
          sourceUrl: null,
          observedAt: action.updatedAt ?? now,
          note: 'Desk override',
        },
      }]);
      return { ...state, marks: nextMarks };
    }
    case 'SET_GAS_INDEX': {
      const nextMarks = applyMarkUpdates(state.marks, [{
        marketId: 'GAS_TTF',
        bid: action.bid,
        offer: action.offer,
        mid: action.mid,
        updatedAt: action.updatedAt ?? now,
        provenance: action.provenance !== undefined ? action.provenance : {
          sourceType: 'BROKER_INDICATION',
          sourceName: 'Desk · manual',
          sourceUrl: null,
          observedAt: action.updatedAt ?? now,
          note: 'Desk TTF gas index override',
        },
      }]);
      return { ...state, marks: nextMarks };
    }
    case 'SET_FX': {
      const fxUpdatedAt = action.updatedAt ?? (action.value !== null ? now : null);
      return {
        ...state,
        marks: {
          ...state.marks,
          fx: {
            ...state.marks.fx,
            [action.currency]: action.value,
            updatedAt: fxUpdatedAt,
            provenance: action.provenance !== undefined ? action.provenance : (state.marks.fx.provenance ?? {
              sourceType: null,
              sourceName: null,
              sourceUrl: null,
              observedAt: fxUpdatedAt,
              note: null,
            }),
          },
        },
      };
    }
    case 'SET_PRICING_SIDE':
      return {
        ...state,
        marks: {
          ...state.marks,
          pricingSides: { certificateSide: action.side, moleculeSide: action.side },
        },
      };
    case 'SET_PRICING_SIDES': {
      const currentSides = state.marks.pricingSides;
      return {
        ...state,
        marks: {
          ...state.marks,
          pricingSides: {
            ...currentSides,
            ...action.sides,
          },
        },
      };
    }
    case 'ADD_CONSIGNMENT':
      return { ...state, consignments: [...state.consignments, action.consignment], activeConsignmentId: action.consignment.id };
    case 'UPDATE_CONSIGNMENT':
      return { ...state, consignments: state.consignments.map(c => c.id === action.consignment.id ? action.consignment : c) };
    case 'SET_ACTIVE_CONSIGNMENT':
      return { ...state, activeConsignmentId: action.id };
    case 'SET_COSTS': {
      // Every scalar field the desk touches through this action becomes Manual — only the
      // simulator's own seed (createDefaultState) ever sets a field Simulated.
      const touchedSource: Record<string, CostFieldSource> = {};
      for (const key of Object.keys(action.costs)) {
        if (key !== 'producerPricing') touchedSource[key] = 'MANUAL';
      }
      return {
        ...state,
        costs: { ...state.costs, ...action.costs },
        costsSource: { ...state.costsSource, ...touchedSource },
      };
    }
    case 'SAVE_ASSESSMENT':
      return {
        ...state,
        savedAssessments: [
          action.assessment,
          ...state.savedAssessments.filter(a => a.id !== action.assessment.id),
        ],
      };
    case 'DELETE_ASSESSMENT':
      return { ...state, savedAssessments: state.savedAssessments.filter(a => a.id !== action.id) };
    case 'SET_ASSESSMENT_STATUS': {
      const at = new Date().toISOString();
      return {
        ...state,
        savedAssessments: state.savedAssessments.map(a =>
          a.id === action.id
            ? {
                ...a,
                status: action.status,
                statusHistory: [...(a.statusHistory ?? []), { status: action.status, at, note: action.note }],
              }
            : a
        ),
      };
    }
    case 'UPDATE_ASSESSMENT_NOTES':
      return {
        ...state,
        savedAssessments: state.savedAssessments.map(a =>
          a.id === action.id ? { ...a, userNotes: action.notes } : a
        ),
      };
    case 'SELECT_MARKET':
      return { ...state, selectedMarketId: action.id };
    case 'IMPORT_STATE':
      return migrateState(action.state);
    case 'SIMULATE_DESK': {
      const { marks: simMarks, costs } = simulateDesk();
      const simUpdates: MarkUpdate[] = Object.values(simMarks.marks).map(m => ({
        marketId: m.marketId,
        bid: m.bid,
        offer: m.offer,
        mid: m.mid,
        source: m.source,
        updatedAt: m.updatedAt,
        provenance: m.provenance,
      }));
      simUpdates.push({
        marketId: 'GAS_TTF',
        bid: simMarks.gasIndex.bid,
        offer: simMarks.gasIndex.offer,
        mid: simMarks.gasIndex.mid,
        updatedAt: simMarks.gasIndex.updatedAt,
        provenance: simMarks.gasIndex.provenance,
      });
      const nextMarks = applyMarkUpdates(state.marks, simUpdates);
      return {
        ...state,
        marks: {
          ...nextMarks,
          // FX is not a broker price; refresh it only while it is still simulated.
          fx: isSimulatedMark({ provenance: state.marks.fx.provenance, source: null, bid: 0 }) ? simMarks.fx : state.marks.fx,
          pricingSides: state.marks.pricingSides,
        },
        costs,
        costsSource: {
          transferCosts: 'SIMULATED',
          certificationCosts: 'SIMULATED',
          logistics: 'SIMULATED',
          otherCosts: 'MANUAL',
          greenAlpha: 'MANUAL',
        },
      };
    }
    case 'UPDATE_PRICING_BOOK_CELL': {
      const nextPricingBook = state.pricingBook.map(row => {
        if (row.id !== action.id) return row;
        const editedRow: PricingBookEntry = {
          ...row,
          [action.field]: action.value,
          editedAt: now,
          source: 'Desk · manual',
        };

        if (action.field === 'bidPrice' || action.field === 'offerPrice') {
          const clean = action.value.replace(/[^0-9.-]/g, '');
          const numVal = clean ? parseFloat(clean) : null;
          const fx = state.marks.fx.gbpEur;
          const toEur = (v: number | null): number | null =>
            v === null ? null : row.currency === 'EUR' ? v : (fx !== null ? Number((v * fx).toFixed(2)) : null);
          if (action.field === 'bidPrice') {
            editedRow.bidPriceNumeric = numVal;
            editedRow.numericBidEurMwh = toEur(numVal);
          } else {
            editedRow.offerPriceNumeric = numVal;
            editedRow.numericOfferEurMwh = toEur(numVal);
          }
        } else if (action.field === 'bidVolume' || action.field === 'offerVolume') {
          const m = action.value.match(/(\d+(?:\.\d+)?)\s*GWh/i);
          const vol = m ? parseFloat(m[1]) : (parseFloat(action.value) || null);
          if (action.field === 'bidVolume') {
            editedRow.bidVolumeGWh = vol;
            editedRow.bidVolumeText = action.value;
          } else {
            editedRow.offerVolumeGWh = vol;
            editedRow.offerVolumeText = action.value;
          }
        }

        return editedRow;
      });

      let nextMarks = state.marks;
      let nextRefIds = state.referenceRowIds;

      const editedRow = nextPricingBook.find(r => r.id === action.id);
      if (editedRow && (action.field === 'bidPrice' || action.field === 'offerPrice')) {
        const updatedMarketId = resolveMarketForQuote(editedRow);
        if (updatedMarketId && rowFeedsMarket(editedRow, updatedMarketId)) {
          const currentRefId = state.referenceRowIds?.[updatedMarketId];
          const isRef = !currentRefId || currentRefId === action.id;

          if (isRef) {
            nextRefIds = { ...state.referenceRowIds, [updatedMarketId]: action.id };
            const update = createMarkUpdateFromRow(editedRow, updatedMarketId, state.pricingRunMeta?.receivedOn);
            update.source = 'Desk · manual';
            if (update.provenance) {
              update.provenance.sourceName = 'Desk · manual';
              update.provenance.observedAt = now;
              update.provenance.note = `Manual edit on row ${editedRow.id}`;
            }
            nextMarks = applyMarkUpdates(state.marks, [update]);
          }
        }
      }

      return {
        ...state,
        pricingBook: nextPricingBook,
        marks: nextMarks,
        referenceRowIds: nextRefIds,
      };
    }
    case 'SET_PRICING_RUN_DATE': {
      const nextRunMeta: BrokerRunMeta = {
        ...state.pricingRunMeta,
        receivedOn: action.receivedOn,
        receivedOnIsApproximate: false,
      };
      const nextBook = state.pricingBook.map(row => {
        if (row.runId === action.runId) {
          return { ...row, observedAt: action.receivedOn };
        }
        return row;
      });

      // Re-date only the marks that are still this run's broker quote. A mark the trader has since
      // overwritten by hand (sourceName 'Desk · manual') keeps its own observation time.
      const updates: MarkUpdate[] = [];
      for (const [mId, rowId] of Object.entries(state.referenceRowIds || {})) {
        const row = nextBook.find(r => r.id === rowId);
        const current = state.marks.marks[mId];
        if (row && row.runId === action.runId && current?.provenance?.sourceName === 'Broker run') {
          updates.push({
            marketId: mId,
            correction: true,
            provenance: { ...current.provenance, observedAt: action.receivedOn },
          });
        }
      }
      // The DE THG bundle marks carry the run id in their note; re-date those that are still this run's quote.
      for (const [mId, entry] of Object.entries(state.marks.marks)) {
        if (
          mId.startsWith(DE_THG_BUNDLE_MARK_PREFIX) &&
          entry.provenance?.sourceName === 'Broker run' &&
          entry.provenance.note?.includes(`Run ${action.runId}.`)
        ) {
          updates.push({ marketId: mId, correction: true, provenance: { ...entry.provenance, observedAt: action.receivedOn } });
        }
      }
      const nextMarks = applyMarkUpdates(state.marks, updates);
      return {
        ...state,
        pricingRunMeta: nextRunMeta,
        pricingBook: nextBook,
        marks: nextMarks,
      };
    }
    case 'SET_MARKET_REFERENCE_ROW': {
      const row = state.pricingBook.find(r => r.id === action.rowId);
      if (!row || !rowFeedsMarket(row, action.marketId) || !rowHasPrice(row)) return state;
      const update = createMarkUpdateFromRow(row, action.marketId, state.pricingRunMeta?.receivedOn);
      const nextMarks = applyMarkUpdates(state.marks, [update]);
      return {
        ...state,
        marks: nextMarks,
        referenceRowIds: {
          ...state.referenceRowIds,
          [action.marketId]: action.rowId,
        },
      };
    }
    case 'ADD_PRICING_RUN': {
      const nextBook = [...state.pricingBook, ...action.rows];
      const updates: MarkUpdate[] = [];
      const nextRefIds = { ...state.referenceRowIds };
      const candidates: { mId: string; rowId: string; update: MarkUpdate }[] = [];
      for (const row of action.rows) {
        const mId = resolveMarketForQuote(row);
        if (mId && rowFeedsMarket(row, mId) && (row.bidPriceNumeric !== null || row.offerPriceNumeric !== null)) {
          const update = createMarkUpdateFromRow(row, mId, action.runMeta.receivedOn);
          updates.push(update);
          candidates.push({ mId, rowId: row.id, update });
        }
      }
      updates.push(...deThgBundleMarkUpdates(action.rows, action.runMeta.receivedOn));
      const nextMarks = applyMarkUpdates(state.marks, updates);
      // Only move the reference star when the mark actually took this row's quote
      // (an older run date never displaces a newer mark).
      for (const { mId, rowId, update } of candidates) {
        const m = nextMarks.marks[mId];
        if (m && m.provenance?.observedAt === update.provenance?.observedAt && m.bid === update.bid && m.offer === update.offer) {
          nextRefIds[mId] = rowId;
        }
      }
      return {
        ...state,
        pricingBook: nextBook,
        marks: nextMarks,
        referenceRowIds: nextRefIds,
      };
    }
    case 'RESET':
      return createDefaultState();
    default:
      return state;
  }
}
