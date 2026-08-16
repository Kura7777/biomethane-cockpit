import React from 'react';
import { LegalCitation } from '../../domain/eligibility/types';

interface CitationBlockProps {
  citation: LegalCitation;
  compact?: boolean;
}

export function CitationBlock({ citation, compact = false }: CitationBlockProps) {
  if (compact) {
    return (
      <span className="text-xs text-stone-500 font-mono">
        {citation.shortName}
        {citation.nationalTransposition && ` / ${citation.nationalTransposition}`}
      </span>
    );
  }

  return (
    <div className="bg-stone-50 border border-stone-200 rounded-lg p-3 text-sm mt-2">
      <div className="font-semibold text-stone-700">{citation.shortName}</div>
      {citation.nationalTransposition && (
        <div className="text-stone-600 text-xs">National: {citation.nationalTransposition}</div>
      )}
      <div className="text-stone-500 text-xs mt-1">{citation.establishes}</div>
      <div className="flex items-center gap-3 mt-2 text-xs text-stone-400">
        <a
          href={citation.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-teal-600 hover:text-teal-800 underline"
        >
          {citation.sourceUrl.replace('https://', '').split('/')[0]}
        </a>
        <span>Verified: {citation.verifiedDate}</span>
      </div>
    </div>
  );
}
