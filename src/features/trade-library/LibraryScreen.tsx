import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { getMarketById } from '../../domain/markets/registry';
import { TradeAssessment } from '../../domain/trade/types';
import { buildDealUrl } from '../../domain/trade/dealParams';
import { 
  Columns3, 
  CheckSquare, 
  Square, 
  X, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  TrendingUp, 
  Filter, 
  RefreshCw, 
  FileSpreadsheet, 
  Copy,
  Building2
} from 'lucide-react';

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

const DEFAULT_REFERENCE_DOSSIERS = [
  {
    id: 'DOS-2026-0142',
    title: 'Danish manure → NL ERE',
    ref: 'DOS-2026-0142 · saved 14 Aug 2026',
    verdict: 'ELIGIBLE',
    status: 'INDICATIVE',
    marketId: 'NL_ERE',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volume: 40000,
    netbackVal: 169.30,
    marginVal: 16.93,
    stats: [
      { k: 'Volume', v: '40,000 MWh' },
      { k: 'Netback', v: '€169.30', tone: 'text-emerald-400' },
      { k: 'Margin', v: '€16.93' },
    ],
    note: 'Base placement. Mass balance held inside the Energinet–Gasunie UDB area; no multiplier exposure.',
    drift: 'Marks moved +€0.004/kg since save — netback +€2.10',
    driftTone: 'text-emerald-400',
  },
  {
    id: 'DOS-2026-0139',
    title: 'Danish manure → DE THG (2× branch)',
    ref: 'DOS-2026-0139 · saved 12 Aug 2026',
    verdict: 'UNRESOLVED',
    status: 'DRAFT',
    marketId: 'DE_THG',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volume: 60000,
    netbackVal: 177.65,
    marginVal: 17.77,
    stats: [
      { k: 'Volume', v: '60,000 MWh' },
      { k: 'Netback', v: '€177.65', tone: 'text-sky-400' },
      { k: 'Margin', v: '€17.77' },
    ],
    note: 'Upside branch only. Valuation assumes double counting retained for biomethane in the 2026 compliance year.',
    drift: 'Cabinet draft unchanged — branch still open',
    driftTone: 'text-sky-400',
  },
  {
    id: 'DOS-2026-0131',
    title: 'Danish manure → UK RTFO',
    ref: 'DOS-2026-0131 · saved 06 Aug 2026',
    verdict: 'HARD_BLOCK',
    status: 'ARCHIVED',
    marketId: 'UK_RTFO',
    originCountry: 'DK',
    feedstock: 'manure',
    ci: -100,
    volume: 50000,
    netbackVal: 0,
    marginVal: 0,
    stats: [
      { k: 'Volume', v: '—' },
      { k: 'Netback', v: '—', tone: 'text-red-400' },
      { k: 'Margin', v: '—' },
    ],
    note: 'Archived as evidence of why the corridor was rejected: grid-injected volume cannot evidence UDB ingestion.',
    drift: 'No change in UK recognition of the Union Database',
    driftTone: 'text-red-400',
  },
  {
    id: 'DOS-2026-0118',
    title: 'Spanish slurry → FR CPB',
    ref: 'DOS-2026-0118 · saved 28 Jul 2026',
    verdict: 'CONDITIONAL',
    status: 'CONFIRMED',
    marketId: 'FR_CPB',
    originCountry: 'ES',
    feedstock: 'manure',
    ci: -80,
    volume: 20000,
    netbackVal: 26.12,
    marginVal: 2.61,
    stats: [
      { k: 'Volume', v: '20,000 MWh' },
      { k: 'Netback', v: '€26.12', tone: 'text-amber-400' },
      { k: 'Margin', v: '€2.61' },
    ],
    note: 'Capped by the €100/MWh statutory ceiling. Viable only while the Spanish origination spread stays below €58.',
    drift: 'Mark 21d old — refresh before quoting',
    driftTone: 'text-amber-400',
  },
];

