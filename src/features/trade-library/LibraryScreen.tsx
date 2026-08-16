import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CopyButton } from '../../shared/components/CopyButton';
import { generateTradeSummary } from '../../domain/trade/summary';
import { computeNetback } from '../../domain/netback/engine';
import { evaluateEligibility } from '../../domain/eligibility/engine';
import { getMarketById } from '../../domain/markets/registry';
import { TradeAssessment } from '../../domain/trade/types';
import { 
  FolderArchive, 
  Trash2, 
  RefreshCw, 
  ExternalLink, 
  FileText, 
  Calendar, 
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
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
    const newNetback = computeNetback(market, assessment.consignment, state.marks, state.costs);

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
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* Header */}
      <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-teal-50 text-teal-700 rounded-lg">
              <FolderArchive className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-stone-900">Trade Library & Dossier Archive</h1>
          </div>
          <p className="text-stone-600 text-sm mt-1">
            Persisted historical trade assessments, compliance validations, and client quotes. Recalculate economics with current broker marks anytime.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search dossiers..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs border border-stone-300 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            />
          </div>
        </div>
      </div>

      {recalcMessage && (
        <div className="bg-teal-50 border border-teal-200 text-teal-900 text-sm p-3.5 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-teal-600" />
          <span>{recalcMessage}</span>
        </div>
      )}

      {assessments.length === 0 ? (
        <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center mx-auto text-stone-400">
            <FolderArchive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900">No Saved Trade Dossiers</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mt-1">
              Construct a trade in Trade Builder and click "Save Trade" to create an auditable record for counterparty proposals.
            </p>
          </div>
          <button
            onClick={() => navigate('/trade')}
            className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all inline-flex items-center gap-1.5"
          >
            Create New Trade Dossier <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Saved Dossier List */}
          <div className="lg:col-span-5 space-y-3">
            {filteredAssessments.map(a => {
              const isSelected = selectedAssessment?.id === a.id;
              return (
                <div
                  key={a.id}
                  onClick={() => setSelectedAssessmentId(a.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/50 shadow-xs ring-1 ring-teal-600'
                      : 'border-stone-200 bg-white hover:border-teal-300 hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-sm text-stone-900">{a.consignment.name}</h4>
                      <div className="text-xs text-stone-500 font-mono mt-0.5">
                        Target: {a.targetMarketName}
                      </div>
                    </div>
                    <StatusChip variant={a.eligibility.overallVerdict} size="sm" />
                  </div>

                  <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-500">
                      CI: {a.consignment.carbonIntensity} gCO₂e • {a.consignment.originCountry}
                    </span>
                    <span className="font-bold text-teal-800">
                      {a.netback.netNetback != null ? `€${a.netback.netNetback.toFixed(2)}/MWh` : '—'}
                    </span>
                  </div>

                  <div className="mt-2 text-[10px] text-stone-400 flex items-center justify-between">
                    <span>Saved: {a.createdAt}</span>
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleRecalculateCurrentMarks(a)}
                        className="p-1 hover:bg-stone-200 rounded text-stone-600 hover:text-teal-700"
                        title="Recalculate with live marks"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1 hover:bg-red-100 rounded text-stone-400 hover:text-red-600"
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
              <div className="bg-white border border-stone-200 rounded-2xl p-6 shadow-xs space-y-6 sticky top-20">
                <div className="flex items-center justify-between border-b border-stone-100 pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-stone-900">{selectedAssessment.consignment.name}</h3>
                    <div className="text-xs text-stone-500 font-mono">
                      Target: {selectedAssessment.targetMarketName} • Saved: {selectedAssessment.createdAt}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <CopyButton text={generateTradeSummary(selectedAssessment)} label="Copy Summary" />
                    <button
                      onClick={() => handleRecalculateCurrentMarks(selectedAssessment)}
                      className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Recalculate
                    </button>
                  </div>
                </div>

                {/* Preformatted boss summary */}
                <div className="bg-stone-900 text-stone-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-[500px] leading-relaxed select-all">
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
