import { describe, it, expect } from 'vitest';
import { LEGAL_CITATIONS, getCitationById } from '../../citations/registry';
import { verifyQuoteAgainstVault, extractQuoteProofsFromText } from '../verifier';
import { KNOWLEDGE_VAULT_DOCS } from '../knowledgeBase';

describe('Legal Citations & Verifier Comprehensive Audit', () => {
  it('contains exactly 41 statutory citations with unique IDs and codes', () => {
    expect(LEGAL_CITATIONS.length).toBe(41);
    const ids = new Set(LEGAL_CITATIONS.map(c => c.id));
    const codes = new Set(LEGAL_CITATIONS.map(c => c.code));
    expect(ids.size).toBe(41);
    expect(codes.size).toBe(41);
  });

  it('all 41 citations are present in the unified knowledge base', () => {
    for (const citation of LEGAL_CITATIONS) {
      // Either direct ID match or legacy alias ID
      const inVault = KNOWLEDGE_VAULT_DOCS.some(
        doc => doc.id === citation.id || doc.sourceFile.includes(citation.id) || doc.sources.some(s => s.includes(citation.code) || s.includes(citation.officialTitle))
      );
      expect(inVault, `Citation ${citation.id} (${citation.code}) must be represented in KNOWLEDGE_VAULT_DOCS`).toBe(true);
    }
  });

  it('verifies verbatim quotes across all 41 legal citations', () => {
    const unverified: Array<{ id: string; excerpt: string }> = [];

    for (const citation of LEGAL_CITATIONS) {
      expect(citation.keyStatutoryExcerpts.length, `Citation ${citation.id} must have keyStatutoryExcerpts`).toBeGreaterThan(0);
      for (const excerpt of citation.keyStatutoryExcerpts) {
        const check = verifyQuoteAgainstVault(excerpt);
        if (!check.verified) {
          unverified.push({ id: citation.id, excerpt });
        }
      }
    }

    expect(unverified).toEqual([]);
  });

  it('handles quotes with curly quotes and smart punctuation in verifyQuoteAgainstVault', () => {
    const quoteWithSmartQuotes = '“By 21 November 2024, the Commission shall ensure that a Union database is set up to enable the tracing of liquid and gaseous renewable fuels and recycled carbon fuels”';
    const check = verifyQuoteAgainstVault(quoteWithSmartQuotes);
    expect(check.verified).toBe(true);
  });

  it('extractQuoteProofsFromText extracts quotes enclosed in both curly and straight quotes', () => {
    const sampleStraight = 'According to "By 21 November 2024, the Commission shall ensure that a Union database is set up" the DB is scheduled.';
    const sampleCurly = 'According to “By 21 November 2024, the Commission shall ensure that a Union database is set up” the DB is scheduled.';
    
    const proofsStraight = extractQuoteProofsFromText(sampleStraight);
    expect(proofsStraight.length).toBeGreaterThan(0);
    expect(proofsStraight[0].isVerbatimVerified).toBe(true);

    const proofsCurly = extractQuoteProofsFromText(sampleCurly);
    expect(proofsCurly.length).toBeGreaterThan(0);
    expect(proofsCurly[0].isVerbatimVerified).toBe(true);
  });
});
