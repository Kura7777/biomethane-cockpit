import { describe, it, expect } from 'vitest';
import { queryAuditor } from '../geminiClient';
import { normalizeTradeAuditContext, getMissingAuditInputs } from '../types';
import { verifyQuoteAgainstVault, extractQuoteProofsFromText, summariseQuoteProofs } from '../verifier';

describe('auditor: no invented inputs (aud-sd)', () => {
  it('does not default CI, feedstock, volume, market or origin', () => {
    const n = normalizeTradeAuditContext({});
    expect(n.carbonIntensity).toBeUndefined();
    expect(n.annualVolumeMWh).toBeUndefined();
    expect(n.feedstockCategory).toBe('');
    expect(n.targetMarketId).toBe('');
    expect(n.originCountry).toBe('');
    expect(getMissingAuditInputs(n)).toEqual(
      expect.arrayContaining(['origin country', 'target market', 'feedstock', 'carbon intensity (CI)', 'volume'])
    );
  });

  it('missing CI/feedstock/volume gives INFO "inputs missing", never APPROVED', async () => {
    const res = await queryAuditor('x', { originCountry: 'DE', targetMarketId: 'DE_THG' } as any);
    expect(res.verdict).toBe('INFO');
    expect(res.headline.toLowerCase()).toContain('inputs missing');
    expect(res.checks).toHaveLength(0);
  });

  it('a complete context is evaluated by the rules engine', async () => {
    const res = await queryAuditor('x', {
      originCountry: 'DE', targetMarketId: 'DE_THG', feedstockCategory: 'MANURE_SLURRY',
      carbonIntensity: -80, annualVolumeMWh: 10000,
    });
    expect(res.verdict).not.toBe('INFO');
    expect(res.sourceEngine).toBe('DETERMINISTIC_VAULT');
    expect(res.checks.length).toBeGreaterThan(0);
  });
});

describe('verifier: verbatim needs full containment (aud-sd)', () => {
  const fabricated = 'By 21 November 2024, the Commission shall abolish all national quotas and exempt Dutch biomethane from any sustainability requirement entirely';
  it('a fabricated quote that shares its opening words is not verified', () => {
    const r = verifyQuoteAgainstVault(fabricated);
    expect(r.verified).toBe(false);
    expect(r.partial).toBe(true);
  });
  it('per-quote badges and a summary that never says all verified from one quote', () => {
    const text = `Real "By 21 November 2024, the Commission shall ensure that a Union database is set up to enable the tracing" and fake "${fabricated}".`;
    const proofs = extractQuoteProofsFromText(text);
    expect(proofs.map(p => p.isVerbatimVerified)).toEqual([true, false]);
    expect(proofs[1].isPartialMatch).toBe(true);
    expect(summariseQuoteProofs(proofs)).toContain('1 of 2 quotes verbatim');
  });
});
