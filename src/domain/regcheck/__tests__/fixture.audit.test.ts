import { describe, it, expect } from 'vitest';
import { FIXTURE_REGCHECK_REPORT } from '../fixture';
import { generateFixHandoff } from '../../../features/regcheck/RegulationCheckScreen';

describe('regcheck fixture is stamped SAMPLE (aud-sd)', () => {
  it('is flagged and every changed/new finding says SAMPLE', () => {
    expect(FIXTURE_REGCHECK_REPORT.isSample).toBe(true);
    expect(FIXTURE_REGCHECK_REPORT.summary).toContain('SAMPLE');
    for (const i of FIXTURE_REGCHECK_REPORT.items) expect(i.finding.startsWith('SAMPLE')).toBe(true);
    for (const n of FIXTURE_REGCHECK_REPORT.newItems) expect(n.title.startsWith('SAMPLE')).toBe(true);
  });
  it('handoff export refuses a fixture', () => {
    expect(generateFixHandoff(FIXTURE_REGCHECK_REPORT)).toMatch(/^REFUSED/);
  });
});
