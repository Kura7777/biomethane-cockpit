import React, { useMemo } from 'react';
import { ArbitrageOpportunity } from '../../domain/arbitrage/types';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { MARKETS } from '../../domain/markets/registry';

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
    <div className="bg-stone-900 border border-stone-800 rounded-xs overflow-hidden font-sans">
      <div className="p-3 px-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
        <div>
          <h4 className="m-0 font-mono text-xs font-bold uppercase tracking-wider text-stone-200">
            Pan-European Corridor Arbitrage Heatmap
          </h4>
          <span className="font-mono text-micro text-stone-500">
            Visual netback &amp; margin matrix across 20 European origins × 6 primary compliance quota sinks
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-2xs bg-emerald-700" />
            <span className="text-stone-400">&gt; €30/MWh</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-2xs bg-teal-800" />
            <span className="text-stone-400">€10–30/MWh</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-2xs bg-amber-900" />
            <span className="text-stone-400">&lt; €10/MWh</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-2xs bg-red-950 border border-red-800" />
            <span className="text-stone-400">Blocked</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-stone-950 border-b border-stone-800 text-stone-400 uppercase text-micro">
              <th className="p-2.5 px-3 text-left font-semibold w-48">Origin Country</th>
              {PRIMARY_MARKETS.map(m => (
                <th key={m.id} className="p-2.5 px-2 text-center font-semibold min-w-[120px]">
                  <div>{m.label}</div>
                  <div className="text-[9px] text-stone-500 font-normal">{m.country}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-800/60">
            {allOrigins.map(origin => (
              <tr key={origin.countryCode} className="hover:bg-stone-850/40 transition-colors">
                <td className="p-2 px-3 font-semibold text-stone-200 flex items-center gap-2 whitespace-nowrap">
                  <span className="text-base">{origin.flag}</span>
                  <span>{origin.countryName}</span>
                </td>

                {PRIMARY_MARKETS.map(market => {
                  const entry = routeMap.get(`${origin.countryCode}_${market.id}`);
                  
                  if (entry?.route) {
                    const r = entry.route;
                    const marginVal = r.deskNetMarginEurPerMWh;
                    const netbackVal = r.totalTerminalValueStackEurPerMWh;

                    let cellColor = 'bg-teal-950/80 text-teal-300 border-teal-800/60';
                    if (marginVal !== null && marginVal >= 30) {
                      cellColor = 'bg-emerald-950 border-emerald-700 text-emerald-300';
                    } else if (marginVal !== null && marginVal < 10) {
                      cellColor = 'bg-amber-950/60 border-amber-800/60 text-amber-300';
                    }

                    return (
                      <td key={market.id} className="p-1 text-center">
                        <button
                          type="button"
                          onClick={() => onSelectRoute(r)}
                          className={`w-full py-1.5 px-2 rounded-xs border text-center cursor-pointer transition-all hover:scale-[1.03] hover:shadow-lg ${cellColor}`}
                          title={`Click to open quick deal ticket for ${origin.countryName} to ${market.label}`}
                        >
                          <div className="font-bold font-num text-xs">
                            {marginVal !== null ? `+€${marginVal.toFixed(1)}` : (netbackVal !== null ? `€${netbackVal.toFixed(1)}` : '—')}
                          </div>
                          <div className="text-[9px] text-stone-400 font-normal">
                            {r.feedstockKey} · {r.carbonIntensity} CI
                          </div>
                        </button>
                      </td>
                    );
                  }

                  if (entry?.isBlocked) {
                    return (
                      <td key={market.id} className="p-1 text-center">
                        <div 
                          className="w-full py-1.5 px-2 rounded-xs border border-red-900/60 bg-red-950/40 text-red-400/80 text-center select-none"
                          title={`Blocked: ${entry.blockedRoute?.eligibility.summary || 'Regulatory Gate Block'}`}
                        >
                          <div className="font-semibold text-[10px] uppercase">BLOCKED</div>
                          <div className="text-[9px] text-stone-500 truncate">
                            {entry.blockedRoute?.eligibility.blockingGate || 'Non-EU Grid'}
                          </div>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td key={market.id} className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => onSelectCorridor?.(origin.countryCode, market.id)}
                        className="w-full py-1.5 px-2 rounded-xs border border-stone-800/80 bg-stone-950/50 text-stone-500 hover:text-stone-300 hover:bg-stone-800 text-center cursor-pointer transition-colors"
                        title="Click to evaluate corridor in Sourcing"
                      >
                        <div className="text-[10px]">—</div>
                        <div className="text-[9px] text-stone-600">Unquoted</div>
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
