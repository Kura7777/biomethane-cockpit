import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { computeNetback } from '../../domain/netback/engine';
import { getMarketById } from '../../domain/markets/registry';
import { TradeAssessment } from '../../domain/trade/types';

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
    marketId: 'NL_ERE',
    originCountry: 'DK',
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
    marketId: 'DE_THG',
    originCountry: 'DK',
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
    marketId: 'UK_RTFO',
    originCountry: 'DK',
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
    marketId: 'FR_CPB',
    originCountry: 'ES',
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
  marketId: string;
  originCountry: string;
  stats: { k: string; v: string; tone?: string }[];
  note: string;
  drift: string;
  driftTone: string;
  rawAssessment?: TradeAssessment;
}

export function LibraryScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  const savedList = state.savedAssessments;

  // Convert saved assessments to card format
  const displayDossiers: DossierCard[] = useMemo(() => {
    if (savedList.length > 0) {
      return savedList.map(a => {
        const net = a.netback.netNetback ?? 0;
        const tone = getVerdictTone(a.eligibility.overallVerdict);
        return {
          id: a.id,
          title: `${a.consignment.originCountryName} ${a.consignment.feedstockName} → ${a.targetMarketName}`,
          ref: `${a.id} · saved ${new Date(a.createdAt).toLocaleDateString('en-GB')}`,
          verdict: a.eligibility.overallVerdict,
          marketId: a.targetMarketId,
          originCountry: a.consignment.originCountry,
          stats: [
            { k: 'Volume', v: `${(a.consignment.volumeMWh ?? 120000).toLocaleString()} MWh` },
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
      navigate(`/trade?marketId=${dossier.marketId}&originCountry=${dossier.originCountry}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-[1400px] overflow-y-auto bg-stone-950 font-sans">
      
      {/* 7A. TOOLBAR */}
      <div className="flex-none flex items-center justify-between gap-4 p-2.5 px-3.5 border-b border-stone-800 bg-stone-900 sticky top-0 z-10">
        <div className="flex items-baseline gap-3">
          <h1 className="m-0 font-mono text-sm font-semibold tracking-[0.14em] text-stone-100 uppercase">
            Trade dossiers
          </h1>
          <span className="text-xs text-stone-400">
            {displayDossiers.length} archived · recalculated against current marks on open
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/trade')}
          className="p-1.5 px-3 bg-teal-600 hover:bg-teal-500 text-teal-50 font-mono text-meta font-semibold tracking-[0.08em] uppercase rounded-xs cursor-pointer transition-colors border-none"
        >
          New dossier
        </button>
      </div>

      {/* 7B. 2-COLUMN CARD GRID */}
      <div className="p-3.5 grid grid-cols-2 gap-3.5">
        {displayDossiers.map(d => {
          const tone = getVerdictTone(d.verdict);

          return (
            <article key={d.id} className="border border-stone-800 bg-stone-950 rounded-xs flex flex-col">
              
              {/* Card Header */}
              <div className="p-2.5 px-3 border-b border-stone-800 flex items-start justify-between gap-2.5 bg-stone-900/50">
                <div className="min-w-0">
                  <h2 className="m-0 text-base font-semibold leading-snug text-stone-100 truncate">
                    {d.title}
                  </h2>
                  <div className="font-mono text-micro text-stone-500 tracking-[0.06em] mt-0.5 truncate">
                    {d.ref}
                  </div>
                </div>
                <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border shrink-0 ${tone.badge}`}>
                  {d.verdict}
                </span>
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
                      onClick={() => navigate(`/trade?marketId=${d.marketId}&originCountry=${d.originCountry}`)}
                      className="p-1.5 px-2.5 bg-stone-900 border border-stone-700 text-stone-300 hover:bg-stone-800 hover:text-stone-100 font-mono text-meta tracking-[0.06em] rounded-xs cursor-pointer transition-colors"
                    >
                      Open
                    </button>
                  </div>
                </div>

              </div>

            </article>
          );
        })}
      </div>

    </div>
  );
}
