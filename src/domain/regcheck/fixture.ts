import type { RegcheckReport } from './types';
import { REGCHECK_WATCHLIST } from './watchlist';

/**
 * High-fidelity audit fixture used for dev inspection and testing.
 * Contains 1 CHANGED, 1 NEW, 1 UNCLEAR, and all remaining items STILL_CORRECT.
 */
export const FIXTURE_REGCHECK_REPORT: RegcheckReport = {
  checkedAt: '2026-10-05T08:30:00.000Z',
  model: 'claude-sonnet-5-5',
  summary: '26 still correct · 1 changed · 1 unclear · 1 new',
  items: REGCHECK_WATCHLIST.map((watchItem): RegcheckReport['items'][number] => {
    // 1 CHANGED item
    if (watchItem.id === 'de_thg_quote_2026_law') {
      return {
        watchId: watchItem.id,
        status: 'CHANGED',
        finding: 'The Zweites Gesetz zur Weiterentwicklung der THG-Quote was officially promulgated in the Bundesgesetzblatt on 29 September 2026 (BGBl. 2026 I Nr. 182), formally setting entry into force for 1 January 2027 while repealing double counting.',
        evidence: [
          {
            url: 'https://www.recht.bund.de/bgbl/',
            quote: 'Zweites Gesetz zur Weiterentwicklung der Treibhausgasminderungs-Quote vom 25. September 2026 ... Verkündet am 29. September 2026 im Bundesgesetzblatt Teil I Nr. 182.',
            date: '2026-09-29',
            publisher: 'Bundesgesetzblatt (BGBl)'
          }
        ]
      };
    }

    // 1 UNCLEAR item
    if (watchItem.id === 'oq_fr_iricc_cross_border') {
      return {
        watchId: watchItem.id,
        status: 'UNCLEAR',
        finding: 'DGEC published an updated consultation summary on 18 September 2026 noting stakeholder comments on foreign mass-balance biomethane eligibility under IRICC, but the definitive Council of State application decree remains unpublished.',
        evidence: [
          {
            url: 'https://www.ecologie.gouv.fr/',
            quote: 'Le projet de décret d\'application du mécanisme IRICC prévu par l\'article L. 295-1 du code de l\'énergie fait l\'objet d\'arbitrages interministériels complémentaires quant aux conditions d\'éligibilité des volumes injectés hors du territoire national.',
            date: '2026-09-18',
            publisher: 'Ministère de la Transition Écologique (DGEC)'
          }
        ]
      };
    }

    // All other items STILL_CORRECT
    return {
      watchId: watchItem.id,
      status: 'STILL_CORRECT',
      finding: `Official documentation and register guidelines confirm that "${watchItem.topic}" remains legally valid and active as described in desk rules.`,
      evidence: [
        {
          url: watchItem.sources[0]?.url || 'https://www.aib-net.org/',
          quote: `Primary regulatory records confirm statutory status for ${watchItem.topic} conforms to published provisions without amendment.`,
          date: '2026-09-15',
          publisher: watchItem.sources[0]?.label || 'Statutory Authority'
        }
      ]
    };
  }),
  newItems: [
    {
      title: 'Spain MITECO Ministerial Order TED/840/2026 on Biomethane Grid Injection Guarantees',
      finding: 'MITECO published Order TED/840/2026 in the BOE on 24 September 2026, establishing streamlined technical criteria for Enagás GTS cross-border registry tracking and voluntary cancellations under the national guarantee of origin system.',
      appImpact: 'Simplifies documentation proof requirements for Spanish biomethane facilities injecting into the high-pressure gas transport network destined for voluntary corporate offtake.',
      evidence: [
        {
          url: 'https://www.boe.es/diario_boe/',
          quote: 'Orden TED/840/2026, de 22 de septiembre, por la que se actualizan los procedimientos de gestión y expedición de garantías de origen del gas procedente de fuentes renovables en el sistema gasista.',
          date: '2026-09-24',
          publisher: 'Boletín Oficial del Estado (BOE)'
        }
      ]
    }
  ]
};
