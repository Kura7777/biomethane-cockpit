import React, { useMemo } from 'react';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';

interface CorridorMatrixProps {
  tradeableRoutes: ArbitrageOpportunity[];
  blockedRoutes: ArbitrageOpportunity[];
  onSelectRoute: (route: ArbitrageOpportunity) => void;
  onSelectCorridor?: (originCountry: string, marketId: string) => void;
}

const PRIMARY_MARKETS = [
  { id: 'DE_THG', label: 'DE THG', country: 'Germany' },
  { id: 'NL_ERE', label: 'NL ERE', country: 'Netherlands' },
  { id: 'FR_CPB', label: 'FR CPB', country: 'France' },
  { id: 'IT_CIC', label: 'IT CIC', country: 'Italy' },
  { id: 'UK_RTFO', label: 'UK RTFO', country: 'United Kingdom' },
  { id: 'SE_TAX', label: 'SE Tax', country: 'Sweden' },
];

export function CorridorMatrix({
  tradeableRoutes,
  blockedRoutes,
  onSelectRoute,
  onSelectCorridor,
}: CorridorMatrixProps) {
  const allOrigins = useMemo(() => {
    return Object.values(PRODUCING_ORIGINS).sort((a, b) => a.countryName.localeCompare(b.countryName));
  }, []);

  // Map route lookups by `${originCountry}_${targetMarketId}`
  const routeMap = useMemo(() => {
    const map = new Map<string, { route?: ArbitrageOpportunity; isBlocked?: boolean; blockedRoute?: ArbitrageOpportunity }>();
    
    tradeableRoutes.forEach(r => {
      map.set(`${r.originCountry}_${r.targetMarketId}`, { route: r });
    });

    blockedRoutes.forEach(r => {
      map.set(`${r.originCountry}_${r.targetMarketId}`, { isBlocked: true, blockedRoute: r });
    });

    return map;
  }, [tradeableRoutes, blockedRoutes]);

  return (
    <div
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-divider)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '12px 18px',
          backgroundColor: 'var(--color-panel-header)',
          borderBottom: '1px solid var(--color-divider)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div>
          <h4 className="ptitle" style={{ margin: 0, fontSize: '13px' }}>
            Pan-European Corridor Arbitrage Heatmap
          </h4>
          <span className="subttl" style={{ fontSize: '11px' }}>
            Visual netback &amp; margin matrix across all {allOrigins.length} European origins × 6 primary compliance quota sinks
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '11px' }} className="eyebrow">
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-status-pos-border)' }} />
            <span>&gt; €30/MWh</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-status-logistics-border)' }} />
            <span>€10–30/MWh</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-status-warn-border)' }} />
            <span>&lt; €10/MWh</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ width: '10px', height: '10px', backgroundColor: 'var(--color-status-neg-border)' }} />
            <span>Blocked</span>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="table" style={{ fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ width: '180px', textAlign: 'left' }}>Origin Country</th>
              {PRIMARY_MARKETS.map(m => (
                <th key={m.id} style={{ textAlign: 'center', minWidth: '120px' }}>
                  <div>{m.label}</div>
                  <div style={{ fontSize: '10px', fontWeight: 'normal' }} className="mut">{m.country}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allOrigins.map(origin => (
              <tr key={origin.countryCode}>
                <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <span style={{ marginRight: '6px', fontSize: '14px' }}>{origin.flag}</span>
                  <span>{origin.countryName}</span>
                </td>

                {PRIMARY_MARKETS.map(market => {
                  const entry = routeMap.get(`${origin.countryCode}_${market.id}`);
                  
                  if (entry?.route) {
                    const r = entry.route;
                    const marginVal = r.deskNetMarginEurPerMWh;
                    const netbackVal = r.totalTerminalValueStackEurPerMWh;

                    let cellBg = 'var(--color-status-logistics-bg)';
                    let cellBorder = 'var(--color-status-logistics-border)';
                    let cellText = 'var(--color-status-logistics-text)';

                    if (marginVal !== null && marginVal >= 30) {
                      cellBg = 'var(--color-status-pos-bg)';
                      cellBorder = 'var(--color-status-pos-border)';
                      cellText = 'var(--color-status-pos-text)';
                    } else if (marginVal !== null && marginVal < 10) {
                      cellBg = 'var(--color-status-warn-bg)';
                      cellBorder = 'var(--color-status-warn-border)';
                      cellText = 'var(--color-status-warn-text)';
                    }

                    return (
                      <td key={market.id} style={{ padding: '4px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => onSelectRoute(r)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: cellBg,
                            border: `1px solid ${cellBorder}`,
                            color: cellText,
                            cursor: 'pointer',
                            textAlign: 'center',
                            transition: 'all 0.15s ease',
                          }}
                          title={`Click to open deal for ${origin.countryName} to ${market.label}`}
                        >
                          <div className="num" style={{ fontWeight: 700, fontSize: '12px' }}>
                            {marginVal !== null ? `+€${marginVal.toFixed(1)}` : (netbackVal !== null ? `€${netbackVal.toFixed(1)}` : '—')}
                          </div>
                          <div style={{ fontSize: '10px', opacity: 0.85, fontWeight: 500 }}>
                            {r.feedstockKey} · {r.carbonIntensity} CI
                          </div>
                        </button>
                      </td>
                    );
                  }

                  if (entry?.isBlocked) {
                    return (
                      <td key={market.id} style={{ padding: '4px', textAlign: 'center' }}>
                        <div 
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            backgroundColor: 'var(--color-status-neg-bg)',
                            border: '1px solid var(--color-status-neg-border)',
                            color: 'var(--color-status-neg-text)',
                            textAlign: 'center',
                            userSelect: 'none',
                          }}
                          title={`Blocked: ${entry.blockedRoute?.eligibility.summary || 'Regulatory Gate Block'}`}
                        >
                          <div style={{ fontWeight: 700, fontSize: '10px', textTransform: 'uppercase' }}>BLOCKED</div>
                          <div style={{ fontSize: '10px', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.blockedRoute?.eligibility.blockingGate || 'Non-EU Grid'}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={market.id} style={{ padding: '4px', textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => onSelectCorridor?.(origin.countryCode, market.id)}
                        style={{
                          width: '100%',
                          padding: '6px 8px',
                          backgroundColor: 'var(--color-subtier)',
                          border: '1px solid var(--color-divider)',
                          color: 'var(--color-dim)',
                          cursor: 'pointer',
                          textAlign: 'center',
                        }}
                        title="Click to evaluate corridor in Sourcing"
                      >
                        <div style={{ fontSize: '11px', fontWeight: 600 }}>—</div>
                        <div style={{ fontSize: '10px' }}>Unquoted</div>
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

