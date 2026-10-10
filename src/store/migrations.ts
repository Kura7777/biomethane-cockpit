import { Consignment } from '../domain/consignment/types';
import { PriceSide, MarkEntry } from '../domain/markets/types';
import { MARKETS } from '../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../domain/consignment/feedstocks';
import { simulateDesk } from '../domain/marks/simulate';
import {
  PricingBookEntry,
  INITIAL_PRICING_BOOK,
  BASELINE_RUN_META,
  NON_BROKER_SEED_ROW_IDS,
} from '../domain/markets/brokerRun.seed';
import { seedMarksFromPricingBook } from '../domain/marks/applyMarks';
import { AppState, CURRENT_SCHEMA_VERSION, createDefaultState } from './state';

interface RawLegacyMarks {
  marks?: Record<string, {
    bid?: number | null;
    offer?: number | null;
    mid?: number | null;
    updatedAt?: string | null;
    timestamp?: string | null;
    source?: string | null;
    sourceNote?: string | null;
  }>;
  gasIndex?: {
    bid?: number | null;
    offer?: number | null;
    mid?: number | null;
    updatedAt?: string | null;
  };
  fx?: {
    gbpEur?: number | null;
    chfEur?: number | null;
    updatedAt?: string | null;
  };
  pricingSide?: PriceSide;
}

interface RawStateShape {
  schemaVersion?: number;
  marks?: RawLegacyMarks;
  costs?: Partial<AppState['costs']>;
  consignments?: Consignment[];
  activeConsignmentId?: string;
  savedAssessments?: AppState['savedAssessments'];
  selectedMarketId?: string | null;
}

/**
 * Migration function to upgrade legacy state shapes safely without data loss
 */
