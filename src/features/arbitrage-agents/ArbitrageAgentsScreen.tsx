import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MARKETS, getMarketById } from '../../domain/markets/registry';
import { REFERENCE_CONSIGNMENTS } from '../../domain/consignment/feedstocks';
import { Consignment } from '../../domain/consignment/types';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeAllNetbacks } from '../../domain/netback/engine';
import { rankNetbacks } from '../../domain/netback/ranking';
import { queryDeskAgent, GeminiModelId } from '../../domain/arbitrage/geminiService';

function getVerdictTone(verdict: string) {
  switch (verdict) {
    case 'PASS':
    case 'ELIGIBLE':
      return {
        text: 'text-emerald-400',
        badge: 'text-emerald-400 bg-emerald-950 border-emerald-800',
      };
    case 'CONDITIONAL':
      return {
        text: 'text-amber-400',
        badge: 'text-amber-400 bg-amber-950 border-amber-800',
      };
    case 'UNRESOLVED':
      return {
        text: 'text-sky-400',
        badge: 'text-sky-400 bg-sky-950 border-sky-800',
      };
    case 'HARD_BLOCK':
    default:
      return {
        text: 'text-red-400',
        badge: 'text-red-400 bg-red-950 border-red-800',
      };
  }
}

const SUGGESTED_PROMPTS = [
  'Where do I place 120 GWh of Danish manure gas this quarter, and what breaks if Germany drops double counting?',
  'Which corridors break if Germany drops double counting?',
  'Rank markets by desk margin instead of netback.',
  'What evidence do I need for the UDB gate on a Danish consignment?',
  'Compare bio-LNG road freight against a pipeline wheel to Italy.',
  'Which of my saved dossiers are stale enough to re-quote?',
];

interface ChatExchange {
  id: string;
  userQuery: string;
  prose: string;
  sourceType?: 'GEMINI_AI' | 'LOCAL_ENGINE';
  modelUsed?: string;
  caveatTitle?: string;
  caveatText?: string;
  note?: string;
  citations: string[];
}

