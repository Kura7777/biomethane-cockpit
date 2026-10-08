// If this fails, a refactor changed a number. Only update the snapshot when a price change is
// intended and the owner approved it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDefaultState } from '../../store/context';
import { scanEuropeanArbitrage } from '../arbitrage/engine';
import { computeNetback } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import { calculateLogisticsRoute } from '../logistics/engine';
import { penaltyEur, closeDeficitWithBioLng } from '../fueleu/calculator';
import { priceCorporateOrder, CorporateOrderSpec } from '../corporate/orderPricer';

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

describe('golden numbers (refactor safety net)', () => {
  let seed = 42;
  beforeEach(() => {
    seed = 42;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('scanEuropeanArbitrage: manure, 20,000 MWh, 2026', () => {
    const state = createDefaultState();
    const result = scanEuropeanArbitrage(
      state.marks,
      state.costs,
      'manure',
      undefined,
      'ISCC_EU',
      'MASS_BALANCE',
      undefined,
      20_000,
      2026
    );

    const sorted = [...result.allOpportunities].sort((a, b) =>
      `${a.originCountry}_${a.targetMarketId}`.localeCompare(`${b.originCountry}_${b.targetMarketId}`)
    );

    expect(sorted.length).toBe(result.allOpportunities.length);
    expect({
      count: sorted.length,
      top25: sorted.slice(0, 25).map(o => ({
        key: `${o.originCountry}_${o.targetMarketId}`,
        totalTerminalValueStackEurPerMWh: o.totalTerminalValueStackEurPerMWh == null ? null : round6(o.totalTerminalValueStackEurPerMWh),
        deskNetMarginEurPerMWh: o.deskNetMarginEurPerMWh == null ? null : round6(o.deskNetMarginEurPerMWh),
      })),
    }).toMatchSnapshot();
  });

  it('computeNetback: Danish manure 20,000 MWh across active compliance markets', () => {
    const state = createDefaultState();
    const consignment = { ...REFERENCE_CONSIGNMENTS.DANISH_MANURE, volumeMWh: 20_000 };

    const results = ['DE_THG', 'FR_CPB', 'NL_ERE'].map(marketId => {
      const market = getMarketById(marketId)!;
      const r = computeNetback(market, consignment, state.marks, state.costs);
      return {
        marketId,
        netNetback: r.netNetback == null ? null : round6(r.netNetback),
        certificateValueEurPerMwh: r.certificateValue?.valueEurPerMWh == null ? null : round6(r.certificateValue.valueEurPerMWh),
      };
    });

    expect(results).toMatchSnapshot();
  });

  it('calculateLogisticsRoute: DK to DE, all modes', () => {
    const route = calculateLogisticsRoute('DK', 'DE');
    expect({
      distanceKm: route.distanceKm,
      recommendedMode: route.recommendedMode,
      modes: {
        virtualSwap: route.modes.virtualSwap.totalCostEurMwh == null ? null : round6(route.modes.virtualSwap.totalCostEurMwh),
        physicalPipeline: route.modes.physicalPipeline.totalCostEurMwh == null ? null : round6(route.modes.physicalPipeline.totalCostEurMwh),
        bioLng: route.modes.bioLng.totalCostEurMwh == null ? null : round6(route.modes.bioLng.totalCostEurMwh),
      },
    }).toMatchSnapshot();
  });

  it('FuelEU: statutory penalty and bio-LNG closure', () => {
    const penalty = penaltyEur(1000, 91.68, 1);
    const closure = closeDeficitWithBioLng({
      deficitTco2e: 1000,
      displacedIntensity: 91.16,
      bioLngCi: -100,
    });

    expect({
      penaltyEur: round6(penalty),
      closure: {
        energyMj: round6(closure.energyMj),
        mwh: round6(closure.mwh),
        tonnes: round6(closure.tonnes),
      },
    }).toMatchSnapshot();
  });

  it('priceCorporateOrder: GO-only spec against the default desk', () => {
    const state = createDefaultState();
    const spec: CorporateOrderSpec = {
      volumeMWh: 10_000,
      form: 'GO_ONLY',
      countries: [],
      vintageYear: null,
      maxCi: null,
      unsubsidisedOnly: false,
      excludeCrops: false,
      claim: 'SCOPE1_VOLUNTARY',
    };
    const costs = { transferCostEurPerMWh: 1, marginEurPerMWh: 2 };
    const quote = priceCorporateOrder(spec, costs, state.marks);

    expect({
      ctdAverageCostEurPerMwh: quote.ctd.averageCostEurPerMWh == null ? null : round6(quote.ctd.averageCostEurPerMWh),
      offerEurPerMWh: quote.offerEurPerMWh == null ? null : round6(quote.offerEurPerMWh),
      annualValueEur: quote.annualValueEur == null ? null : round6(quote.annualValueEur),
    }).toMatchSnapshot();
  });
});