export function migrateState(raw: unknown): AppState {
  if (!raw || typeof raw !== 'object') {
    return createDefaultState();
  }

  const rawRecord = raw as RawStateShape;
  const stateVersion = rawRecord.schemaVersion || 1;
  const migrated: AppState = { ...(raw as AppState) };

  if (stateVersion < 2) {
    // Migrate marks shape to include updatedAt and source
    const rawMarks = rawRecord.marks?.marks || {};
    const updatedMarks: Record<string, MarkEntry> = {};

    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      const existing = rawMarks[m.id];
      if (existing) {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: existing.bid ?? null,
          offer: existing.offer ?? null,
          mid: existing.mid ?? null,
          updatedAt: existing.updatedAt || existing.timestamp || null,
          source: existing.source || existing.sourceNote || 'Imported mark',
        };
      } else {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
        };
      }
    });

    migrated.marks = {
      marks: updatedMarks,
      gasIndex: {
        bid: rawRecord.marks?.gasIndex?.bid ?? null,
        offer: rawRecord.marks?.gasIndex?.offer ?? null,
        mid: rawRecord.marks?.gasIndex?.mid ?? null,
        updatedAt: rawRecord.marks?.gasIndex?.updatedAt ?? null,
      },
      fx: {
        gbpEur: rawRecord.marks?.fx?.gbpEur ?? null,
        chfEur: rawRecord.marks?.fx?.chfEur ?? null,
        updatedAt: rawRecord.marks?.fx?.updatedAt ?? null,
      },
      pricingSides: {
        certificateSide: rawRecord.marks?.pricingSide ?? 'bid',
        moleculeSide: rawRecord.marks?.pricingSide ?? 'bid',
      },
    };
  }

  if (stateVersion < 4) {
    // Schema v4 migration: existing state gets producerPricing = null, flagged incomplete
    if (!migrated.costs) {
      migrated.costs = {
        transferCosts: null,
        certificationCosts: null,
        logistics: null,
        otherCosts: null,
        producerPricing: null,
      };
    } else {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: null,
      };
    }
  }

  if (stateVersion < 5) {
    // Schema v5 migration: existing marks get provenance with all fields null, observedAt seeded from existing updatedAt
    const rawMarks = migrated.marks?.marks || {};
    const updatedMarks: Record<string, MarkEntry> = {};

    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      const existing = rawMarks[m.id];
      if (existing) {
        updatedMarks[m.id] = {
          ...existing,
          marketId: m.id,
          provenance: existing.provenance ?? {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: existing.updatedAt ?? null,
            note: null,
          },
        };
      } else {
        updatedMarks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
          provenance: {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: null,
            note: null,
          },
        };
      }
    });

    migrated.marks = {
      ...migrated.marks,
      marks: updatedMarks,
      gasIndex: {
        ...migrated.marks?.gasIndex,
        bid: migrated.marks?.gasIndex?.bid ?? null,
        offer: migrated.marks?.gasIndex?.offer ?? null,
        mid: migrated.marks?.gasIndex?.mid ?? null,
        updatedAt: migrated.marks?.gasIndex?.updatedAt ?? null,
        provenance: migrated.marks?.gasIndex?.provenance ?? {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: migrated.marks?.gasIndex?.updatedAt ?? null,
          note: null,
        },
      },
      fx: {
        ...migrated.marks?.fx,
        gbpEur: migrated.marks?.fx?.gbpEur ?? null,
        chfEur: migrated.marks?.fx?.chfEur ?? null,
        updatedAt: migrated.marks?.fx?.updatedAt ?? null,
        provenance: migrated.marks?.fx?.provenance ?? {
          sourceType: null,
          sourceName: null,
          sourceUrl: null,
          observedAt: migrated.marks?.fx?.updatedAt ?? null,
          note: null,
        },
      },
    };
  }

  if (stateVersion < 6) {
    // Schema v6 migration: existing consignments get deliveryPeriod with all fields null
    migrated.consignments = (migrated.consignments || []).map(c => ({
      ...c,
      deliveryPeriod: c.deliveryPeriod ?? {
        type: null,
        startDate: null,
        endDate: null,
        complianceYear: null,
      },
    }));
  }

  if (stateVersion < 7) {
    // Schema v7 migration: existing consignments get counterparty: null
    migrated.consignments = (migrated.consignments || []).map(c => ({
      ...c,
      counterparty: c.counterparty ?? null,
    }));
  }

  if (stateVersion < 8 && migrated.marks) {
    // Schema v8 migration: the scalar marks.pricingSide is retired in favour of the
    // per-leg pair, which is now the only stored source of truth. An existing scalar
    // meant "both legs at this side", so it maps across without loss. Any pair the
    // user had already set wins, since the scalar could never express it.
    const legacyScalar = (migrated.marks as { pricingSide?: PriceSide }).pricingSide ?? 'bid';
    migrated.marks = {
      ...migrated.marks,
      pricingSides: migrated.marks.pricingSides ?? {
        certificateSide: legacyScalar,
        moleculeSide: legacyScalar,
      },
    };
    delete (migrated.marks as { pricingSide?: PriceSide }).pricingSide;
  }

  if (stateVersion < 8 && migrated.costs) {
    // Schema v8 migration: costs.deliveredCost is retired. computeNetback never read
    // it — producer payment flows through producerPricing — yet two screens subtracted
    // it a second time on top of a netback that already nets the producer off.
    //
    // A stored value is only meaningful as a fixed producer price, and only when the
    // desk is actually on FIXED_PRICE with that price still unset. Overwriting a price
    // the user has already entered would be inventing a term of their contract, so in
    // every other case the value is dropped rather than guessed at.
    const legacyDelivered = (migrated.costs as { deliveredCost?: number | null }).deliveredCost ?? null;
    const pricing = migrated.costs.producerPricing ?? null;

    if (
      legacyDelivered !== null &&
      pricing?.mode === 'FIXED_PRICE' &&
      pricing.fixedPriceEurPerMwh === null
    ) {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: { ...pricing, fixedPriceEurPerMwh: legacyDelivered },
      };
    }

    delete (migrated.costs as { deliveredCost?: number | null }).deliveredCost;
  }

  if (stateVersion < 9) {
    // Schema v9 migration: uncalibrated legacy indexLinkedShare (< 0.85) upgraded to institutional standard (0.970)
    if (
      migrated.costs?.producerPricing?.mode === 'INDEX_LINKED' &&
      (migrated.costs.producerPricing.indexLinkedShare === null ||
        (typeof migrated.costs.producerPricing.indexLinkedShare === 'number' &&
          migrated.costs.producerPricing.indexLinkedShare < 0.85))
    ) {
      migrated.costs = {
        ...migrated.costs,
        producerPricing: {
          ...migrated.costs.producerPricing,
          indexLinkedShare: 0.970,
        },
      };
    }
  }

  if (stateVersion < 10) {
    // Schema v10 migration: order book lives in store and seeds market marks
    if (!migrated.pricingBook || !Array.isArray(migrated.pricingBook) || migrated.pricingBook.length === 0) {
      migrated.pricingBook = INITIAL_PRICING_BOOK;
    }
    if (!migrated.pricingRunMeta) {
      migrated.pricingRunMeta = BASELINE_RUN_META;
    }
    if (!migrated.referenceRowIds) {
      migrated.referenceRowIds = {};
    }

    // Seed broker marks for markets with broker rows, respecting precedence rules
    // (any non-simulated manual marks the user had entered in prior sessions are preserved)
    const { nextMarks, referenceRowIds } = seedMarksFromPricingBook(
      migrated.marks,
      migrated.pricingBook,
      migrated.pricingRunMeta.receivedOn
    );
    migrated.marks = nextMarks;
    migrated.referenceRowIds = { ...referenceRowIds, ...(migrated.referenceRowIds || {}) };
  }

  if (stateVersion < 11 && migrated.marks && migrated.pricingBook) {
    // Schema v11 migration: the DE THG manure bundle quotes become marks (certificate-only, EUR/MWh),
    // seeded from the order book already in this state.
    migrated.marks = seedMarksFromPricingBook(
      migrated.marks,
      migrated.pricingBook,
      migrated.pricingRunMeta?.receivedOn
    ).nextMarks;
  }

  if (stateVersion < 12 && migrated.pricingBook) {
    // Schema v12 migration: only the broker sheet's rows carry the Broker tag. The seed rows that were
    // wrongly tagged with the broker run id (RTFO, ERE, DE THG) become desk estimates; rows the trader
    // has edited are left alone, and a mark still fed by one of them goes back to a simulated mark.
    const seedById = new Map(INITIAL_PRICING_BOOK.map(r => [r.id, r]));
    const retagged = new Set<string>();
    migrated.pricingBook = migrated.pricingBook.map((r: PricingBookEntry) => {
      if (NON_BROKER_SEED_ROW_IDS.includes(r.id) && r.provenanceTier === 'BROKER_RUN' && !r.editedAt) {
        retagged.add(r.id);
        return seedById.get(r.id) ?? r;
      }
      return r;
    });
    if (migrated.marks?.marks && migrated.referenceRowIds) {
      const sim = simulateDesk().marks.marks;
      const nextRefs = { ...migrated.referenceRowIds };
      for (const [mId, rowId] of Object.entries(migrated.referenceRowIds)) {
        const mark = migrated.marks.marks[mId];
        if (retagged.has(rowId as string) && mark?.provenance?.sourceName === 'Broker run' && sim[mId]) {
          migrated.marks.marks[mId] = sim[mId];
          delete nextRefs[mId];
        }
      }
      migrated.referenceRowIds = nextRefs;
    }
  }

  if (stateVersion < 14) {
    // Schema v14 migration: the Pricing desk → Costs tab tags every cost field Simulated or
    // Manual. A desk that already existed before this field can't have that provenance
    // reconstructed, so every pre-existing cost is tagged Manual — the honest default for a
    // value we can no longer prove came from the simulator.
    if (!migrated.costsSource) {
      migrated.costsSource = {
        transferCosts: 'MANUAL',
        certificationCosts: 'MANUAL',
        logistics: 'MANUAL',
        otherCosts: 'MANUAL',
        greenAlpha: 'MANUAL',
      };
    }
  }

  if (stateVersion < 13 && Array.isArray(migrated.savedAssessments)) {
    // Schema v13 migration: the blotter needs a status on every saved deal. Deals saved before
    // the blotter existed carry none — they read as INDICATIVE, the status a fresh save starts at.
    migrated.savedAssessments = migrated.savedAssessments.map(a => {
      if (a.status) return a;
      const at = a.createdAt || new Date().toISOString();
      return {
        ...a,
        status: 'INDICATIVE' as const,
        statusHistory: a.statusHistory?.length ? a.statusHistory : [{ status: 'INDICATIVE' as const, at }],
      };
    });
  }

  if (stateVersion < 15) {
    // Schema v15 migration: the NL green-gas obligation (NL_GGE) is a new market. A saved desk gets its
    // pricing-book row and a simulated mark (flagged Simulated) so #/pricing can show and edit it.
    // Saved deals need nothing: Consignment.custody is optional and a missing pack reads as TODOs.
    if (Array.isArray(migrated.pricingBook) && !migrated.pricingBook.some(r => r.id === 'nl_gge')) {
      const seedRow = INITIAL_PRICING_BOOK.find(r => r.id === 'nl_gge');
      if (seedRow) migrated.pricingBook = [...migrated.pricingBook, seedRow];
    }
    if (migrated.marks?.marks && !migrated.marks.marks.NL_GGE) {
      migrated.marks = {
        ...migrated.marks,
        marks: { ...migrated.marks.marks, NL_GGE: simulateDesk().marks.marks.NL_GGE },
      };
    }
  }

  migrated.schemaVersion = CURRENT_SCHEMA_VERSION;

  // Ensure all active markets exist in marks dictionary
  if (migrated.marks && migrated.marks.marks) {
    MARKETS.filter(m => m.status === 'ACTIVE').forEach(m => {
      if (!migrated.marks.marks[m.id]) {
        migrated.marks.marks[m.id] = {
          marketId: m.id,
          bid: null,
          offer: null,
          mid: null,
          updatedAt: null,
          source: null,
          provenance: {
            sourceType: null,
            sourceName: null,
            sourceUrl: null,
            observedAt: null,
            note: null,
          },
        };
      }
    });
  }

  // Ensure default reference consignments exist if list is empty
  if (!Array.isArray(migrated.consignments) || migrated.consignments.length === 0) {
    migrated.consignments = [
      REFERENCE_CONSIGNMENTS.DANISH_MANURE,
      REFERENCE_CONSIGNMENTS.SPANISH_MANURE,
      REFERENCE_CONSIGNMENTS.UK_FOOD_WASTE,
      REFERENCE_CONSIGNMENTS.ISCC_PLUS_VOLUNTARY,
    ];
    migrated.activeConsignmentId = REFERENCE_CONSIGNMENTS.DANISH_MANURE.id;
  }

  return migrated as AppState;
}
