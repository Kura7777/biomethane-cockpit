import { describe, it, expect } from 'vitest';
import { computeCertificateValue, RTFC_PER_KG_BIOMETHANE, ETS_NATURAL_GAS_TCO2_PER_MWH, RTFO_KG_PER_MWH } from '../netback/engine';
import { getMarketById } from '../markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../consignment/feedstocks';
import type { MarksState } from '../netback/types';

// Independent market-methodology audit, 28 Sept 2026 (scratch/market_audit/REPORT.md).
const at = (marketId: string, mark: number): MarksState => ({
  marks: { [marketId]: { marketId, bid: mark, offer: mark, mid: mark, updatedAt: new Date().toISOString(), source: 'Test' } },
  gasIndex: { bid: 30, offer: 30, mid: 30, updatedAt: new Date().toISOString() },
  fx: { gbpEur: 1.2, chfEur: 1.05, updatedAt: new Date().toISOString() },
  pricingSides: { certificateSide: 'bid', moleculeSide: 'bid' },
});
const manure = REFERENCE_CONSIGNMENTS.DANISH_MANURE;

describe('UK RTFO: DfT awards 1.9 RTFCs per kg of biomethane, doubled for wastes/residues', () => {
  it('values waste biomethane at 72 kg/MWh × 1.9 × 2 RTFC/MWh', () => {
    expect(RTFC_PER_KG_BIOMETHANE).toBe(1.9);
    const cv = computeCertificateValue(getMarketById('UK_RTFO')!, manure, at('UK_RTFO', 0.2), 'bid')!;
    expect(cv.valueEurPerMWh).toBeCloseTo(0.2 * 1.2 * RTFO_KG_PER_MWH * 1.9 * 2, 6);
  });
});

describe('EU ETS: zero-rated biomethane avoids the natural-gas factor, independent of CI', () => {
  for (const id of ['EU_ETS1', 'EU_ETS2', 'VOL_EU_ETS']) {
    it(`${id} is €/t × 0.20196 t/MWh at any CI`, () => {
      const m = getMarketById(id)!;
      const values = [-150, -100, 0, 20].map(ci =>
        computeCertificateValue(m, { ...manure, carbonIntensity: ci }, at(id, 70), 'bid')!.valueEurPerMWh!);
      for (const v of values) expect(v).toBeCloseTo(70 * 56.1 * 0.0036, 6);
      expect(ETS_NATURAL_GAS_TCO2_PER_MWH).toBeCloseTo(0.20196, 6);
    });
  }
});
