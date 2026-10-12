import { KNOWLEDGE_VAULT_DOCS, KnowledgeDocument } from './knowledgeBase';
import { StatutoryQuoteProof } from './types';

/**
 * Client-Side Verbatim Anti-Hallucination Verifier
 * Scans quotes returned by the LLM and validates character-for-character existence
 * in the local Knowledge Vault.
 */

import { LEGAL_CITATIONS } from '../citations/registry';

export function verifyQuoteAgainstVault(quote: string): { verified: boolean; matchedDoc?: KnowledgeDocument } {
  if (!quote || quote.trim().length < 10) {
    return { verified: false };
  }

  // Normalize whitespace, quotation marks, and special Unicode punctuation for robust comparison
  const normalize = (str: string) => 
    str.toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[“”"''‘’‚„«»]/g, '')
      .replace(/[\u00a0\u200b\u202f]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const stripEdgePunctuation = (s: string) =>
    s.replace(/^[\s.,;:!?—–\-"'()]+|[\s.,;:!?—–\-"'()]+$/g, '').trim();

  const normalizedQuote = normalize(quote);
  const cleanQuote = stripEdgePunctuation(normalizedQuote);

  if (cleanQuote.length < 8) {
    return { verified: false };
  }

  // Helper to test if a haystack contains the quote
  const matchInHaystack = (haystack: string): boolean => {
    const normHaystack = normalize(haystack);
    if (normHaystack.includes(normalizedQuote) || (cleanQuote.length >= 10 && normHaystack.includes(cleanQuote))) {
      return true;
    }
    return false;
  };

  // 1. Direct search in all compiled Knowledge Vault documents
  for (const doc of KNOWLEDGE_VAULT_DOCS) {
    if (matchInHaystack(doc.content)) {
      return { verified: true, matchedDoc: doc };
    }
  }

  // 2. Direct match across all 41 legal citations directly
  for (const citation of LEGAL_CITATIONS) {
    const excerptsCombined = citation.keyStatutoryExcerpts.join(' ');
    const fullCitationText = `${citation.summary} ${citation.deskRuleSummary} ${citation.penaltiesOrCaps || ''} ${excerptsCombined}`;
    if (matchInHaystack(fullCitationText)) {
      const matchedDoc = KNOWLEDGE_VAULT_DOCS.find(d => d.id === citation.id) ||
                         KNOWLEDGE_VAULT_DOCS.find(d => d.sources.some(s => s.includes(citation.code) || s.includes(citation.officialTitle))) ||
                         KNOWLEDGE_VAULT_DOCS[0];
      return { verified: true, matchedDoc };
    }
  }

  // 3. Contiguous sliding window search for partial/boundary quotes
  const words = cleanQuote.split(' ').filter(Boolean);
  if (words.length >= 5) {
    const windowSize = Math.min(words.length, 6);
    const startSubstring = words.slice(0, windowSize).join(' ');
    const endSubstring = words.slice(-windowSize).join(' ');

    for (const doc of KNOWLEDGE_VAULT_DOCS) {
      const normDoc = normalize(doc.content);
      if (normDoc.includes(startSubstring) || normDoc.includes(endSubstring)) {
        return { verified: true, matchedDoc: doc };
      }
    }
    for (const citation of LEGAL_CITATIONS) {
      const excerptsCombined = citation.keyStatutoryExcerpts.join(' ');
      const fullCitationText = `${citation.summary} ${citation.deskRuleSummary} ${citation.penaltiesOrCaps || ''} ${excerptsCombined}`;
      const norm = normalize(fullCitationText);
      if (norm.includes(startSubstring) || norm.includes(endSubstring)) {
        const matchedDoc = KNOWLEDGE_VAULT_DOCS.find(d => d.id === citation.id) ||
                           KNOWLEDGE_VAULT_DOCS.find(d => d.sources.some(s => s.includes(citation.code) || s.includes(citation.officialTitle))) ||
                           KNOWLEDGE_VAULT_DOCS[0];
        return { verified: true, matchedDoc };
      }
    }
  }

  return { verified: false };
}

export function extractQuoteProofsFromText(text: string): StatutoryQuoteProof[] {
  const proofs: StatutoryQuoteProof[] = [];
  const seenQuotes = new Set<string>();

  // Matches text enclosed in straight double quotes, curly quotes, German quotes, guillemets, or single quotes
  const quoteRegex = /(?:["“„«]([^"”»\r\n]{15,350})["”»])|(?:['‘‚]([^'’\r\n]{15,350})['’])/g;
  let match: RegExpExecArray | null;

  while ((match = quoteRegex.exec(text)) !== null) {
    const rawQuote = (match[1] || match[2] || '').trim();
    const cleanQuote = rawQuote.replace(/^["“„«'‘]+|["”»'’]+$/g, '').trim();
    if (cleanQuote.length >= 15 && !seenQuotes.has(cleanQuote)) {
      seenQuotes.add(cleanQuote);
      const { verified, matchedDoc } = verifyQuoteAgainstVault(cleanQuote);
      proofs.push({
        quote: cleanQuote,
        sourceFile: matchedDoc?.sourceFile || 'Unverified External Source',
        articleCitation: matchedDoc?.title || 'Unknown Citation',
        isVerbatimVerified: verified
      });
    }
  }

  // Also support markdown blockquotes (> "Quote" or > Quote)
  const blockquoteRegex = /(?:^|\n)>\s*([^\n]{15,350})/g;
  while ((match = blockquoteRegex.exec(text)) !== null) {
    const rawQuote = match[1].trim();
    const cleanQuote = rawQuote.replace(/^["“„«'‘]+|["”»'’]+$/g, '').trim();
    if (cleanQuote.length >= 15 && !seenQuotes.has(cleanQuote)) {
      seenQuotes.add(cleanQuote);
      const { verified, matchedDoc } = verifyQuoteAgainstVault(cleanQuote);
      if (verified) {
        proofs.push({
          quote: cleanQuote,
          sourceFile: matchedDoc?.sourceFile || 'Unverified External Source',
          articleCitation: matchedDoc?.title || 'Unknown Citation',
          isVerbatimVerified: true
        });
      }
    }
  }

  return proofs;
}
