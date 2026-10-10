import { describe, it, expect } from 'vitest';
import { defaultComplianceYear } from '../hooks/useDealSchedule';
import { NL_GGE_START_YEAR } from '../../../domain/regulatory/constants';

describe('defaultComplianceYear', () => {
  it('starts a new NL GGE deal in the first obligation year', () => {
    expect(defaultComplianceYear({ marketId: 'NL_GGE' })).toBe(NL_GGE_START_YEAR);
  });
  it('keeps an explicit year from the deal link', () => {
    expect(defaultComplianceYear({ marketId: 'NL_GGE', complianceYear: 2029 })).toBe(2029);
  });
  it('leaves other markets on the existing default', () => {
    expect(defaultComplianceYear({ marketId: 'DE_THG' })).toBe(2026);
  });
});
