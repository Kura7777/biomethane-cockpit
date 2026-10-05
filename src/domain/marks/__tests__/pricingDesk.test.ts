import { describe, it, expect } from 'vitest';
import {
  applyMarkUpdates,
  seedMarksFromPricingBook,
  isSimulatedMark,
  findDefaultReferenceRow,
  resolveMarketForQuote,
  rowFeedsMarket,
  quoteIdentityForMarket,
  createMarkUpdateFromRow,
} from '../applyMarks';
import {
  INITIAL_PRICING_BOOK,
  BASELINE_RUN_META,
  PricingBookEntry,
  toSupplyEntries,
} from '../../markets/brokerRun.seed';
import { MARKETS } from '../../markets/registry';
import { AppState, appReducer, migrateState } from '../../../store/context';
import { createEmptyDeskState } from '../../__tests__/empty_desk_audit.test';
import { priceCorporateOrder, buildSupplyBook, CorporateOrderSpec } from '../../corporate/orderPricer';
import { BASELINE_BROKER_RUNS } from '../../markets/brokerRuns';
import { INITIAL_BROKER_QUOTES } from '../../markets/brokerMarketData';
import { parseBrokerRunText } from '../../markets/brokerRunParser';
import { SIMULATED_SOURCE_NAME } from '../simulate';

