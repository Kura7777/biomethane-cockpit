import React from 'react';
import { LegalCitation } from '../../domain/eligibility/types';
import { ExternalLink, ShieldCheck } from 'lucide-react';

interface CitationBlockProps {
  citation: LegalCitation;
  compact?: boolean;
}

export function CitationBlock({ citation, compact = false }: CitationBlockProps) {
  if (compact) {
    return (
      <span className="text-meta text-cyan-400 font-mono">
        {citation.shortName}
        {citation.nationalTransposition && ` / ${citation.nationalTransposition}`}
      </span>
    );
  }

  return (
    <div className="bg-[#0e1118] border border-[#1e2433] rounded p-3 text-xs mt-1.5 space-y-1">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-zinc-200 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>{citation.shortName}</span>
        </div>
        <span className="text-micro text-zinc-400 font-mono">Verified: {citation.verifiedDate}</span>
      </div>

      {citation.nationalTransposition && (
        <div className="text-cyan-400 text-meta font-mono">
          National Transposition: {citation.nationalTransposition}
        </div>
      )}

      <div className="text-zinc-400 text-meta leading-relaxed">
        {citation.establishes}
      </div>

      <div className="pt-1 flex items-center gap-2 text-micro text-zinc-400 font-mono">
        <span>Full ref: {citation.fullReference}</span>
        {citation.sourceUrl && (
          citation.sourceUrl.startsWith('http') ? (
            <a
              href={citation.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 underline inline-flex items-center gap-0.5 ml-auto"
            >
              {citation.sourceUrl.includes('eur-lex') ? 'EUR-Lex' : 'Official Source'} <ExternalLink className="w-2.5 h-2.5" />
            </a>
          ) : (
            <span className="text-zinc-400 ml-auto font-mono text-micro">
              {citation.sourceUrl}
            </span>
          )
        )}
      </div>
    </div>
  );
}
