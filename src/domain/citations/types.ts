export type LegalCategory = 
  | 'EU_DIRECTIVE'
  | 'EU_REGULATION'
  | 'NATIONAL_QUOTA_LAW'
  | 'CERTIFICATION_SCHEME'
  | 'GRID_AND_TARIFF'
  | 'GLOSSARY_TERM';

export type JurisdictionCode = 
  | 'EU'
  | 'DE'
  | 'NL'
  | 'FR'
  | 'IT'
  | 'DK'
  | 'GB'
  | 'SE'
  | 'ES'
  | 'PL'
  | 'BE'
  | 'AT'
  | 'CH'
  | 'FI'
  | 'NO'
  | 'IE'
  | 'PT'
  | 'CZ'
  | 'EE'
  | 'LT'
  | 'LV'
  | 'HU'
  | 'GR'
  | 'RO'
  | (string & {});

export type StatutoryStatus = 
  | 'IN_FORCE'
  | 'UNDER_REVISION'
  | 'PHASED_IN_2026'
  | 'FUTURE_2027_2028'
  | 'RESTRICTED';

export interface LegalCitation {
  id: string;
  code: string;                      // e.g. "RED_III_ART_30"
  shortTitle: string;                // e.g. "RED III Article 30 (Mass Balance & UDB)"
  officialTitle: string;             // e.g. "Directive (EU) 2023/2413 of the European Parliament and of the Council"
  jurisdiction: JurisdictionCode;
  jurisdictionName: string;
  category: LegalCategory;
  status: StatutoryStatus;
  effectiveDate: string;             // e.g. "20 November 2023 (Transposition by 21 May 2025)"
  primaryArticle: string;            // e.g. "Article 30(1)–(10), Article 31a"
  summary: string;                   // Comprehensive trading desk explanation
  applicableMarkets: string[];       // Market IDs from cockpit (e.g. ['DE_THG', 'NL_ERE', 'FR_CPB'])
  complianceGate: string;            // e.g. "UDB Gate & Mass Balance Gate"
  penaltiesOrCaps?: string;          // e.g. "Non-compliance penalty / French €100/MWh ceiling"
  deskRuleSummary: string;           // Golden rule for trading desk
  keyStatutoryExcerpts: string[];    // Direct quotes from statutory text
  crossReferences: string[];         // Related directives or national decrees
  officialUrl?: string;              // Primary official legislation link
  officialUrlLabel?: string;         // e.g. "EUR-Lex Official Portal"
  additionalLinks?: { label: string; url: string }[]; // Secondary guidance or registry links
}
