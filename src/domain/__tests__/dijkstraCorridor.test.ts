import { describe, it, expect } from 'vitest';
import { calculateDijkstraCorridor, calculateLogisticsRoute, findShortestPipelinePath, PIPELINE_ADJACENCY } from '../logistics/engine';

describe('Spatial Dijkstra Corridor Routing & Distance Integration', () => {
  describe('Dijkstra Shortest Path across Interconnected Gas Grid', () => {
    it('finds optimal corridor from Denmark (DK) to Germany (DE)', () => {
      const result = calculateDijkstraCorridor('DK', 'DE');
      expect(result.path).toEqual(['DK', 'DE']);
      expect(result.distanceKm).toBe(550);
      expect(result.segments.length).toBe(1);
      expect(result.segments[0]).toEqual({ from: 'DK', to: 'DE', distanceKm: 550 });
    });

    it('finds authentic multi-hop corridor from Sweden (SE) to Spain (ES)', () => {
      const result = calculateDijkstraCorridor('SE', 'ES');
      expect(result.path).toEqual(['SE', 'DK', 'DE', 'LU', 'FR', 'ES']);
      expect(result.distanceKm).toBe(2280);
      expect(result.segments.length).toBe(5);
    });

    it('finds shortest pipeline route from France (FR) to Italy (IT) via Switzerland (CH)', () => {
      const result = calculateDijkstraCorridor('FR', 'IT');
      expect(result.path).toEqual(['FR', 'CH', 'IT']);
      expect(result.distanceKm).toBe(900);
    });

    it('routes Ireland (IE) through Great Britain (GB) to Netherlands (NL)', () => {
      const result = calculateDijkstraCorridor('IE', 'NL');
      expect(result.path[0]).toBe('IE');
      expect(result.path[1]).toBe('GB');
      expect(result.distanceKm).toBeGreaterThan(0);
    });

    it('returns distance 0 and single-node path for domestic corridor (origin === target)', () => {
      const result = calculateDijkstraCorridor('DE', 'DE');
      expect(result.path).toEqual(['DE']);
      expect(result.distanceKm).toBe(0);
      expect(result.segments).toEqual([]);
    });

    it('returns empty path and 0 distance for unknown or unconnected country codes', () => {
      const result = calculateDijkstraCorridor('UNKNOWN_ORIGIN', 'DE');
      expect(result.path).toEqual([]);
      expect(result.distanceKm).toBe(0);
    });
  });

  describe('Integration with calculateLogisticsRoute', () => {
    it('calculates authentic distanceKm for cross-border routes', () => {
      const assessment = calculateLogisticsRoute('DK', 'DE', 38.50);
      expect(assessment.distanceKm).toBe(550);
      expect(assessment.physicalRoute.transitingCountries).toEqual(['DK', 'DE']);
    });

    it('calculates authentic distanceKm for long-distance multi-border trades', () => {
      const assessment = calculateLogisticsRoute('SE', 'ES', 38.50);
      expect(assessment.distanceKm).toBeGreaterThan(2000);
      expect(assessment.recommendedMode).toBe('VIRTUAL_SWAP');
    });

    it('sets distanceKm to null when origin is unknown', () => {
      const assessment = calculateLogisticsRoute('UNKNOWN' as any, 'DE', 38.50);
      expect(assessment.distanceKm).toBeNull();
      expect(assessment.physicalRoute.shrinkageEurMwh).toBeNull();
    });

    it('ensures all adjacent pairs in PIPELINE_ADJACENCY can be traversed', () => {
      for (const [country, neighbors] of Object.entries(PIPELINE_ADJACENCY)) {
        for (const neighbor of neighbors) {
          const corridor = calculateDijkstraCorridor(country, neighbor);
          expect(corridor.path.length).toBeGreaterThanOrEqual(2);
          expect(corridor.distanceKm).toBeGreaterThan(0);
        }
      }
    });
  });
});
