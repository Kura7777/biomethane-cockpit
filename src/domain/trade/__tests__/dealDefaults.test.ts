import { describe, it, expect, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  feedstockKeyForPlant,
  defaultCi,
  plantCi,
  defaultVolumeMwh,
  defaultMarketForOrigin,
  plantDealParams,
} from '../dealDefaults';
import { FEEDSTOCK_REGISTRY } from '../../consignment/feedstocks';
import { BIOMETHANE_PLANTS } from '../../plants/registry';
import { setAssumption, resetAssumption, getAssumption } from '../../assumptions/registry';

describe('dealDefaults', () => {
  afterEach(() => {
    resetAssumption('deal.defaultVolumeMwh');
  });

  describe('One plant, identical deals for real plants', () => {
    const validFeedstockKeys = new Set(Object.keys(FEEDSTOCK_REGISTRY));

    it('processes a DK manure plant with annualEnergyGWh', () => {
      const dkManurePlant = BIOMETHANE_PLANTS.find(
        p => p.countryCode === 'DK' &&
          ((p.primaryFeedstockCategory || '').toLowerCase().includes('manure') ||
           (p.feedstockDetails || '').toLowerCase().includes('manure')) &&
          typeof p.annualEnergyGWh === 'number' && p.annualEnergyGWh > 0
      );
      expect(dkManurePlant, 'Must find a real DK manure plant with annual energy').toBeDefined();
      if (!dkManurePlant) return;

      const params = plantDealParams(dkManurePlant);
      expect(validFeedstockKeys.has(params.feedstock!)).toBe(true);
      expect(params.feedstock).toBe('manure');
      expect(params.ciIsEstimated).toBe(true);
      expect(params.marketId).toBe('DE_THG');
      expect(params.volume).toBe(Math.round(dkManurePlant.annualEnergyGWh! * 1000));
      expect(params.originCountry).toBe('DK');
      expect(params.plantId).toBe(dkManurePlant.id);
    });

    it('processes a plant with no annual output, falling back to volume assumption', () => {
      const realPlant = BIOMETHANE_PLANTS.find(p => p.countryCode === 'DK') || BIOMETHANE_PLANTS[0];
      const noOutputPlant = {
        ...realPlant,
        annualEnergyGWh: null,
      };

      const params = plantDealParams(noOutputPlant);
      expect(validFeedstockKeys.has(params.feedstock!)).toBe(true);
      expect(params.ciIsEstimated).toBe(true);
      expect(params.volume).toBe(getAssumption('deal.defaultVolumeMwh'));
      expect(params.marketId).toBe(defaultMarketForOrigin(noOutputPlant.countryCode));
    });

    it('processes a plant whose text mentions organic, mapping to a valid FEEDSTOCK_REGISTRY key', () => {
      const organicPlant = BIOMETHANE_PLANTS.find(
        p => p.primaryFeedstockCategory === 'Food Waste & Bio-waste' &&
             (p.feedstockDetails || '').toLowerCase().includes('organic')
      );
      expect(organicPlant, 'Must find a real plant with organic food waste').toBeDefined();
      if (!organicPlant) return;

      const params = plantDealParams(organicPlant);
      expect(validFeedstockKeys.has(params.feedstock!)).toBe(true);
      expect(params.feedstock).not.toBe('organic_waste');
      expect(params.feedstock).toBe('food_waste');
      expect(params.ciIsEstimated).toBe(true);
    });
  });

  describe('No local guessers left across screens', () => {
    const screens = [
      { name: 'PlantsScreen.tsx', file: path.resolve(__dirname, '../../../features/plants/PlantsScreen.tsx') },
      { name: 'OriginationPipelineScreen.tsx', file: path.resolve(__dirname, '../../../features/plants/OriginationPipelineScreen.tsx') },
      { name: 'PlantSourcingDrawer.tsx', file: path.resolve(__dirname, '../../../features/plants/PlantSourcingDrawer.tsx') },
    ];

    screens.forEach(({ name, file }) => {
      it(`${name} imports plantDealParams and contains no legacy local guessers`, () => {
        const content = fs.readFileSync(file, 'utf-8');
        expect(content, `${name} must import plantDealParams`).toContain('plantDealParams');
        expect(content, `${name} must not contain -78`).not.toContain('-78');
        expect(content, `${name} must not contain 20000`).not.toContain('20000');
        expect(content, `${name} must not contain 'organic_waste'`).not.toContain("'organic_waste'");
        expect(content, `${name} must not contain "organic_waste"`).not.toContain('"organic_waste"');
      });
    });
  });

  describe('Volume assumption is live and reactive', () => {
    it('defaultVolumeMwh() follows setAssumption override and reset', () => {
      expect(defaultVolumeMwh()).toBe(20000);
      setAssumption('deal.defaultVolumeMwh', 45000);
      expect(defaultVolumeMwh()).toBe(45000);
      resetAssumption('deal.defaultVolumeMwh');
      expect(defaultVolumeMwh()).toBe(20000);
    });
  });

  describe('plantCi never reads verifiedCarbonIntensity', () => {
    it('plantCi ignores verifiedCarbonIntensity and always returns the feedstock default', () => {
      const withCi = plantCi({ verifiedCarbonIntensity: 0, canonicalFeedstockKey: 'manure' } as any);
      const withoutCi = plantCi({ canonicalFeedstockKey: 'manure' } as any);
      expect(withCi.ci).toBe(withoutCi.ci);
      expect(withCi.ci).toBe(getAssumption('feedstock.defaultCi.manure'));
      expect(withCi.ciIsEstimated).toBe(true);
    });
  });
});
