import { describe, it, expect } from 'vitest';
import { deriveSourceBadge } from '../markets/types';

/**
 * Task 0.3 — a price tile's badge must reflect its actual provenance. Prior
 * behavior hardcoded "ICE / EEX Spot" and "ECB Spot" on the TTF and FX tiles
 * regardless of whether the underlying value came from simulateDesk().
 */
describe('deriveSourceBadge', () => {
  const SIMULATED = 'SIMULATED';

  it('badges an unset mark as Unset, never as an exchange source', () => {
    const badge = deriveSourceBadge(null, SIMULATED);
    expect(badge.label).toBe('Unset');
    expect(badge.variant).toBe('NEUTRAL');
  });

  it('badges a simulated mark as Simulated, never as an exchange source', () => {
    const badge = deriveSourceBadge(
      { sourceType: 'ESTIMATE', sourceName: SIMULATED, sourceUrl: null, observedAt: null, note: null },
      SIMULATED
    );
    expect(badge.label).toBe('Simulated');
    expect(badge.variant).toBe('WARNING');
  });

  it('badges a mark stamped ESTIMATE with a different source name as Simulated too', () => {
    // sourceType alone is enough — a trader's own guess is not an exchange price
    // regardless of what name ends up in sourceName.
    const badge = deriveSourceBadge(
      { sourceType: 'ESTIMATE', sourceName: 'Desk estimate', sourceUrl: null, observedAt: null, note: null },
      SIMULATED
    );
    expect(badge.variant).toBe('WARNING');
  });

  it('badges a real exchange auction mark as an exchange source', () => {
    const badge = deriveSourceBadge(
      { sourceType: 'EXCHANGE_AUCTION', sourceName: 'EEX', sourceUrl: null, observedAt: null, note: null },
      SIMULATED
    );
    expect(badge.label).toBe('Exchange · EEX');
    expect(badge.variant).toBe('INFO');
  });

  it('badges a broker indication distinctly from an exchange price', () => {
    const badge = deriveSourceBadge(
      { sourceType: 'BROKER_INDICATION', sourceName: 'STX', sourceUrl: null, observedAt: null, note: null },
      SIMULATED
    );
    expect(badge.label).toBe('Broker · STX');
    expect(badge.variant).toBe('INFO');
    expect(badge.label).not.toMatch(/ICE|EEX|ECB/);
  });
});