interface DossierCard {
  id: string;
  title: string;
  ref: string;
  verdict: string;
  status: string;
  marketId: string;
  originCountry: string;
  feedstock: string;
  ci: number;
  volume: number;
  netbackVal: number;
  marginVal: number;
  stats: { k: string; v: string; tone?: string }[];
  note: string;
  drift: string;
  driftTone: string;
  rawAssessment?: TradeAssessment;
}

export function LibraryScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'CONFIRMED'>('ALL');

  const savedList = state.savedAssessments;

  // Convert saved assessments to card format
  const displayDossiers: DossierCard[] = useMemo(() => {
    if (savedList.length > 0) {
      return savedList.map(a => {
        const net = a.netback.netNetback ?? 0;
        const tone = getVerdictTone(a.eligibility.overallVerdict);
        const vol = a.consignment.volumeMWh ?? 120000;
        const margin = a.netback.deskMargin ?? 0;
        return {
          id: a.id,
          title: `${a.consignment.originCountryName} ${a.consignment.feedstockName} → ${a.targetMarketName}`,
          ref: `${a.id} · saved ${new Date(a.createdAt).toLocaleDateString('en-GB')}`,
          verdict: a.eligibility.overallVerdict,
          status: 'ACTIVE',
          marketId: a.targetMarketId,
          originCountry: a.consignment.originCountry,
          feedstock: a.consignment.feedstock,
          ci: a.consignment.carbonIntensity,
          volume: vol,
          netbackVal: net,
          marginVal: margin,
          stats: [
            { k: 'Volume', v: `${vol.toLocaleString()} MWh` },
            { k: 'Netback', v: `€${net.toFixed(2)}`, tone: tone.text },
            {
              k: 'Margin',
              v: a.netback.deskMargin !== null ? `€${a.netback.deskMargin.toFixed(2)}` : 'Unset',
            },
          ],
          note: a.userNotes || `${a.targetMarketName} assessment under RED III criteria.`,
          drift: 'Recomputed against live marks',
          driftTone: 'text-teal-300',
          rawAssessment: a,
        };
      });
    }

    return DEFAULT_REFERENCE_DOSSIERS;
  }, [savedList]);

  // Filter dossiers
  const filteredDossiers = useMemo(() => {
    if (statusFilter === 'ACTIVE') {
      return displayDossiers.filter(d => d.verdict === 'ELIGIBLE' || d.status === 'INDICATIVE');
    }
    if (statusFilter === 'CONFIRMED') {
      return displayDossiers.filter(d => d.status === 'CONFIRMED' || d.status === 'EXECUTED');
    }
    return displayDossiers;
  }, [displayDossiers, statusFilter]);

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const comparedDossiers = useMemo(() => {
    return displayDossiers.filter(d => selectedIds.includes(d.id));
  }, [displayDossiers, selectedIds]);

  const handleRecalculate = (dossier: DossierCard) => {
    if (dossier.rawAssessment) {
      const a = dossier.rawAssessment;
      const market = getMarketById(a.targetMarketId);
      if (!market) return;
      const newEl = evaluateEligibility(a.consignment, market);
      const newNet = computeNetback(market, a.consignment, state.marks, state.costs, state.marks.pricingSides);
      const updated: TradeAssessment = {
        ...a,
        eligibility: newEl,
        netback: newNet,
        marks: state.marks,
        costs: state.costs,
      };
      dispatch({ type: 'SAVE_ASSESSMENT', assessment: updated });
    } else {
      navigate(buildDealUrl({ marketId: dossier.marketId, originCountry: dossier.originCountry }));
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[1400px] overflow-y-auto bg-stone-950 font-sans">
      
      {/* 7A. TOOLBAR */}
      <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-3.5 border-b border-stone-800 bg-stone-900 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
            Trade dossiers & Library
          </h1>
          <span className="text-xs text-stone-400">
            {displayDossiers.length} archived · recalculated against current marks on open
          </span>

          <div className="flex items-center bg-stone-950 p-0.5 rounded border border-stone-800 ml-2">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-2 py-0.5 font-mono text-micro rounded transition-colors ${
                statusFilter === 'ALL' ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              All ({displayDossiers.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-2 py-0.5 font-mono text-micro rounded transition-colors ${
                statusFilter === 'ACTIVE' ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Active Quotes
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('CONFIRMED')}
              className={`px-2 py-0.5 font-mono text-micro rounded transition-colors ${
                statusFilter === 'CONFIRMED' ? 'bg-teal-600 text-stone-950 font-bold' : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Confirmed Deals
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length >= 2 && (
            <button
              type="button"
              onClick={() => setIsCompareOpen(true)}
              className="flex items-center gap-1.5 p-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-stone-950 font-mono text-meta font-bold tracking-[0.08em] uppercase rounded-xs cursor-pointer transition-colors shadow-sm animate-pulse"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Compare {selectedIds.length} Deals</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/trade')}
            className="p-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-meta font-bold tracking-[0.08em] uppercase rounded-xs cursor-pointer transition-colors border-none shadow-xs"
          >
            + New Trade Structurer
          </button>
        </div>
      </div>

      {/* 7B. 2-COLUMN CARD GRID */}
      <div className="p-3.5 grid grid-cols-2 gap-3.5">
        {filteredDossiers.map(d => {
          const tone = getVerdictTone(d.verdict);
          const isSelected = selectedIds.includes(d.id);

          return (
            <article 
              key={d.id} 
              className={`border bg-stone-950 rounded-xs flex flex-col transition-colors duration-150 ${
                isSelected ? 'border-teal-500 shadow-md ring-1 ring-teal-500/40' : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              
              {/* Card Header */}
              <div className="p-2.5 px-3 border-b border-stone-800 flex items-start justify-between gap-2.5 bg-stone-900/50">
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleToggleSelect(d.id)}
                    className="mt-0.5 text-stone-400 hover:text-teal-300 transition-colors cursor-pointer shrink-0"
                    title={isSelected ? "Deselect from comparison" : "Select for side-by-side comparison"}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-teal-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <h2 className="m-0 text-base font-semibold leading-snug text-stone-100 truncate">
                      {d.title}
                    </h2>
                    <div className="font-mono text-micro text-stone-500 tracking-[0.06em] mt-0.5 truncate">
                      {d.ref}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border ${tone.badge}`}>
                    {d.verdict}
                  </span>
                </div>
              </div>

              {/* 3-Column Stat Strip */}
              <div className="grid grid-cols-3 gap-[1px] bg-stone-800">
                {d.stats.map((s, si) => (
                  <div key={si} className="bg-stone-950 p-2 px-2.5">
                    <div className="font-mono text-micro tracking-[0.1em] text-stone-500 uppercase">
                      {s.k}
                    </div>
                    <div className={`font-mono font-num text-sm font-semibold mt-0.5 ${s.tone || 'text-stone-100'}`}>
                      {s.v}
                    </div>
                  </div>
                ))}
              </div>

              {/* Body */}
              <div className="p-2.5 px-3 border-t border-stone-800 flex flex-col flex-1">
                <p className="m-0 text-xs leading-relaxed text-stone-400 flex-1">
                  {d.note}
                </p>

                {/* Footer with Drift Line & Action Buttons */}
                <div className="flex items-center justify-between gap-2.5 mt-3 pt-2 border-t border-stone-900">
                  <span className={`font-mono text-micro truncate ${d.driftTone || 'text-stone-400'}`}>
                    {d.drift}
                  </span>

                  <div className="flex gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRecalculate(d)}
                      className="p-1.5 px-2.5 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-mono text-meta tracking-[0.06em] rounded-xs cursor-pointer transition-colors"
                    >
                      Recalculate
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(buildDealUrl({ 
                        marketId: d.marketId, 
                        originCountry: d.originCountry,
                        feedstock: d.feedstock,
                        ci: d.ci,
                        volume: d.volume
                      }))}
                      className="p-1.5 px-2.5 bg-teal-950 border border-teal-700 text-teal-300 hover:bg-teal-900 hover:text-teal-100 font-mono text-meta tracking-[0.06em] rounded-xs cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span>Open in Desk</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

              </div>

            </article>
          );
        })}
      </div>

      {/* SIDE-BY-SIDE DEAL COMPARATOR MODAL */}
      {isCompareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Multi-Deal Comparison"
          className="fixed inset-0 z-[1000] bg-black/85 backdrop-blur-xs flex items-center justify-center p-6 font-sans animate-in fade-in duration-150"
        >
          <div className="w-full max-w-5xl bg-stone-950 border border-stone-700 shadow-2xl rounded-lg flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-teal-950 border border-teal-700 flex items-center justify-center text-teal-400">
                  <Columns3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-100">
                    Side-by-Side Trade Deal Comparator
                  </h2>
                  <p className="font-mono text-micro text-stone-400">
                    Comparing {comparedDossiers.length} structured trade routes across European compliance destinations
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Comparison Grid */}
            <div className="p-4 overflow-x-auto overflow-y-auto space-y-4">
              <div className="grid grid-cols-[180px_repeat(auto-fit,minmax(240px,1fr))] gap-2 text-xs font-mono">
                {/* Headers */}
                <div className="p-2.5 bg-stone-900/60 rounded font-bold text-stone-400 uppercase text-[11px] flex items-center">
                  Trade Route Parameter
                </div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2.5 bg-stone-900 rounded border border-stone-800 flex flex-col justify-between">
                    <span className="font-bold text-stone-100 text-sm">{d.title}</span>
                    <span className="text-[10px] text-stone-500 mt-0.5">{d.ref}</span>
                  </div>
                ))}

                {/* Target Market */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Target Market</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-stone-200 font-semibold border-b border-stone-900">
                    {d.marketId}
                  </div>
                ))}

                {/* Origin & Feedstock */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Origin / Feedstock</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-stone-300 border-b border-stone-900">
                    {d.originCountry} · {d.feedstock}
                  </div>
                ))}

                {/* Carbon Intensity */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Carbon Intensity (CI)</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-teal-300 font-bold border-b border-stone-900">
                    {d.ci} gCO₂e/MJ
                  </div>
                ))}

                {/* Volume */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Annual Volume</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-stone-100 font-bold border-b border-stone-900">
                    {d.volume.toLocaleString()} MWh
                  </div>
                ))}

                {/* Netback Value */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Delivered Value Stack</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-emerald-300 font-bold text-sm border-b border-stone-900">
                    €{d.netbackVal.toFixed(2)} / MWh
                  </div>
                ))}

                {/* Desk Margin */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Commercial Margin</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-emerald-400 font-bold border-b border-stone-900">
                    €{d.marginVal.toFixed(2)} / MWh
                  </div>
                ))}

                {/* Annual P&L */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Annual Net Profit</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950 text-emerald-400 font-bold text-sm border-b border-stone-900">
                    +€{Math.round(d.marginVal * d.volume).toLocaleString()}
                  </div>
                ))}

                {/* Statutory Verdict */}
                <div className="p-2 bg-stone-950 text-stone-500 border-b border-stone-900">Regulatory Status</div>
                {comparedDossiers.map(d => {
                  const tone = getVerdictTone(d.verdict);
                  return (
                    <div key={d.id} className="p-2 bg-stone-950 border-b border-stone-900">
                      <span className={`px-2 py-0.5 text-micro font-bold border ${tone.badge}`}>
                        {d.verdict}
                      </span>
                    </div>
                  );
                })}

                {/* Action Buttons */}
                <div className="p-2 bg-stone-950">Action</div>
                {comparedDossiers.map(d => (
                  <div key={d.id} className="p-2 bg-stone-950">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCompareOpen(false);
                        navigate(buildDealUrl({ 
                          marketId: d.marketId, 
                          originCountry: d.originCountry,
                          feedstock: d.feedstock,
                          ci: d.ci,
                          volume: d.volume
                        }));
                      }}
                      className="w-full py-1.5 px-2 bg-teal-600 hover:bg-teal-500 text-teal-950 font-bold rounded text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Structure Trade</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-4 border-t border-stone-800 bg-stone-900 flex justify-end">
              <button
                type="button"
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-1.5 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded font-mono text-xs cursor-pointer transition-colors"
              >
                Close Comparator
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
