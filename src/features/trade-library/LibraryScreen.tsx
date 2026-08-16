import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CopyButton } from '../../shared/components/CopyButton';
import { generateTradeSummary } from '../../domain/trade/summary';
import { assessmentContainsPraData } from '../../domain/trade/licensing';
import { computeNetback } from '../../domain/netback/engine';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { getMarketById } from '../../domain/markets/registry';
import { TradeAssessment } from '../../domain/trade/types';
import { 
  FolderArchive, 
  Trash2, 
  RefreshCw, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from 'lucide-react';

export function LibraryScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [recalcMessage, setRecalcMessage] = useState<string | null>(null);

  const assessments = state.savedAssessments;

  const filteredAssessments = useMemo(() => {
    return assessments.filter(a => {
      const matchSearch = a.consignment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.targetMarketName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.consignment.originCountryName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchSearch;
    });
  }, [assessments, searchTerm]);

  const selectedAssessment = useMemo(() => {
    if (!selectedAssessmentId) return assessments[0] || null;
    return assessments.find(a => a.id === selectedAssessmentId) || null;
  }, [assessments, selectedAssessmentId]);

  const handleRecalculateCurrentMarks = (assessment: TradeAssessment) => {
    const market = getMarketById(assessment.targetMarketId);
    if (!market) return;

    const newEligibility = evaluateEligibility(assessment.consignment, market);
    const newNetback = computeNetback(market, assessment.consignment, state.marks, state.costs, state.marks.pricingSide);

    const updated: TradeAssessment = {
      ...assessment,
      eligibility: newEligibility,
      netback: newNetback,
      marks: state.marks,
      costs: state.costs,
    };

    dispatch({ type: 'SAVE_ASSESSMENT', assessment: updated });
    setRecalcMessage(`Recalculated with live marks for ${assessment.targetMarketName}`);
    setTimeout(() => setRecalcMessage(null), 2500);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this saved trade dossier?')) {
      dispatch({ type: 'DELETE_ASSESSMENT', id });
      if (selectedAssessmentId === id) setSelectedAssessmentId(null);
    }
  };

  return (
    <div className="space-y-2 font-sans text-stone-100 pb-16">
      
      {/* Header */}
      <div className="bg-stone-900 border border-stone-800 p-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FolderArchive className="w-4 h-4 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Trade Dossier Archive
            </h1>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Persisted counterparty trade dossiers. Recalculate economics against live marks anytime.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dossiers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1 text-xs bg-stone-950 border border-stone-800 rounded text-stone-200 outline-none focus:border-teal-500"
            />
          </div>
        </div>
      </div>

      {recalcMessage && (
        <div className="bg-teal-950/70 border border-teal-800 text-teal-300 text-xs p-2.5 rounded flex items-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>{recalcMessage}</span>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 p-8 text-center space-y-3 font-mono">
          <div className="w-10 h-10 bg-stone-950 rounded-full flex items-center justify-center mx-auto text-stone-400 border border-stone-800">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-stone-200 text-sm">No Saved Trade Dossiers</h3>
            <p className="text-xs text-stone-400 max-w-sm mx-auto mt-0.5">
              Construct a trade in Trade Builder and click "Save Dossier" to store an auditable compliance snapshot.
            </p>
          </div>
          <button
            onClick={() => navigate('/trade')}
            className="bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors inline-flex items-center gap-1.5"
          >
            Create New Trade Dossier <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 font-mono">
          
          {/* Saved Dossier List */}
          <div className="lg:col-span-5 space-y-2">
            {filteredAssessments.map(a => {
              const isSelected = selectedAssessment?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={`p-3 rounded border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-teal-500 bg-teal-950/40 ring-1 ring-teal-500'
                      : 'border-stone-800 bg-stone-900 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-stone-100">{a.consignment.name}</h4>
                      <div className="text-meta text-stone-400 mt-0.5">
                        Target: {a.targetMarketName}
                      </div>
                    </div>
                    <StatusChip variant={a.eligibility.overallVerdict} size="xs" />
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-stone-800 flex items-center justify-between text-xs">
                    <span className="text-stone-400 text-micro">
                      CI: {a.consignment.carbonIntensity} • {a.consignment.originCountry}
                    </span>
                    <span className="font-bold text-teal-300">
                      {a.netback.netNetback != null ? `€${a.netback.netNetback.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>

                  <div className="mt-1.5 text-micro text-stone-400 flex items-center justify-between">
                    <span>Saved: {a.createdAt}</span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleRecalculateCurrentMarks(a)}
                        className="p-1 hover:bg-stone-800 rounded text-stone-400 hover:text-teal-300"
                        title="Recalculate with live marks"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 hover:bg-red-950 rounded text-stone-400 hover:text-red-400"
                        title="Delete dossier"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Dossier Viewer */}
          <div className="lg:col-span-7">
            {selectedAssessment && (
              <div className="bg-stone-900 border border-stone-800 p-2 space-y-3 sticky top-16">
                <div className="flex items-center justify-between border-b border-stone-800 pb-2.5">
                  <div>
                    <h3 className="font-bold text-sm text-stone-100">{selectedAssessment.consignment.name}</h3>
                    <div className="text-meta text-stone-400">
                      Target: {selectedAssessment.targetMarketName} • Saved: {selectedAssessment.createdAt}
                    </div>
                  </div>

                  {(() => {
                    const praCheck = assessmentContainsPraData(selectedAssessment);
                    return (
                      <div className="flex items-center gap-2">
                        <CopyButton
                          text={generateTradeSummary(selectedAssessment)}
                          label="Copy Dossier"
                          praWarning={praCheck.hasPra}
                          praSources={praCheck.sources}
                        />
                        <button
                          onClick={() => handleRecalculateCurrentMarks(selectedAssessment)}
                          className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded border border-teal-700 bg-teal-950/70 text-teal-300 hover:bg-teal-900"
                        >
                          <RefreshCw className="w-3 h-3" /> Recalc
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* Preformatted text preview */}
                <div className="bg-stone-950 border border-stone-800 rounded p-3 text-meta text-stone-300 overflow-x-auto max-h-[440px] leading-relaxed select-all">
                  <pre>{generateTradeSummary(selectedAssessment)}</pre>
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