describe('Pricing Desk & Ingress Seam Unit Tests (Phase 1b)', () => {
  describe('applyMarkUpdates Precedence Rules', () => {
    it('Rule 1: Simulated value NEVER overwrites a real (non-simulated) mark', () => {
      const baseState = createEmptyDeskState().marks;
      // Setup a real broker mark for DE_THG
      const realState = applyMarkUpdates(baseState, [
        {
          marketId: 'DE_THG',
          bid: 280,
          offer: 290,
          mid: 285,
          source: 'Broker Quote',
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Biofuels Daily',
            sourceUrl: null,
            observedAt: '2026-08-18T10:00:00Z',
            note: null,
          },
        },
      ]);

      expect(realState.marks['DE_THG'].mid).toBe(285);
      expect(isSimulatedMark(realState.marks['DE_THG'])).toBe(false);

      // Attempt to overwrite with simulated mark
      const attemptedSimulated = applyMarkUpdates(realState, [
        {
          marketId: 'DE_THG',
          bid: 300,
          offer: 310,
          mid: 305,
          source: 'Simulated Desk',
          provenance: {
            sourceType: 'ESTIMATE',
            sourceName: 'Simulated Desk',
            sourceUrl: null,
            observedAt: '2026-09-01T10:00:00Z',
            note: null,
          },
        },
      ]);

      // The real mark must be preserved
      expect(attemptedSimulated.marks['DE_THG'].mid).toBe(285);
      expect(attemptedSimulated.marks['DE_THG'].bid).toBe(280);
      expect(attemptedSimulated.marks['DE_THG'].offer).toBe(290);
      expect(attemptedSimulated.marks['DE_THG'].source).toBe('Broker Quote');
    });

    it('Rule 2: Older observation NEVER overwrites a newer observation', () => {
      const baseState = createEmptyDeskState().marks;
      const newerState = applyMarkUpdates(baseState, [
        {
          marketId: 'UK_RTFO',
          bid: 0.22,
          offer: 0.24,
          mid: 0.23,
          source: 'Broker A',
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Broker A',
            sourceUrl: null,
            observedAt: '2026-08-20T10:00:00Z',
            note: null,
          },
        },
      ]);

      // Attempt to apply an older quote (2026-08-15)
      const olderUpdate = applyMarkUpdates(newerState, [
        {
          marketId: 'UK_RTFO',
          bid: 0.18,
          offer: 0.20,
          mid: 0.19,
          source: 'Broker B',
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Broker B',
            sourceUrl: null,
            observedAt: '2026-08-15T10:00:00Z',
            note: null,
          },
        },
      ]);

      expect(olderUpdate.marks['UK_RTFO'].mid).toBe(0.23);
      expect(olderUpdate.marks['UK_RTFO'].bid).toBe(0.22);
      expect(olderUpdate.marks['UK_RTFO'].source).toBe('Broker A');
    });

    it('Rule 3: Real observation ALWAYS upgrades simulated mark regardless of simulation timestamp', () => {
      const baseState = createEmptyDeskState().marks;
      // Setup a simulated mark with a future/recent date
      const simulatedState = applyMarkUpdates(baseState, [
        {
          marketId: 'FR_GO',
          bid: 18,
          offer: 22,
          mid: 20,
          source: 'Simulated Desk',
          provenance: {
            sourceType: 'ESTIMATE',
            sourceName: 'Simulated Desk',
            sourceUrl: null,
            observedAt: '2026-09-01T12:00:00Z',
            note: null,
          },
        },
      ]);

      // Apply a real broker run from 2026-08-18
      const upgradedState = applyMarkUpdates(simulatedState, [
        {
          marketId: 'FR_GO',
          bid: null,
          offer: 20.5,
          mid: null,
          source: 'Broker Quote',
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: 'Broker Run (18 Aug 2026)',
            sourceUrl: null,
            observedAt: '2026-08-18T00:00:00Z',
            note: null,
          },
        },
      ]);

      expect(upgradedState.marks['FR_GO'].offer).toBe(20.5);
      expect(upgradedState.marks['FR_GO'].source).toBe('Broker Quote');
      expect(isSimulatedMark(upgradedState.marks['FR_GO'])).toBe(false);
    });

    it('Computes mid as null for one-sided quotes', () => {
      const baseState = createEmptyDeskState().marks;
      const updated = applyMarkUpdates(baseState, [
        {
          marketId: 'UK_RGGO',
          bid: null,
          offer: 25.0,
          source: 'Broker Quote',
        },
      ]);

      expect(updated.marks['UK_RGGO'].bid).toBeNull();
      expect(updated.marks['UK_RGGO'].offer).toBe(25.0);
      expect(updated.marks['UK_RGGO'].mid).toBeNull();
    });

    it('Computes mid as average when both bid and offer exist', () => {
      const baseState = createEmptyDeskState().marks;
      const updated = applyMarkUpdates(baseState, [
        {
          marketId: 'DE_THG',
          bid: 280,
          offer: 290,
          source: 'Broker Quote',
        },
      ]);

      expect(updated.marks['DE_THG'].mid).toBe(285);
    });
  });

  describe('Order Book Seeding & Canonical Market Mapping', () => {
    it('seeds marks for the 8 markets that have a priced, same-product broker row', () => {
      const baseMarks = createEmptyDeskState().marks;
      const { nextMarks: seededMarks, referenceRowIds } = seedMarksFromPricingBook(
        baseMarks,
        INITIAL_PRICING_BOOK,
        BASELINE_RUN_META.receivedOn
      );

      const targetMarkets = [
        'UK_RGGO',
        'UK_RTFO',
        'FR_GO',
        'NL_GO',
        'NL_ERE',
        'DE_GO',
        'DE_THG',
        'DK_GO',
      ];

      for (const mId of targetMarkets) {
        const mark = seededMarks.marks[mId];
        expect(mark, `Mark for ${mId} must exist`).toBeDefined();
        expect(mark.source).toBe('Broker run');
        expect(mark.provenance?.sourceType).toBe('BROKER_INDICATION');
        expect(isSimulatedMark(mark)).toBe(false);
      }

      // Check reference row assignments
      expect(referenceRowIds['UK_RGGO']).toBe('uk_1');
      expect(referenceRowIds['UK_RTFO']).toBe('uk_rtfo');
      expect(referenceRowIds['DE_THG']).toBe('de_thg_1');
      expect(referenceRowIds['NL_ERE']).toBe('nl_ere');
      expect(referenceRowIds['DE_GO']).toBe('de_2');
      expect(referenceRowIds['FR_GO']).toBe('fr_5');
      expect(referenceRowIds['NL_GO']).toBe('nl_2');
      expect(referenceRowIds['DK_GO']).toBe('dk_4');
      // AIB GO: the only priced AIB broker row is a bundled physical product (not a GO certificate price)
      // and the two AIB GO rows carry no price, so AIB_GO keeps its simulated mark.
      expect(referenceRowIds['AIB_GO']).toBeUndefined();
      expect(seededMarks.marks['AIB_GO']).toBeDefined();
      expect(isSimulatedMark(seededMarks.marks['AIB_GO'])).toBe(true);
    });

    it('resolves product types correctly for DE_THG vs THG_BUNDLED', () => {
      const thgCert = INITIAL_PRICING_BOOK.find(r => r.id === 'de_thg_1');
      const thgBundled = INITIAL_PRICING_BOOK.find(r => r.id === 'de_1');

      expect(thgCert).toBeDefined();
      expect(thgBundled).toBeDefined();

      expect(resolveMarketForQuote(thgCert!)).toBe('DE_THG');
      // Physical bundled gas is not the standalone quota certificate
      expect(resolveMarketForQuote(thgBundled!)).toBeNull();
    });
  });

  describe('State Reducer & Actions Integration', () => {
    it('migrates v9 state to v10 with pricingBook and preserved marks', () => {
      const v9State: any = {
        schemaVersion: 9,
        marks: {
          marks: {
            UK_RGGO: {
              marketId: 'UK_RGGO',
              bid: 26,
              offer: 28,
              mid: 27,
              source: 'Manual Mark',
              provenance: {
                sourceType: 'BROKER_INDICATION',
                sourceName: 'Desk · manual',
                observedAt: '2026-09-01T00:00:00Z',
              },
            },
          },
          gasIndex: { bid: 35, offer: 37, mid: 36, updatedAt: '2026-09-01T00:00:00Z' },
          fx: { gbpEur: 1.18, chfEur: 1.05, updatedAt: '2026-09-01T00:00:00Z' },
          pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
        },
        consignments: [],
        activeConsignmentId: null,
        costs: {},
        savedAssessments: [],
        selectedMarketId: null,
      };

      const nextState = migrateState(v9State);

      expect(nextState.schemaVersion).toBe(10);
      expect(nextState.pricingBook).toBeDefined();
      expect(nextState.pricingBook.length).toBe(INITIAL_PRICING_BOOK.length);
      expect(nextState.pricingRunMeta).toEqual(BASELINE_RUN_META);
      expect(nextState.referenceRowIds).toBeDefined();
      // Manual mark was preserved
      expect(nextState.marks.marks['UK_RGGO'].mid).toBe(27);
    });

    it('UPDATE_PRICING_BOOK_CELL updates cell and propagates to marks if reference row', () => {
      const initialMarks = createEmptyDeskState().marks;
      const { nextMarks: seededMarks, referenceRowIds } = seedMarksFromPricingBook(
        initialMarks,
        INITIAL_PRICING_BOOK,
        BASELINE_RUN_META.receivedOn
      );

      const state: AppState = {
        ...createEmptyDeskState(),
        marks: seededMarks,
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds,
      };

      // Reference row for DE_THG is de_thg_1
      expect(state.referenceRowIds['DE_THG']).toBe('de_thg_1');

      // Edit bid on de_thg_1
      const updatedState = appReducer(state, {
        type: 'UPDATE_PRICING_BOOK_CELL',
        id: 'de_thg_1',
        field: 'bidPrice',
        value: '€295.00',
      });

      const updatedRow = updatedState.pricingBook.find(r => r.id === 'de_thg_1');
      expect(updatedRow?.bidPriceNumeric).toBe(295);

      // The mark for DE_THG must reflect the new bid and recomputed mid (295 + 290) / 2 = 292.5
      expect(updatedState.marks.marks['DE_THG'].bid).toBe(295);
      expect(updatedState.marks.marks['DE_THG'].offer).toBe(290);
      expect(updatedState.marks.marks['DE_THG'].mid).toBe(292.5);
    });

    it('SIMULATE_DESK does not overwrite broker marks', () => {
      const initialMarks = createEmptyDeskState().marks;
      const { nextMarks: seededMarks, referenceRowIds } = seedMarksFromPricingBook(
        initialMarks,
        INITIAL_PRICING_BOOK,
        BASELINE_RUN_META.receivedOn
      );

      const state: AppState = {
        ...createEmptyDeskState(),
        marks: seededMarks,
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds,
      };

      // Verify DE_THG is broker-quoted
      expect(state.marks.marks['DE_THG'].bid).toBe(280);
      expect(state.marks.marks['DE_THG'].source).toBe('Broker run');

      // Dispatch SIMULATE_DESK
      const simulatedState = appReducer(state, { type: 'SIMULATE_DESK' });

      // Broker mark must remain intact
      expect(simulatedState.marks.marks['DE_THG'].bid).toBe(280);
      expect(simulatedState.marks.marks['DE_THG'].offer).toBe(290);
      expect(simulatedState.marks.marks['DE_THG'].source).toBe('Broker run');

      // Simulated markets (e.g. unseeded compliance/voluntary like PL_GO or CH_GO) may update
      const simulatedMarketsCount = Object.values(simulatedState.marks.marks).filter(m => isSimulatedMark(m)).length;
      const totalMarks = Object.keys(simulatedState.marks.marks).length;
      expect(simulatedMarketsCount).toBe(totalMarks - 8); // 8 broker-seeded markets keep their broker mark
    });

    it('SET_PRICING_RUN_DATE updates run date across broker rows and updates mark timestamps', () => {
      const initialMarks = createEmptyDeskState().marks;
      const { nextMarks: seededMarks, referenceRowIds } = seedMarksFromPricingBook(
        initialMarks,
        INITIAL_PRICING_BOOK,
        BASELINE_RUN_META.receivedOn
      );

      const state: AppState = {
        ...createEmptyDeskState(),
        marks: seededMarks,
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds,
      };

      const newDate = '2026-08-25';
      const updatedState = appReducer(state, {
        type: 'SET_PRICING_RUN_DATE',
        runId: BASELINE_RUN_META.runId,
        receivedOn: newDate,
      });

      expect(updatedState.pricingRunMeta.receivedOn).toBe(newDate);
      const brokerRows = updatedState.pricingBook.filter(r => r.runId === BASELINE_RUN_META.runId);
      expect(brokerRows.every(r => r.observedAt === newDate)).toBe(true);
      expect(updatedState.marks.marks['DE_THG'].provenance?.observedAt).toBe(newDate);
    });

    it('ADD_PRICING_RUN stamps observedAt with detected or entered date and updates marks', () => {
      const state: AppState = {
        ...createEmptyDeskState(),
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds: {},
      };

      const newRunRows: PricingBookEntry[] = [
        {
          id: 'new_thg_quote',
          country: 'DE',
          class: 'THG',
          productClass: 'BUNDLED_COMPLIANCE',
          feedstock: 'Manure',
          vintage: '2026',
          certified: 'Certified (ISCC)',
          subsidized: 'Unsubsidised',
          ciScore: '-100gCO2/MJ',
          ciNumeric: -100,
          currency: 'EUR',
          bidPrice: '€310.00',
          offerPrice: '€320.00',
          bidPriceNumeric: 310,
          offerPriceNumeric: 320,
          bidVolume: '50GWh',
          offerVolume: '50GWh',
          bidVolumeGWh: 50,
          offerVolumeGWh: 50,
          provenanceTier: 'BROKER_RUN',
          observedAt: '2026-09-02',
          isTradeable: true,
        },
      ];

      const updatedState = appReducer(state, {
        type: 'ADD_PRICING_RUN',
        rows: newRunRows,
        runMeta: {
          runId: 'argus-2026-09-02',
          broker: 'Argus Media',
          receivedOn: '2026-09-02',
          receivedOnIsApproximate: false,
        },
      });

      expect(updatedState.pricingBook.some(r => r.id === 'new_thg_quote')).toBe(true);
      expect(updatedState.marks.marks['DE_THG'].bid).toBe(310);
      expect(updatedState.marks.marks['DE_THG'].offer).toBe(320);
      expect(updatedState.marks.marks['DE_THG'].mid).toBe(315);
      expect(updatedState.marks.marks['DE_THG'].provenance?.observedAt).toBe('2026-09-02');
    });

    it('Corporate order supply book builds dynamically from state.pricingBook', () => {
      const state: AppState = {
        ...createEmptyDeskState(),
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds: {},
      };

      const entries = toSupplyEntries(state.pricingBook);

      // Exactly the 36 GO / RGGO offers Corporate priced from BASELINE_BROKER_RUNS before this change
      expect(entries.length).toBe(BASELINE_BROKER_RUNS.length);
      for (const b of BASELINE_BROKER_RUNS) {
        const e = entries.find(x => x.id === b.id)!;
        expect(e, b.id).toBeDefined();
        expect(e.bidPrice).toBe(b.bidPrice);
        expect(e.offerPrice).toBe(b.offerPrice);
        expect(e.bidVolumeGWh).toBe(b.bidVolumeGWh);
        expect(e.offerVolumeGWh).toBe(b.offerVolumeGWh);
        expect(e.vintage).toBe(b.vintage);
        expect(e.ciNumeric).toBe(b.ciNumeric);
        expect(e.subsidized).toBe(b.subsidized);
        expect(e.certified).toBe(b.certified);
        expect(e.country).toBe(b.country);
        expect(e.class).toBe(b.class);
      }
      const lines = buildSupplyBook(state.marks, entries);
      const baselineLines = buildSupplyBook(state.marks);
      expect(lines.length).toBe(baselineLines.length);
      expect(lines.map(l => l.offerEurPerMWh).sort()).toEqual(baselineLines.map(l => l.offerEurPerMWh).sort());

      const spec: CorporateOrderSpec = {
        volumeMWh: 10000,
        form: 'GO_PLUS_POS',
        countries: ['DE'],
        vintageYear: 2026,
        maxCi: null,
        unsubsidisedOnly: false,
        excludeCrops: false,
        claim: 'SCOPE1_VOLUNTARY',
      };

      const quote = priceCorporateOrder(
        spec,
        { transferCostEurPerMWh: null, marginEurPerMWh: null },
        state.marks,
        entries
      );

      expect(quote).toBeDefined();
      expect(quote.ladder.length).toBeGreaterThan(0);
    });
  });

  describe('Phase 1b additions', () => {
    const seededState = (): AppState => {
      const { nextMarks, referenceRowIds } = seedMarksFromPricingBook(
        createEmptyDeskState().marks,
        INITIAL_PRICING_BOOK,
        BASELINE_RUN_META.receivedOn
      );
      return {
        ...createEmptyDeskState(),
        marks: nextMarks,
        pricingBook: [...INITIAL_PRICING_BOOK],
        pricingRunMeta: BASELINE_RUN_META,
        referenceRowIds,
      };
    };

    it('migration keeps a legacy manual mark that has no provenance, and seeds the rest', () => {
      const v9: any = {
        schemaVersion: 9,
        marks: {
          marks: { DE_THG: { marketId: 'DE_THG', bid: 301, offer: 303, mid: 302, updatedAt: '2026-09-20T00:00:00Z', source: 'manual' } },
          gasIndex: { bid: 35, offer: 37, mid: 36, updatedAt: '2026-09-20T00:00:00Z' },
          fx: { gbpEur: 1.18, chfEur: 1.05, updatedAt: '2026-09-20T00:00:00Z' },
          pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
        },
        consignments: [], activeConsignmentId: null, costs: {}, savedAssessments: [], selectedMarketId: null,
      };
      const next = migrateState(v9);
      expect(next.marks.marks['DE_THG'].mid).toBe(302);
      expect(next.marks.marks['DE_THG'].bid).toBe(301);
      expect(next.marks.marks['NL_ERE'].source).toBe('Broker run');
      expect(next.pricingBook.length).toBe(69);
    });

    it('simulated over simulated refreshes; older real observation never replaces a newer one; correction may re-date', () => {
      const base = seededState().marks;
      const simProv = (observedAt: string) => ({ sourceType: 'ESTIMATE' as const, sourceName: SIMULATED_SOURCE_NAME, sourceUrl: null, observedAt, note: null });
      const sim = applyMarkUpdates(createEmptyDeskState().marks, [{
        marketId: 'PL_OZE', bid: 1, offer: 2, mid: 1.5, source: SIMULATED_SOURCE_NAME, provenance: simProv('2026-09-30T00:00:00Z'),
      }]);
      const sim2 = applyMarkUpdates(sim, [{
        marketId: 'PL_OZE', bid: 3, offer: 4, mid: 3.5, source: SIMULATED_SOURCE_NAME, provenance: simProv('2026-08-01T00:00:00Z'),
      }]);
      expect(sim2.marks['PL_OZE'].bid).toBe(3);

      const older = applyMarkUpdates(base, [{
        marketId: 'DE_THG', bid: 1, offer: 2,
        provenance: { sourceType: 'BROKER_INDICATION', sourceName: 'Old', sourceUrl: null, observedAt: '2026-01-01', note: null },
      }]);
      expect(older.marks['DE_THG'].bid).toBe(280);

      const corrected = applyMarkUpdates(base, [{
        marketId: 'DE_THG', correction: true,
        provenance: { ...base.marks['DE_THG'].provenance!, observedAt: '2026-08-01' },
      }]);
      expect(corrected.marks['DE_THG'].provenance?.observedAt).toBe('2026-08-01');
      expect(corrected.marks['DE_THG'].bid).toBe(280);

      const stillReal = applyMarkUpdates(base, [{
        marketId: 'DE_THG', bid: 9, offer: 9, correction: true, source: SIMULATED_SOURCE_NAME, provenance: simProv('2026-12-01'),
      }]);
      expect(stillReal.marks['DE_THG'].bid).toBe(280);
    });

    it('a one-sided broker quote gives mid: null', () => {
      const m = seededState().marks.marks;
      expect(m['UK_RGGO'].offer).not.toBeNull();
      expect(m['UK_RGGO'].bid).toBeNull();
      expect(m['UK_RGGO'].mid).toBeNull();
      expect(m['DK_GO'].mid).toBeNull();
    });

    it('a GBP quote feeding the EUR-denominated UK RGGO market uses the dataset EUR/MWh figure', () => {
      const row = INITIAL_PRICING_BOOK.find(r => r.id === 'uk_1')!;
      const u = createMarkUpdateFromRow(row, 'UK_RGGO');
      expect(row.offerPriceNumeric).toBe(25);
      expect(u.offer).toBe(29.38);
      const rtfo = createMarkUpdateFromRow(INITIAL_PRICING_BOOK.find(r => r.id === 'uk_rtfo')!, 'UK_RTFO');
      expect(rtfo.bid).toBe(0.205);
    });

    it('bundled physical quotes and unpriced rows never become a GO market mark', () => {
      const aib = INITIAL_PRICING_BOOK.find(r => r.id === 'aib_1')!;
      expect(rowFeedsMarket(aib, 'AIB_GO')).toBe(false);
      const state = seededState();
      const same = appReducer(state, { type: 'SET_MARKET_REFERENCE_ROW', marketId: 'AIB_GO', rowId: 'aib_1' });
      expect(same.marks.marks['AIB_GO']).toBe(state.marks.marks['AIB_GO']);
      const unpriced = INITIAL_PRICING_BOOK.find(r => r.provenanceTier === 'BROKER_RUN' && r.bidPriceNumeric === null && r.offerPriceNumeric === null && r.country === 'UK')!;
      const same2 = appReducer(state, { type: 'SET_MARKET_REFERENCE_ROW', marketId: 'UK_RGGO', rowId: unpriced.id });
      expect(same2.referenceRowIds['UK_RGGO']).toBe('uk_1');
    });

    it('Use as mark moves the reference row and the mark', () => {
      const state = seededState();
      const next = appReducer(state, { type: 'SET_MARKET_REFERENCE_ROW', marketId: 'UK_RGGO', rowId: 'uk_8' });
      expect(next.referenceRowIds['UK_RGGO']).toBe('uk_8');
      expect(next.marks.marks['UK_RGGO'].bid).toBe(17.92);
      expect(next.marks.marks['UK_RGGO'].offer).toBe(18.68);
      expect(next.marks.marks['UK_RGGO'].mid).toBe(18.3);
    });

    it('editing the run date re-dates broker marks but not a mark the trader overwrote by hand', () => {
      const state = seededState();
      const manual = appReducer(state, { type: 'UPDATE_PRICING_BOOK_CELL', id: 'de_thg_1', field: 'bidPrice', value: '295' });
      expect(manual.marks.marks['DE_THG'].source).toBe('Desk · manual');
      const manualObserved = manual.marks.marks['DE_THG'].provenance?.observedAt;
      const redated = appReducer(manual, { type: 'SET_PRICING_RUN_DATE', runId: BASELINE_RUN_META.runId, receivedOn: '2026-08-10' });
      expect(redated.marks.marks['NL_ERE'].provenance?.observedAt).toBe('2026-08-10');
      expect(redated.marks.marks['DE_THG'].provenance?.observedAt).toBe(manualObserved);
      expect(redated.pricingRunMeta.receivedOnIsApproximate).toBe(false);
      const row = manual.pricingBook.find(r => r.id === 'de_thg_1')!;
      expect(row.editedAt).toBeTruthy();
      expect(row.source).toBe('Desk · manual');
    });

    it('SIMULATE_DESK never overwrites a manual edit either', () => {
      const state = seededState();
      const manual = appReducer(state, { type: 'UPDATE_PRICING_BOOK_CELL', id: 'de_thg_1', field: 'offerPrice', value: '299' });
      const sim = appReducer(manual, { type: 'SIMULATE_DESK' });
      expect(sim.marks.marks['DE_THG'].offer).toBe(299);
      expect(sim.marks.marks['DE_THG'].source).toBe('Desk · manual');
    });

    it('reference (non-broker) rows have blank volumes and are not tradeable; broker rows keep theirs', () => {
      const ref = INITIAL_PRICING_BOOK.filter(r => r.provenanceTier !== 'BROKER_RUN');
      expect(ref.length).toBe(29);
      for (const r of ref) {
        expect(r.isTradeable, r.id).toBe(false);
        expect(r.bidVolume, r.id).toBe('');
        expect(r.offerVolume, r.id).toBe('');
        expect(r.bidVolumeGWh, r.id).toBeNull();
        expect(r.offerVolumeGWh, r.id).toBeNull();
      }
      const broker = INITIAL_PRICING_BOOK.filter(r => r.provenanceTier === 'BROKER_RUN');
      expect(broker.length).toBe(40);
      expect(broker.every(r => r.isTradeable && r.runId === BASELINE_RUN_META.runId && r.observedAt === '2026-08-18')).toBe(true);
    });

    it('no quote value changed in the merge: seed matches both source datasets', () => {
      const num = (t: string) => { const m = t.replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };
      for (const a of INITIAL_BROKER_QUOTES) {
        const s = INITIAL_PRICING_BOOK.find(r => r.id === a.id)!;
        expect(s, a.id).toBeDefined();
        expect(s.bidPrice, a.id).toBe(a.bidPrice);
        expect(s.offerPrice, a.id).toBe(a.offerPrice);
        expect(s.currency).toBe(a.currency);
        expect(s.numericBidEurMwh ?? null, a.id).toBe(a.numericBidEurMwh ?? null);
        expect(s.numericOfferEurMwh ?? null, a.id).toBe(a.numericOfferEurMwh ?? null);
        if (a.provenanceTier === 'BROKER_RUN') {
          expect(s.bidVolume, a.id).toBe(a.bidVolume);
          expect(s.offerVolume, a.id).toBe(a.offerVolume);
          if (!s.baselineId) {
            expect(s.bidPriceNumeric, a.id).toBe(a.bidPrice ? num(a.bidPrice) : null);
            expect(s.offerPriceNumeric, a.id).toBe(a.offerPrice ? num(a.offerPrice) : null);
          }
        }
      }
      for (const b of BASELINE_BROKER_RUNS) {
        const s = INITIAL_PRICING_BOOK.find(r => r.baselineId === b.id)!;
        expect(s, b.id).toBeDefined();
        expect(s.bidPriceNumeric, b.id).toBe(b.bidPrice);
        expect(s.offerPriceNumeric, b.id).toBe(b.offerPrice);
        expect(s.bidVolumeGWh, b.id).toBe(b.bidVolumeGWh);
        expect(s.offerVolumeGWh, b.id).toBe(b.offerVolumeGWh);
        expect(s.ciNumeric, b.id).toBe(b.ciNumeric);
      }
    });

    it('a pasted run with a date in its text stamps that date; without one the date is reported as missing', () => {
      const withDate = parseBrokerRunText('Broker run 2026-09-12\nDE THG 2026  280.00 / 290.00\nUK RTFO  0.205 / 0.225', 'Broker Panel');
      expect(withDate.extractedDate).toBe('2026-09-12');
      expect(withDate.marks.filter(m => m.isValid).length).toBe(2);
      const dmy = parseBrokerRunText('Run of 18/08/2026\nDE THG 2026  280.00 / 290.00');
      expect(dmy.extractedDate).toBe('2026-08-18');
      const none = parseBrokerRunText('DE THG 2026  280.00 / 290.00');
      expect(none.extractedDate).toBeNull();

      const state = seededState();
      const identity = quoteIdentityForMarket('DE_THG')!;
      expect(identity.class).toBe('THG');
      const row: PricingBookEntry = {
        id: 'paste_1', runId: 'broker-run-2026-09-12', country: identity.country, class: identity.class, productClass: identity.productClass,
        feedstock: 'DE THG', vintage: '—', certified: '—', subsidized: '—', ciScore: '—', ciNumeric: null, currency: 'EUR',
        bidPrice: '€ 280', offerPrice: '€ 290', bidPriceNumeric: 280, offerPriceNumeric: 290,
        bidVolume: '', offerVolume: '', bidVolumeGWh: null, offerVolumeGWh: null,
        provenanceTier: 'BROKER_RUN', observedAt: '2026-09-12', isTradeable: true,
      };
      const next = appReducer(state, { type: 'ADD_PRICING_RUN', rows: [row], runMeta: { runId: row.runId!, broker: 'Broker Panel', receivedOn: '2026-09-12', receivedOnIsApproximate: false } });
      expect(next.marks.marks['DE_THG'].provenance?.observedAt).toBe('2026-09-12');
      expect(next.referenceRowIds['DE_THG']).toBe('paste_1');
      expect(new Date(next.marks.marks['DE_THG'].updatedAt!).getTime()).toBeGreaterThan(new Date('2026-10-01').getTime());
      const older = { ...row, id: 'paste_old', observedAt: '2026-08-01', bidPriceNumeric: 1, offerPriceNumeric: 2 };
      const after = appReducer(next, { type: 'ADD_PRICING_RUN', rows: [older], runMeta: { runId: 'old', broker: 'x', receivedOn: '2026-08-01', receivedOnIsApproximate: false } });
      expect(after.marks.marks['DE_THG'].bid).toBe(280);
      expect(after.referenceRowIds['DE_THG']).toBe('paste_1');
    });

    it('the merged parser still yields free-form order-book quotes (former Data Connectors parser) without inventing fields', () => {
      const res = parseBrokerRunText('STX Biomethane Market Update:\nFR GO Mix 2026 Non-subsidised: €20.50 Offer (10 GWh)\nDK Manure ISCC <-100 CI: €144 Bid / €149 Offer');
      expect(res.inferredSource).toBe('STX');
      expect(res.parsedQuoteCount).toBe(2);
      const dk = res.quotes.find(q => q.country === 'DK')!;
      expect(dk.vintage).toBe('—');
      expect(dk.bidVolume).toBe('');
      expect(dk.offerVolume).toBe('');
      const fr = res.quotes.find(q => q.country === 'FR')!;
      expect(fr.offerVolume).toBe('10GWH');
    });
  });
});
