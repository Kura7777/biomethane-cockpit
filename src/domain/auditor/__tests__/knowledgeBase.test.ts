import { describe, it, expect } from 'vitest';
import { KNOWLEDGE_VAULT_DOCS, getFullKnowledgeContext } from '../knowledgeBase';
import { queryAuditor } from '../geminiClient';
import { CI_COMPARATOR_HEAT, CI_COMPARATOR_ROAD_TRANSPORT, GCAL_PER_CIC_ADVANCED, GCAL_PER_CIC_CONVENTIONAL } from '../../markets/constants';
import {
  DE_THG_PENALTY_EUR_PER_TCO2E,
  FR_CPB_CEILING_EUR_MWH,
  FUELEU_PENALTY_VLSFO_MJ_PER_TONNE,
  FUELEU_STATUTORY_PENALTY_PER_TONNE,
  RED3_TRANSPORT_MAX_CI,
  UK_RTFC_BUYOUT_GBP,
} from '../../regulatory/constants';
import { FUELEU_REFERENCE_INTENSITY, FUELEU_TARGET_2030 } from '../../fueleu/calculator';

const doc = (id: string) => KNOWLEDGE_VAULT_DOCS.find(d => d.id === id)!.content;

describe('Auditor knowledge base reliability', () => {
  it('has no unsourced e_am label and no closed-storage condition for the manure credit', () => {
    const all = getFullKnowledgeContext();
    expect(all).not.toMatch(/e_am/i);
    expect(all).not.toMatch(/closed storage/i);
    expect(doc('germany_38_bimschv')).toContain('45 gCO2eq per MJ of manure');
  });

  it('keeps removed unsupported claims out of the vault and the offline audit text', async () => {
    const all = getFullKnowledgeContext();
    expect(all).not.toMatch(/2024-421/);
    expect(all).not.toMatch(/Item 17/);
    expect(all).not.toMatch(/85% of French/);
    const res = await queryAuditor('Audit', { originCountry: 'DK', targetMarketId: 'DE_THG', feedstockCategory: 'MANURE_SLURRY', carbonIntensity: -85, annualVolumeMWh: 1000, deliveredValueEurMwh: 90 });
    const text = res.explanation + res.checks.map(c => `${c.details} ${c.citation}`).join(' ');
    expect(text).not.toMatch(/e_am|2024-421|Item 17/);
  });

  it('gives every knowledge document a source reference', () => {
    expect(KNOWLEDGE_VAULT_DOCS.length).toBeGreaterThan(0);
    for (const d of KNOWLEDGE_VAULT_DOCS) {
      expect(d.sources.length, d.id).toBeGreaterThan(0);
      expect(d.sources.every(s => s.trim().length > 10), d.id).toBe(true);
    }
    expect(getFullKnowledgeContext()).toContain('Sources:');
  });

  it('uses the regulatory constants the app already holds', () => {
    expect(doc('red_iii_directive')).toContain(`CI <= ${RED3_TRANSPORT_MAX_CI} gCO2eq/MJ`);
    expect(doc('red_iii_directive')).toContain(`${CI_COMPARATOR_ROAD_TRANSPORT} gCO2eq/MJ fossil comparator`);
    expect(doc('red_iii_directive')).toContain(`${CI_COMPARATOR_HEAT} gCO2eq/MJ`);
    expect(doc('germany_38_bimschv')).toContain(`EUR ${DE_THG_PENALTY_EUR_PER_TCO2E} per tCO2e`);
    expect(doc('france_cpb_tiruert')).toContain(`EUR ${FR_CPB_CEILING_EUR_MWH} per MWh`);
    expect(doc('uk_rtfo_rggo')).toContain(`GBP ${UK_RTFC_BUYOUT_GBP.toFixed(2)} per standard RTFC`);
    expect(doc('fueleu_maritime')).toContain(String(FUELEU_REFERENCE_INTENSITY));
    expect(doc('fueleu_maritime')).toContain(String(FUELEU_TARGET_2030));
    expect(doc('fueleu_maritime')).toContain(`EUR ${FUELEU_STATUTORY_PENALTY_PER_TONNE.toLocaleString('en-US')} per tonne`);
    expect(doc('fueleu_maritime')).toContain(`${FUELEU_PENALTY_VLSFO_MJ_PER_TONNE.toLocaleString('en-US')} MJ`);
    expect(doc('italy_cic_pnrr')).toContain(`${GCAL_PER_CIC_CONVENTIONAL} Gcal of conventional`);
    expect(doc('italy_cic_pnrr')).toContain(`${GCAL_PER_CIC_ADVANCED} Gcal of advanced`);
  });

  it('agrees with the glossary on counting, comparator and the GGE/ERE split', () => {
    expect(doc('germany_38_bimschv')).toMatch(/abolished from 2026/);
    expect(doc('germany_38_bimschv')).toMatch(/promulgation date not yet confirmed/);
    expect(doc('netherlands_ere_hbe')).toMatch(/one kilogram of CO2/);
    expect(doc('netherlands_ere_hbe')).toMatch(/not yet law/);
  });
});
