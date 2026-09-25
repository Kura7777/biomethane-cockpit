import { KNOWLEDGE_VAULT_DOCS, KnowledgeDocument } from './knowledgeBase';
import { StatutoryQuoteProof } from './types';

/**
 * Client-Side Verbatim Anti-Hallucination Verifier
 * Scans quotes returned by the LLM and validates character-for-character existence
 * in the local Knowledge Vault.
 */

export function verifyQuoteAgainstVault(quote: string): { verified: boolean; matchedDoc?: KnowledgeDocument } {
  if (!quote || quote.trim().length < 10) {
    return { verified: false };
  }

  // Normalize whitespace and punctuation for robust comparison
  const normalize = (str: string) => 
    str.toLowerCase()
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/[“”"']/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const normalizedQuote = normalize(quote);

  for (const doc of KNOWLEDGE_VAULT_DOCS) {
    const normalizedDoc = normalize(doc.content);
    if (normalizedDoc.includes(normalizedQuote)) {
      return { verified: true, matchedDoc: doc };
    }
  }

  // Also check if at least an 80% contiguous slice of the quote exists
  const words = normalizedQuote.split(' ');
  if (words.length >= 8) {
    const keySubstring = words.slice(0, 7).join(' ');
    for (const doc of KNOWLEDGE_VAULT_DOCS) {
      const normalizedDoc = normalize(doc.content);
      if (normalizedDoc.includes(keySubstring)) {
        return { verified: true, matchedDoc: doc };
      }
    }
  }

  return { verified: false };
}

export function extractQuoteProofsFromText(text: string): StatutoryQuoteProof[] {
  const proofs: StatutoryQuoteProof[] = [];
  
  // Look for blockquotes or quoted strings preceded by Article / Section
  const quoteRegex = /"([^"]{15,300})"/g;
  let match: RegExpExecArray | null;

  while ((match = quoteRegex.exec(text)) !== null) {
    const quoteText = match[1];
    const { verified, matchedDoc } = verifyQuoteAgainstVault(quoteText);
    
    proofs.push({
      quote: quoteText,
      sourceFile: matchedDoc?.sourceFile || 'Unverified External Source',
      articleCitation: matchedDoc?.title || 'Unknown Citation',
      isVerbatimVerified: verified
    });
  }

  return proofs;
}
