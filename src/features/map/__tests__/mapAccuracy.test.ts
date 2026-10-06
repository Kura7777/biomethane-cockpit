import { describe, it, expect } from 'vitest';
import { POS_SCHEMES } from '../../../domain/routes/routeMatrix.generated';
import { MARKETS } from '../../../domain/markets/registry';
import { COUNTRIES, FILTER_CONFIG, getTradePlaybook } from '../MapScreen';
import { getCertificateRoute } from '../../../domain/registries/certificateRoutes';

describe('Map accuracy fixes (01-accuracy.md audit requirements)', () => {
  it('A: United Kingdom is ACTIVE with audited RTFO legalBasis and no RESTRICTED countries remain', () => {
    const gb = COUNTRIES['United Kingdom'];
    expect(gb).toBeDefined();
    expect(gb.status).toBe('ACTIVE');
    expect(gb.legal).toBe(POS_SCHEMES.GB_RTFO.legalBasis);

    const statuses = Object.values(COUNTRIES).map(c => c.status);
    expect(statuses).not.toContain('RESTRICTED');
  });

  it('D: Plant and TWh numbers match MARKETS where available', () => {
    for (const m of MARKETS) {
      if (m.country && (m.productionPlants !== undefined || m.annualProductionTWh !== undefined)) {
        const countryEntry = Object.values(COUNTRIES).find(c => c.iso === m.country);
        if (countryEntry) {
          if (m.productionPlants !== undefined) {
            expect(countryEntry.plants, `Plants mismatch for ${m.country}`).toBe(m.productionPlants);
          }
          if (m.annualProductionTWh !== undefined) {
            expect(countryEntry.twh, `TWh mismatch for ${m.country}`).toBe(m.annualProductionTWh);
          }
        }
      }
    }
  });

  it('E: Both playbook explicitly warns against double counting per MWh', () => {
    // DK -> DE has both GO and PoS possible
    const dkDeRoute = getCertificateRoute('DK', 'DE');
    const playbook = getTradePlaybook('DK', 'DE', dkDeRoute);
    expect(playbook.archetype).toBe('BOTH');
    expect(playbook.structureDesc).toMatch(/Never both on the same MWh — that is double counting/i);
    expect(playbook.executionDesc).toMatch(/Never both on the same (volume|MWh)/i);
  });

  it('F: GO claims are honest about EU ETS and Scope 1 framework dependency', () => {
    expect(FILTER_CONFIG.GO.desc).toContain('Not valid evidence under EU ETS (needs a PoS via UDB)');
    expect(FILTER_CONFIG.GO.desc).toContain("Scope 1 recognition depends on the buyer's reporting framework");
  });

  it('G: POS_ONLY schemeDesc drops generic marketing copy and uses audited scheme details', () => {
    // IT has PoS closed or domestic only, but DK -> SK requires GO+PoS or check another pair if POS_ONLY
    const dkGbRoute = getCertificateRoute('DK', 'GB');
    const playbook = getTradePlaybook('DK', 'GB', dkGbRoute);
    // DK -> GB: GO is NOT_POSSIBLE, PoS is POSSIBLE -> POS_ONLY
    expect(playbook.archetype).toBe('POS_ONLY');
    expect(playbook.schemeDesc).not.toContain('High commercial green premium');
    expect(playbook.schemeDesc).toContain('Renewable Transport Fuel Obligation (RTFO)');
  });

  it('H: Execution text only requires capacity booking when the destination scheme requires it', () => {
    // DK -> GB requires capacity booking per UK_RTFO conditions
    const dkGbRoute = getCertificateRoute('DK', 'GB');
    const gbPlaybook = getTradePlaybook('DK', 'GB', dkGbRoute);
    expect(gbPlaybook.executionDesc).toMatch(/Required by.*book and nominate capacity/i);

    // DK -> DE does not require capacity booking
    const dkDeRoute = getCertificateRoute('DK', 'DE');
    const dePlaybook = getTradePlaybook('DK', 'DE', dkDeRoute);
    expect(dePlaybook.executionDesc).toMatch(/physical capacity booking only if.*requires/i);
  });

  it('I: Switzerland and Norway do not mention grid-isolated', () => {
    expect(COUNTRIES['Switzerland'].legal).not.toContain('grid-isolated');
    expect(COUNTRIES['Norway'].legal).not.toContain('grid-isolated');
  });
});