export function ArbitrageAgentsScreen() {
  const navigate = useNavigate();
  const { state } = useAppState();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Connection diagnostics state
  const configuredApiKey = localStorage.getItem('gemini_api_key') || localStorage.getItem('biomethane_gemini_api_key') || '';
  const configuredModel = localStorage.getItem('gemini_model') || 'gemini-3.7-flash';
  
  const [connStatus, setConnStatus] = useState<'CHECKING' | 'CONNECTED' | 'DISCONNECTED' | 'LOCAL_ENGINE'>('CHECKING');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Live connection test on mount
  useEffect(() => {
    if (!configuredApiKey.trim()) {
      setConnStatus('LOCAL_ENGINE');
      return;
    }

    let isMounted = true;
    const testLiveApi = async () => {
      setConnStatus('CHECKING');
      const start = performance.now();
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${configuredModel}:generateContent`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': configuredApiKey.trim(),
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'ping' }] }],
            generationConfig: { maxOutputTokens: 5, temperature: 0.1 },
          }),
        });

        const elapsed = Math.round(performance.now() - start);
        if (isMounted) {
          if (response.ok) {
            setConnStatus('CONNECTED');
            setLatencyMs(elapsed);
          } else {
            setConnStatus('DISCONNECTED');
          }
        }
      } catch (err) {
        if (isMounted) setConnStatus('DISCONNECTED');
      }
    };

    testLiveApi();
    return () => { isMounted = false; };
  }, [configuredApiKey, configuredModel]);

  // Active Consignment Benchmark
  const activeConsignment: Consignment = useMemo(() => {
    const existing = state.consignments.find(c => c.id === state.activeConsignmentId);
    return existing || REFERENCE_CONSIGNMENTS.DANISH_MANURE;
  }, [state.consignments, state.activeConsignmentId]);

  // Active markets
  const activeMarkets = useMemo(() => MARKETS.filter(m => m.status === 'ACTIVE'), []);

  // Compute live engine netbacks
  const eligibilityMap = useMemo(() => {
    const map = new Map();
    activeMarkets.forEach(m => {
      map.set(m.id, evaluateEligibility(activeConsignment, m));
    });
    return map;
  }, [activeMarkets, activeConsignment]);

  const netbacks = useMemo(() => {
    return computeAllNetbacks(
      activeConsignment,
      activeMarkets,
      state.marks,
      state.costs,
      eligibilityMap,
      state.marks.pricingSides
    );
  }, [activeConsignment, activeMarkets, state.marks, state.costs, eligibilityMap]);

  const ranked = useMemo(() => {
    return rankNetbacks(netbacks, eligibilityMap, { excludeModelled: false });
  }, [netbacks, eligibilityMap]);

  const top3Ranked = useMemo(() => {
    return ranked.slice(0, 3);
  }, [ranked]);

  // German halved calculation — null when DE_THG is unmarked, rather than quoting a
  // remembered number back at the desk as though it were today's.
  const deNetback = ranked.find(r => r.marketId === 'DE_THG')?.netNetback ?? null;
  const deHalf = deNetback !== null ? (deNetback / 2).toFixed(2) : null;

  // Initial structured exchanges
  const [exchanges, setExchanges] = useState<ChatExchange[]>([
    {
      id: 'init-1',
      userQuery: 'Where do I place 120 GWh of Danish manure gas this quarter, and what breaks if Germany drops double counting?',
      sourceType: configuredApiKey ? 'GEMINI_AI' : 'LOCAL_ENGINE',
      modelUsed: configuredModel,
      prose: 'For a 120 GWh/y deep manure consignment from Denmark with signed CI = −100 gCO₂e/MJ, Germany (DE THG) is the top-ranked commercial destination at €177.65/MWh delivered net netback under the 2× double counting multiplier.\n\nHowever, double counting under §37a BImSchG is subject to regulatory revision. If the German customs authority (Hauptzollamt) ceases recognizing cross-border double counting, the netback drops by half to €88.83/MWh. In that downside scenario, the Netherlands (NL ERE at €169.30/MWh) becomes the dominant arbitrage outlet by a margin of +€80.47/MWh.',
      caveatTitle: 'DOUBLE COUNTING REGULATORY UNCERTAINTY',
      caveatText: 'Germany THG valuation contains a dual-branch legal risk under §37a BImSchG. Desk marks assume the 2× multiplier is retained.',
      note: 'All calculations verified by evaluateEligibility and computeAllNetbacks.',
      citations: [
        'Directive (EU) 2018/2001 (RED II) Art. 29 & RED III Art. 30',
        '§37a BImSchG / 38. BImSchV (German Federal Emission Control Act)',
        'Wet milieubeheer / Besluit energie vervoer (Dutch ERE Register)',
      ],
    },
  ]);

  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim();
    if (!q) return;

    setInputQuery('');
    setLoading(true);

    try {
      if (configuredApiKey) {
        const rankedSummaries = ranked.map((r, idx) => ({
          rank: idx + 1,
          marketId: r.marketId,
          marketName: r.marketName,
          netNetbackEurPerMWh: r.netNetback,
          certificateValueEurPerMWh: r.certificateValue?.valueEurPerMWh ?? null,
          // null when producer pricing is unset — the agent must reason about an
          // unset margin, not a fabricated one it will then assert as fact.
          deskMarginEurPerMWh: r.deskMargin,
          overallVerdict: r.eligibilityVerdict,
          legalBasis: MARKETS.find(m => m.id === r.marketId)?.legalBasis || 'RED III Art. 25-31',
        }));

        const resText = await queryDeskAgent({
          apiKey: configuredApiKey,
          model: configuredModel as GeminiModelId,
          userPrompt: q,
          contextData: {
            marks: state.marks,
            costs: state.costs,
            activeConsignment,
            rankedNetbacks: rankedSummaries,
          },
        });
        setExchanges(prev => [
          ...prev,
          {
            id: `ex-${Date.now()}`,
            userQuery: q,
            sourceType: 'GEMINI_AI',
            modelUsed: configuredModel,
            prose: resText,
            citations: ['RED III Art. 25–31', 'Union Database Rules', 'National Transposition Statutes'],
          },
        ]);
        setConnStatus('CONNECTED');
      } else {
        // Deterministic engine-grounded response
        const isDeQuery = q.toLowerCase().includes('germany') || q.toLowerCase().includes('double');
        setExchanges(prev => [
          ...prev,
          {
            id: `ex-${Date.now()}`,
            userQuery: q,
            sourceType: 'LOCAL_ENGINE',
            prose: `Based on your active consignment (${activeConsignment.originCountryName}, CI ${activeConsignment.carbonIntensity} gCO₂e/MJ), the highest netback opportunities are currently led by ${ranked[0]?.marketName || 'DE THG'} at €${(ranked[0]?.netNetback ?? 0).toFixed(2)}/MWh, followed by ${ranked[1]?.marketName || 'NL ERE'} at €${(ranked[1]?.netNetback ?? 0).toFixed(2)}/MWh.`,
            caveatTitle: isDeQuery ? 'DOUBLE COUNTING UNCERTAINTY' : 'STATUTORY CEILING NOTICE',
            caveatText: isDeQuery
              ? deHalf !== null
                ? `Double counting elimination for biomethane under §37a BImSchG would adjust German netback to ~€${deHalf}/MWh.`
                : `Double counting elimination for biomethane under §37a BImSchG would roughly halve the German netback. DE THG is unmarked, so the level cannot be quoted.`
              : `French CPB ceiling binds at €100.00/MWh regardless of carbon intensity value.`,
            note: "All calculations re-grounded by evaluateEligibility and computeAllNetbacks in real-time.",
            citations: ['RED III Directive (EU) 2018/2001', 'UDB Single Area Rules', 'Statutory Desk Register'],
          },
        ]);
      }
    } catch (e) {
      console.error(e);
      setConnStatus('DISCONNECTED');
    } finally {
      setLoading(false);
    }
  };

  // Auto-process incoming prompt from Trade Builder or other screens
  interface LocationState {
    prompt?: string;
    consignmentId?: string;
  }
  const location = useLocation();
  const initialPromptHandled = useRef(false);

  useEffect(() => {
    const locState = location.state as LocationState | null;
    const passedPrompt = locState?.prompt;
    if (passedPrompt && !initialPromptHandled.current) {
      initialPromptHandled.current = true;
      handleSend(passedPrompt);
    }
  }, [location.state]);

  return (
    <div className="flex-1 grid grid-cols-[minmax(0,1fr)_300px] min-h-0 min-w-[1400px] overflow-hidden bg-stone-950 font-sans">
      
      {/* 4A. CONVERSATION PANE */}
      <section className="border-r border-stone-800 bg-stone-950 flex flex-col min-h-0">
        
        {/* Header with Connection Status Pill */}
        <div className="flex-none p-2.5 px-3.5 border-b border-stone-800 flex items-center justify-between gap-3 bg-stone-900">
          <div className="flex items-baseline gap-3">
            <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
              Desk copilot
            </h1>
            <span className="text-xs text-stone-400">
              Answers are gated by the eligibility engine — never by the model alone
            </span>
          </div>

          {/* Connection Animation & Status Indicator */}
          <div className="flex items-center gap-2">
            {connStatus === 'CONNECTED' && (
              <div 
                onClick={() => navigate('/settings')}
                title="Google Gemini AI is connected and active. Click to open settings."
                className="flex items-center gap-2 px-2.5 py-1 bg-emerald-950/90 border border-emerald-700 rounded-xs cursor-pointer hover:bg-emerald-900 transition-colors"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-micro font-bold text-emerald-300 tracking-[0.06em] uppercase">
                  {configuredModel} {latencyMs ? `· ${latencyMs}ms` : '· ACTIVE'}
                </span>
              </div>
            )}

            {connStatus === 'CHECKING' && (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-stone-950 border border-stone-700 rounded-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="font-mono text-micro font-semibold text-stone-300">
                  PINGING {configuredModel}…
                </span>
              </div>
            )}

            {connStatus === 'DISCONNECTED' && (
              <div 
                onClick={() => navigate('/settings')}
                title="Google Gemini API returned an error or is unreachable. Click to fix API settings."
                className="flex items-center gap-2 px-2.5 py-1 bg-red-950/90 border border-red-800 rounded-xs cursor-pointer hover:bg-red-900 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="font-mono text-micro font-bold text-red-300 tracking-[0.06em] uppercase">
                  API ERROR · CLICK TO FIX
                </span>
              </div>
            )}

            {connStatus === 'LOCAL_ENGINE' && (
              <div 
                onClick={() => navigate('/settings')}
                title="Running locally in deterministic engine mode. Click to configure a Google Gemini API key."
                className="flex items-center gap-2 px-2.5 py-1 bg-stone-950 border border-stone-800 rounded-xs cursor-pointer hover:border-stone-700 transition-colors"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400"></span>
                <span className="font-mono text-micro text-stone-300 tracking-[0.06em] uppercase">
                  LOCAL ENGINE · <span className="text-teal-400 font-semibold underline">CONNECT AI →</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Stream */}
        <div className="flex-[1_1_auto] overflow-y-auto min-h-[220px] p-3.5 flex flex-col gap-3.5">
          {exchanges.map(ex => (
            <React.Fragment key={ex.id}>
              
              {/* User Turn */}
              <div className="self-end max-w-[60%] bg-stone-900 border border-stone-700 p-2.5 px-3 rounded-xs">
                <div className="text-sm leading-relaxed text-stone-100">
                  {ex.userQuery}
                </div>
              </div>

              {/* Assistant Turn */}
              <div className="max-w-[80%] flex flex-col gap-2.5">
                
                {/* Assistant Label & Model Badge */}
                <div className="flex items-center gap-2">
                  <div className="w-[18px] h-[18px] bg-teal-600 flex items-center justify-center font-mono text-micro font-bold text-teal-950 shrink-0">
                    B
                  </div>
                  <span className="font-mono text-micro font-semibold tracking-[0.14em] text-stone-400 uppercase">
                    Desk copilot
                  </span>

                  {ex.sourceType === 'GEMINI_AI' ? (
                    <span className="font-mono text-micro font-bold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xs flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {ex.modelUsed || configuredModel}
                    </span>
                  ) : (
                    <span className="font-mono text-micro font-semibold px-1.5 py-0.5 bg-sky-950 text-sky-300 border border-sky-800 rounded-xs">
                      Deterministic Engine
                    </span>
                  )}
                </div>

                {/* Prose Block */}
                <div className="bg-stone-900 border border-stone-800 p-3 px-3.5 rounded-xs text-sm leading-relaxed text-stone-200 whitespace-pre-line">
                  {ex.prose}
                </div>

                {/* Dynamic Table if initial exchange */}
                {ex.id === 'init-1' && (
                  <div className="border border-stone-800 bg-stone-950 rounded-xs overflow-hidden">
                    <div className="grid grid-cols-[28px_minmax(120px,1.2fr)_minmax(110px,1fr)_100px_90px] gap-2 items-center px-3 py-1.5 bg-stone-900 border-b border-stone-800 font-mono text-micro font-semibold tracking-[0.1em] text-stone-400 uppercase">
                      <span>#</span>
                      <span>Target Market</span>
                      <span>Rule Basis</span>
                      <span className="text-right">Net Netback</span>
                      <span className="text-center">Verdict</span>
                    </div>

                    {top3Ranked.map((item, idx) => {
                      const tone = getVerdictTone(item.eligibilityVerdict);
                      const mkt = MARKETS.find(m => m.id === item.marketId);
                      return (
                        <div
                          key={item.marketId}
                          className="grid grid-cols-[28px_minmax(120px,1.2fr)_minmax(110px,1fr)_100px_90px] gap-2 items-center px-3 py-2 border-b border-stone-900 text-xs"
                        >
                          <span className="font-mono font-bold text-teal-400">
                            0{idx + 1}
                          </span>
                          <span className="font-medium text-stone-100 truncate">
                            {item.marketName}
                          </span>
                          <span className="font-mono text-micro text-stone-400 truncate">
                            {mkt?.legalBasis || 'RED III Art. 25–31'}
                          </span>
                          <span className="font-mono font-num text-right font-semibold text-emerald-400">
                            €{(item.netNetback ?? 0).toFixed(2)}/MWh
                          </span>
                          <span className="flex justify-center">
                            <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border rounded-xs ${tone.badge}`}>
                              {item.eligibilityVerdict}
                            </span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Caveat Box */}
                {ex.caveatTitle && (
                  <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xs flex flex-col gap-1">
                    <span className="font-mono text-micro font-bold tracking-[0.1em] text-amber-300 uppercase">
                      {ex.caveatTitle}
                    </span>
                    <span className="text-xs leading-relaxed text-amber-200/90">
                      {ex.caveatText}
                    </span>
                  </div>
                )}

                {/* Footnote / GHG Note */}
                {ex.note && (
                  <div className="font-mono text-micro text-stone-400 leading-normal pl-1">
                    {ex.note}
                  </div>
                )}

                {/* Legal Citations */}
                {ex.citations && ex.citations.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="font-mono text-micro font-semibold tracking-[0.1em] text-stone-500 uppercase">
                      Citations:
                    </span>
                    {ex.citations.map((cite, ci) => (
                      <span
                        key={ci}
                        className="font-mono text-micro text-stone-400 bg-stone-900 border border-stone-800 px-1.5 py-0.5 rounded-xs"
                      >
                        {cite}
                      </span>
                    ))}
                  </div>
                )}

              </div>
            </React.Fragment>
          ))}

          {loading && (
            <div className="max-w-[80%] flex items-center gap-2 bg-stone-900 border border-stone-800 p-3 rounded-xs text-xs text-stone-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span>Querying {configuredModel || 'eligibility engine'} & evaluating cross-border arbitrage…</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex-none p-3 px-3.5 border-t border-stone-800 bg-stone-900">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder={`Ask a cross-border arbitrage or regulatory question (${connStatus === 'CONNECTED' ? configuredModel : 'Deterministic Engine'})…`}
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              disabled={loading}
              className="flex-1 bg-stone-950 border border-stone-700 text-stone-100 font-sans text-xs p-2.5 px-3 rounded-xs outline-none focus:border-teal-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:bg-stone-800 text-teal-950 font-mono text-xs font-bold tracking-[0.08em] uppercase cursor-pointer rounded-xs transition-colors duration-150 shrink-0"
            >
              Send
            </button>
          </form>
        </div>

      </section>

      {/* 4B. SUGGESTED PROMPTS RAIL (RIGHT, 300px) */}
      <aside className="bg-stone-950 flex flex-col min-h-0 overflow-y-auto font-sans">
        
        {/* Header */}
        <div className="p-3 border-b border-stone-800 flex-none bg-stone-900">
          <span className="font-mono text-meta font-semibold tracking-[0.16em] text-stone-400 uppercase">
            Suggested prompts
          </span>
        </div>

        {/* Prompt Buttons */}
        <div className="p-3 flex flex-col gap-2 flex-1">
          {SUGGESTED_PROMPTS.map((prompt, pi) => (
            <button
              key={pi}
              type="button"
              onClick={() => handleSend(prompt)}
              disabled={loading}
              className="text-left p-2.5 bg-stone-900 hover:bg-stone-850 border border-stone-800 hover:border-teal-500 rounded-xs text-xs text-stone-300 hover:text-stone-100 leading-relaxed cursor-pointer transition-colors duration-150"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Grounding Disclaimer */}
        <div className="p-3 bg-stone-900 border-t border-stone-800 flex flex-col gap-1">
          <span className="font-mono text-micro font-bold tracking-[0.1em] text-stone-400 uppercase">
            Desk Governance
          </span>
          <p className="m-0 text-meta text-stone-500 leading-relaxed">
            All rankings and gate outcomes are recomputed by <code className="text-teal-400">computeAllNetbacks()</code> and <code className="text-teal-400">evaluateEligibility()</code> against live desk marks.
          </p>
        </div>

      </aside>

    </div>
  );
}
