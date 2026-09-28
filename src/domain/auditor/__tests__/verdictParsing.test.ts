import { describe, it, expect } from 'vitest';
import { parseAuditorVerdict } from '../geminiClient';

describe('auditor verdict parsing', () => {
  it('never reads "cannot be approved" as APPROVED', () => {
    expect(parseAuditorVerdict('REJECTED: this transaction cannot be approved under Art. 29.')).not.toBe('APPROVED');
    expect(parseAuditorVerdict('The deal is not approved by the registry.')).toBe('INFO');
  });

  it('reads an explicit VERDICT line', () => {
    expect(parseAuditorVerdict('VERDICT: REJECTED\nThe consignment fails the UDB gate. It cannot be approved.')).toBe('REJECTED');
    expect(parseAuditorVerdict('VERDICT: APPROVED\nAll six gates pass.')).toBe('APPROVED');
    expect(parseAuditorVerdict('**Verdict:** CONDITIONAL_PASS\nPending PoS.')).toBe('CONDITIONAL_PASS');
    expect(parseAuditorVerdict('1. Executive Statutory Verdict: Conditional pass')).toBe('CONDITIONAL_PASS');
  });

  it('returns INFO when there is no verdict line or the lines conflict', () => {
    expect(parseAuditorVerdict('A long analysis with no verdict line.')).toBe('INFO');
    expect(parseAuditorVerdict('VERDICT: APPROVED\n...\nVERDICT: REJECTED')).toBe('INFO');
  });
});
