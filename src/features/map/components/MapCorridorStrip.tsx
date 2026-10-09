import React from 'react';
import {
  CountryMeta,
  MapView,
  RouteFilter,
  classifyRoute,
  firstSentence
} from '../mapConstants';
import { TradePlaybookDetails } from '../tradePlaybook';
import { CertificateRoute, CERT_ROUTE_LABELS } from '../../../domain/registries/certificateRoutes';
import { getPosRoute } from '../../../domain/routes';

interface MapCorridorStripProps {
  originMeta: CountryMeta;
  targetMeta: CountryMeta;
  dijkstraPath: { path: string[]; distanceKm: number; segments: unknown[] };
  corridorCalculation: {
    physicalRoute: { totalPhysicalTariffEurMwh: number | null };
    modes: { physicalPipeline: { regulatoryFeasibility: string } };
  };
  view: MapView;
  filter: RouteFilter;
  currentRoute: CertificateRoute;
  currentPlaybook: TradePlaybookDetails;
}

export function MapCorridorStrip({
  originMeta,
  targetMeta,
  dijkstraPath,
  corridorCalculation,
  view,
  filter,
  currentRoute,
  currentPlaybook,
}: MapCorridorStripProps) {
  return (
    <div
      className="map-strip"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
        borderTop: '2px solid var(--color-divider)',
        backgroundColor: 'var(--color-surface)',
      }}
    >
      <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
        <div className="eyebrow">Active corridor</div>
        <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
          {originMeta.iso} ({originMeta.name}) ➔ {targetMeta.iso} ({targetMeta.name})
        </div>
        <div style={{ fontSize: '12px' }} className="mut">
          {dijkstraPath.segments.length > 0
            ? `${dijkstraPath.path.join(' → ')} (${dijkstraPath.distanceKm} km · ${dijkstraPath.segments.length} hops)`
            : 'Direct / Single-area corridor'}
        </div>
      </div>
      <div style={{ padding: '12px 18px', borderRight: '1px solid var(--color-divider)' }}>
        <div className="eyebrow">Physical transit (only if booked)</div>
        <div
          className="num"
          style={{
            fontSize: '17px',
            fontWeight: 800,
            marginTop: '2px',
            color: corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null ? 'var(--color-text)' : 'var(--color-accent-700)',
          }}
        >
          {corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh !== null
            ? `€${corridorCalculation.physicalRoute.totalPhysicalTariffEurMwh.toFixed(2)} / MWh`
            : 'Unverified'}
        </div>
        {(() => {
          const activePosRoute = getPosRoute(originMeta.iso, targetMeta.iso);
          const activePossible = (activePosRoute.schemes || []).filter(s => s.status === 'POSSIBLE');
          const reqBooking = activePossible.some(s => /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`));
          const bkScheme = activePossible.find(s => /capacit(y|ies)|book|nominat/i.test(`${s.conditions || ''} ${s.reason || ''}`))?.schemeName;
          return (
            <div style={{ fontSize: '12px' }} className="mut">
              {reqBooking
                ? `Capacity booking required by ${bkScheme || 'scheme'}`
                : corridorCalculation.modes.physicalPipeline.regulatoryFeasibility === 'HIGH'
                ? 'Single-zone / interconnected transit'
                : 'Multi-zone transit · physical capacity booking only if required'}
            </div>
          );
        })()}
      </div>
      <div style={{ padding: '12px 18px' }}>
        <div className="eyebrow">{view === 'SELL' ? 'Trade Playbook' : 'Certificate route'}</div>
        {view === 'SELL' ? (
          <>
            <div style={{ fontSize: '15px', fontWeight: 800, marginTop: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                className="map-status-dot"
                style={{
                  backgroundColor:
                    classifyRoute(currentRoute, filter) === 'SELL_NOW'
                      ? 'var(--color-status-pass-text)'
                      : classifyRoute(currentRoute, filter) === 'CHECK_FIRST'
                      ? 'var(--color-status-warn-text)'
                      : 'color-mix(in srgb, var(--color-text) 30%, var(--color-bg))',
                }}
              />
              {currentPlaybook.badge}
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {currentPlaybook.structureTitle}
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '17px', fontWeight: 800, marginTop: '2px' }}>
              {CERT_ROUTE_LABELS[currentRoute.status]}
            </div>
            <div style={{ fontSize: '12px' }} className="mut">
              {currentRoute.hubs.length > 0 ? (
                <span>
                  Via:{' '}
                  {currentRoute.hubs.map((h, i) => (
                    <React.Fragment key={h}>
                      {i > 0 && ' + '}
                      <a
                        href={`#/registries?registry=${h}`}
                        style={{ color: 'var(--color-primary, #10b981)', textDecoration: 'underline' }}
                      >
                        {h === 'AIB' ? 'AIB' : 'ERGaR'}
                      </a>
                    </React.Fragment>
                  ))}
                </span>
              ) : (
                firstSentence(currentRoute.reason)
              )}
            </div>
            <div style={{ fontSize: '12px', overflowWrap: 'anywhere' }} className="mut">
              PoS: {currentRoute.pos ? currentRoute.pos.status : 'NO_DATA'}
              {currentRoute.pos?.schemeName ? ` · ${currentRoute.pos.schemeName}` : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
