import { describe, it, expect } from 'vitest';
import { LEGAL_CITATIONS, latestCitationDateLabel, getCitationById } from '../citations/registry';
import { aidStatus } from '../plants/compliance';

describe('citations (aud-sd)', () => {
  it('Austrian EGG is not claimed IN_FORCE and is flagged for verification', () => {
    const egg = getCitationById('at-egg-act')!;
    expect(egg.status).not.toBe('IN_FORCE');
    expect(egg.needsVerification).toBe(true);
    expect(egg.effectiveDate).toContain('UNVERIFIED');
  });
  it('consolidation label is derived from entry dates, not hard-coded', () => {
    expect(latestCitationDateLabel([{ effectiveDate: '3 March 2024' }, { effectiveDate: '6 October 2026 (Royal Decree)' }])).toBe('October 2026');
    expect(latestCitationDateLabel([{ effectiveDate: 'no date' }])).toBeNull();
    expect(latestCitationDateLabel(LEGAL_CITATIONS)).toMatch(/^[A-Z][a-z]+ 20\d\d$/);
  });
  it('no aid found is not a confirmation', () => {
    expect(aidStatus(null as any)).toBe('NONE_FOUND');
  });
});
