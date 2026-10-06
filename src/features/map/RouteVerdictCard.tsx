import React from 'react';
import { getGoRoute, getPosRoute } from '../../domain/routes';
import {
  getCertificateRoute,
  CERT_ROUTE_LABELS,
  type CertificateRoute,
} from '../../domain/registries/certificateRoutes';
import { getTradePlaybook, getPlaybookDealUrl } from './tradePlaybook';
import './map.css';

export const EVIDENCE_GRADE_TEXT: Record<string, string> = {
  OBSERVED: 'proven by real trades',
  PUBLISHED: "registry's published list",
  RULE: 'hub rules',
};

/** The open-question id behind a PoS route that is still OPEN, if any. */
export function posOpenId(r: CertificateRoute): string | null {
  if (!r.pos || r.pos.status !== 'OPEN') return null;
  return getPosRoute(r.origin, r.target).schemes.find(x => x.status === 'OPEN' && x.openQuestionId)?.openQuestionId ?? null;
}

interface RouteVerdictCardProps {
  /** Origin country ISO code, e.g. 'DK'. */
  origin: string;
  /** Destination country ISO code, e.g. 'DE'. */
  target: string;
  /** Narrow to one leg. Omitted (the map's behaviour) shows both the GO and the PoS leg. */
  filter?: 'ALL' | 'GO' | 'POS';
  /** Adds a "See on map" link to #/map?origin=..&target=.. (off on the map itself). */
  showMapLink?: boolean;
}

/**
 * The route verdict for one origin to destination corridor: playbook, GO (book and claim) status,
 * PoS (mass balance quota) status per scheme, any open question and the sources. It reads the
 * audited route matrix itself, so the map, Origination Step 3 and the market ladder cannot disagree.
 */
export function RouteVerdictCard({ origin, target, filter = 'ALL', showMapLink = false }: RouteVerdictCardProps) {
  const r = getCertificateRoute(origin, target);
  const playbook = getTradePlaybook(origin, target, r);
  const goDetails = getGoRoute(r.origin, r.target);
  const posDetails = getPosRoute(r.origin, r.target);
  const oq = r.openQuestionId || posOpenId(r);

  const allSources = [
    ...(goDetails.sources || []),
    ...(posDetails.schemes?.flatMap(s => s.sources || []) || []),
  ];
  const uniqueSources = allSources.filter((s, idx, arr) => arr.findIndex(x => x.url === s.url) === idx);

      const tradeUrl = getPlaybookDealUrl(r.origin, r.target, r, filter);

      return (
        <div className="map-route-expanded-card" data-testid={`expanded-${r.target}`}>
          <div style={{ padding: '8px 10px', backgroundColor: 'color-mix(in srgb, var(--color-surface) 60%, transparent)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)' }}>
            <div className="eyebrow" style={{ color: 'var(--color-accent)', fontWeight: 800, marginBottom: '2px' }}>
              Commercial Trade Playbook: {playbook.structureTitle}
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.45, marginBottom: '6px' }}>{playbook.structureDesc}</div>
            <div style={{ fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <div><strong>Scheme:</strong> {playbook.schemeTitle} — {playbook.schemeDesc}</div>
              <div><strong>Execution:</strong> {playbook.executionTitle} — {playbook.executionDesc}</div>
            </div>
          </div>

          {filter !== 'POS' && (
            <div>
              <div className="eyebrow" style={{ marginBottom: '3px' }}>GO (Book &amp; Claim)</div>
              <div>
                <strong>Status:</strong> {CERT_ROUTE_LABELS[r.status]} · <strong>Via:</strong>{' '}
                {goDetails.via && goDetails.via !== 'NONE' ? (
                  goDetails.via === 'ERGAR' ? (
                    <a href="#/registries?registry=ERGaR" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                      ERGaR
                    </a>
                  ) : goDetails.via === 'AIB' ? (
                    <a href="#/registries?registry=AIB" style={{ color: 'var(--color-accent)', textDecoration: 'underline' }}>
                      AIB
                    </a>
                  ) : (
                    goDetails.via
                  )
                ) : (
                  '—'
                )}{' '}
                · <strong>Evidence:</strong> {EVIDENCE_GRADE_TEXT[goDetails.grade] || goDetails.grade}
              </div>
              <div className="mut" style={{ marginTop: '2px' }}>{goDetails.reason}</div>
              {goDetails.conditions && goDetails.conditions.length > 0 && (
                <div style={{ marginTop: '3px' }}><strong>Conditions:</strong> {goDetails.conditions.join('; ')}</div>
              )}
              {goDetails.workaround && (
                <div style={{ marginTop: '3px' }}><strong>Workaround (ex-domain):</strong> {goDetails.workaround}</div>
              )}
            </div>
          )}

          {filter !== 'GO' && (
            <div style={filter === 'ALL' ? { borderTop: '1px solid var(--color-divider)', paddingTop: '8px' } : undefined}>
              <div className="eyebrow" style={{ marginBottom: '3px' }}>PoS (Mass Balance Quota)</div>
              <div><strong>Status:</strong> {posDetails.status}</div>
              {posDetails.schemes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                  {posDetails.schemes.map(s => (
                    <div key={s.schemeId} style={{ paddingLeft: '8px', borderLeft: '2px solid var(--color-divider)' }}>
                      <div><strong>{s.schemeName}</strong> ({s.status}){s.legalBasis ? ` · ${s.legalBasis}` : ''}</div>
                      <div className="mut">{s.reason}</div>
                      {s.conditions && <div><strong>Conditions:</strong> {s.conditions}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mut">{r.pos?.reason || 'No specific national schemes found.'}</div>
              )}
            </div>
          )}

          {oq && (
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px' }}>
              <span className="eyebrow">Open question</span>
              <div style={{ fontWeight: 600, marginTop: '2px' }}>{oq}</div>
            </div>
          )}

          {uniqueSources.length > 0 && (
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px' }}>
              <div className="eyebrow" style={{ marginBottom: '4px' }}>Sources &amp; citations</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {uniqueSources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: '12px', color: 'var(--color-accent)', textDecoration: 'underline', overflowWrap: 'anywhere' }}
                  >
                    {s.claim} ↗
                  </a>
                ))}
              </div>
            </div>
          )}

          {(showMapLink || tradeUrl) && (
            <div style={{ borderTop: '1px solid var(--color-divider)', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {showMapLink && (
                <a
                  href={`#/map?origin=${encodeURIComponent(r.origin)}&target=${encodeURIComponent(r.target)}`}
                  style={{ fontSize: '12px', color: 'var(--color-accent)', fontWeight: 600 }}
                  data-testid="see-on-map"
                >
                  See on map →
                </a>
              )}
              {tradeUrl && (
                <a
                  href={`#${tradeUrl}`}
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '2px 8px', height: '24px', minHeight: '24px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', marginLeft: 'auto' }}
                  data-testid="verdict-trade-link"
                >
                  Trade ➔
                </a>
              )}
            </div>
          )}
        </div>
      );
    }
