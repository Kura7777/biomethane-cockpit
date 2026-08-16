import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { StatusChip } from '../../shared/components/StatusChip';
import { CopyButton } from '../../shared/components/CopyButton';
import { FEEDSTOCK_REGISTRY } from '../../domain/consignment/feedstocks';
import { CertificationScheme, ChainOfCustody } from '../../domain/consignment/types';
import { scanEuropeanArbitrage, DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { ArbitrageOpportunity, ArbitrageMatrixCell, RegulatoryWhatIfScenario, AgentChatMessage } from '../../domain/arbitrage/types';
import { queryDeskAgent, GeminiModelId } from '../../domain/arbitrage/geminiService';
import { MARKETS } from '../../domain/markets/registry';
import { 
  Bot, 
  Sparkles, 
  TrendingUp, 
  AlertTriangle, 
  Sliders, 
  ArrowRight, 
  RefreshCw, 
  ShieldCheck, 
  Scale, 
  Layers, 
  Key, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  CornerDownRight,
  Flame,
  HelpCircle,
  Building2,
  Info,
  DollarSign,
  Cpu
} from 'lucide-react';

export function ArbitrageAgentsScreen() {
  const navigate = useNavigate();
  const { state, dispatch } = useAppState();

  // Matrix Filter States
  const [selectedFeedstock, setSelectedFeedstock] = useState<string>('manure');
  const [ciOverride, setCiOverride] = useState<number>(-100);
  const [scheme, setScheme] = useState<CertificationScheme>('ISCC_EU');
  const [chainOfCustody, setChainOfCustody] = useState<ChainOfCustody>('MASS_BALANCE');
  const [volumeMWh, setVolumeMWh] = useState<number>(10000);

  // Regulatory What-If Switchboard
  const [scenario, setScenario] = useState<RegulatoryWhatIfScenario>(DEFAULT_WHAT_IF_SCENARIO);

  // Selected Matrix Cell Inspector Modal / Drawer
  const [selectedOpportunity, setSelectedOpportunity] = useState<ArbitrageOpportunity | null>(null);

  // Gemini API Key & Model Configuration
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => localStorage.getItem('biomethane_gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(() => (localStorage.getItem('biomethane_gemini_model') as GeminiModelId) || 'gemini-3.6-flash');
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<AgentChatMessage[]>([
    {
      id: 'welcome',
      sender: 'agent',
      agentRole: 'Arbitrage Hunter',
      content: `👋 **Welcome to the European Biomethane Trading & Regulatory Copilot.**

Connected to **1,975 registered European biomethane facilities** across 26 countries, live market marks, and statutory RED III compliance gates.

Try asking me:
* *"What is the cross-border clearance status for Danish manure into Germany?"*
* *"Why is UK grid biomethane blocked from EU UDB recording?"*
* *"Explain the legal status of German §37a BImSchG double counting"*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const handleFeedstockChange = (feedstock: string) => {
    setSelectedFeedstock(feedstock);
    const info = FEEDSTOCK_REGISTRY[feedstock];
    if (info) {
      setCiOverride(info.defaultCI);
    }
  };

  // Run Matrix Arbitrage Scan Engine
  const { topOpportunities, matrixCells, blockedArbitrages } = useMemo(() => {
    return scanEuropeanArbitrage(
      state.marks,
      state.costs,
      selectedFeedstock,
      ciOverride,
      scheme,
      chainOfCustody,
      scenario,
      volumeMWh
    );
  }, [state.marks, state.costs, selectedFeedstock, ciOverride, scheme, chainOfCustody, scenario, volumeMWh]);

  // Handle Save Gemini API Key & Model
  const handleSaveApiKey = (key: string, model: GeminiModelId) => {
    setGeminiApiKey(key);
    setSelectedModel(model);
    localStorage.setItem('biomethane_gemini_api_key', key);
    localStorage.setItem('biomethane_gemini_model', model);
    setShowKeyModal(false);
  };

  // Handle Send Chat to Agent
  const handleSendPrompt = async (promptText?: string) => {
    const textToSend = promptText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: AgentChatMessage = {
      id: 'msg_' + Date.now(),
      sender: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!promptText) setChatInput('');
    setChatLoading(true);

    try {
      const activeCons = state.consignments.find(c => c.id === state.activeConsignmentId) || null;
      const response = await queryDeskAgent({
        apiKey: geminiApiKey,
        model: selectedModel,
        userPrompt: textToSend,
        contextData: {
          topOpportunities,
          scenario,
          marks: state.marks,
          costs: state.costs,
          activeConsignment: activeCons,
          savedAssessmentsCount: state.savedAssessments.length,
        },
      });

      const agentMsg: AgentChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'agent',
        agentRole: 'Arbitrage Hunter',
        content: response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setChatMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errMsg: AgentChatMessage = {
        id: 'agent_' + Date.now(),
        sender: 'agent',
        content: `⚠️ Agent processing error: ${err.message}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setChatMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const matrixOrigins = Array.from(new Set(matrixCells.map(c => c.originCode)));
  const matrixMarkets = Array.from(new Set(matrixCells.map(c => c.targetMarketId)));

  const getModelBadgeName = (model: GeminiModelId) => {
    if (model === 'gemini-3.6-flash') return 'Gemini 3.6 Flash';
    if (model === 'gemini-3.5-flash') return 'Gemini 3.5 Flash';
    if (model === 'gemini-3.5-flash-lite') return 'Gemini 3.5 Flash-Lite';
    if (model === 'gemini-3.1-flash-lite') return 'Gemini 3.1 Flash-Lite';
    if (model === 'gemini-3.1-pro') return 'Gemini 3.1 Pro';
    if (model === 'gemini-2.5-pro') return 'Gemini 2.5 Pro';
    return 'Gemini 2.5 Flash';
  };

  return (
    <div className="space-y-4 font-sans text-stone-100 pb-16">
      
      {/* Top Header Controls */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-teal-400" />
            <h1 className="text-base font-bold text-white font-mono uppercase tracking-tight">
              Autonomous Cross-Border Arbitrage & AI Desk Agents
            </h1>
            <span className="text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800 px-1.5 py-0.5 rounded flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {getModelBadgeName(selectedModel)}
            </span>
          </div>
          <p className="text-stone-400 text-xs mt-0.5 font-mono">
            Autonomous combinatorial scanner calculating realistic desk margins (€1.50–€6.00/MWh) across 20 European producing origins.
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          {/* Gemini Model & API Key Status Badge / Button */}
          <button
            onClick={() => setShowKeyModal(true)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded border text-xs font-semibold transition-all ${
              geminiApiKey
                ? 'bg-teal-950 text-teal-300 border-teal-700 hover:bg-teal-900'
                : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            {geminiApiKey ? `${getModelBadgeName(selectedModel)} Active` : `Connect ${getModelBadgeName(selectedModel)}`}
          </button>
        </div>
      </div>

      {/* Commercial Margin & Value Stack Explanation Banner */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-3 flex items-start gap-2.5 text-xs font-mono text-stone-300">
        <Info className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-white">Desk Economics Note:</strong> In European compliance markets, upstream producers price index-linked to the compliance value stack (~88–92%). An intermediary trading desk captures a realistic gross margin of <strong>€2.50–€3.50/MWh</strong> on transport compliance, <strong>€5.00–€8.00/MWh</strong> on maritime bio-LNG insetting, and <strong>€1.00–€1.50/MWh</strong> on wholesale balancing.
        </div>
      </div>

      {/* Regulatory "What-If" Disruption Switchboard */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-3.5 space-y-2.5 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
          <div className="flex items-center gap-1.5 font-bold text-stone-200 uppercase text-[11px]">
            <Scale className="w-3.5 h-3.5 text-amber-400" />
            <span>Regulatory "What-If" Disruption Simulator</span>
          </div>
          <span className="text-[10px] text-stone-500">Simulate legislative policy shocks on European spreads</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          
          {/* 1. Germany Double Counting Switch */}
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1">
            <label className="block text-[10px] font-bold text-stone-400 uppercase">
              🇩🇪 German THG Double Counting (§37a)
            </label>
            <select
              value={scenario.deDoubleCounting}
              onChange={e => setScenario({ ...scenario, deDoubleCounting: e.target.value as any })}
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-teal-300 font-bold"
            >
              <option value="DC_OFF">1× Single Counting (Eliminated Baseline)</option>
              <option value="DC_ON">2× Double Counting (If Retained)</option>
            </select>
          </div>

          {/* 2. UK UDB Grid Boundary Switch */}
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1">
            <label className="block text-[10px] font-bold text-stone-400 uppercase">
              🇬🇧 UK / EU Mutual UDB Recognition
            </label>
            <select
              value={scenario.ukUdbRecognition ? 'TRUE' : 'FALSE'}
              onChange={e => setScenario({ ...scenario, ukUdbRecognition: e.target.value === 'TRUE' })}
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-teal-300 font-bold"
            >
              <option value="FALSE">Current Law: UK Grid Injected BLOCKED at UDB</option>
              <option value="TRUE">Simulated: UK-EU Mutual Grid Recognition</option>
            </select>
          </div>

          {/* 3. FuelEU Escalation Year */}
          <div className="p-2.5 bg-stone-950 border border-stone-800 rounded space-y-1">
            <label className="block text-[10px] font-bold text-stone-400 uppercase">
              ⚓ FuelEU Maritime Non-Compliance Year
            </label>
            <select
              value={scenario.fuelEUEscalationYears}
              onChange={e => setScenario({ ...scenario, fuelEUEscalationYears: Number(e.target.value) as any })}
              className="w-full bg-stone-900 border border-stone-700 rounded px-2 py-1 text-teal-300 font-bold"
            >
              <option value="1">Year 1: 0% Escalation (€2,400/t penalty)</option>
              <option value="2">Year 2: +10% Escalation (€2,640/t penalty)</option>
              <option value="3">Year 3: +20% Escalation (€2,880/t penalty)</option>
              <option value="4">Year 4: +30% Escalation (€3,120/t penalty)</option>
            </select>
          </div>

        </div>
      </div>

      {/* Top High-Alpha Arbitrage Opportunities Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-stone-200 uppercase">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>Top High-Alpha European Cross-Border Routes</span>
          </div>
          <span className="text-[10px] font-mono text-stone-500">
            {topOpportunities.length} tradeable routes identified
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
          {topOpportunities.slice(0, 6).map((opp, idx) => (
            <div
              key={opp.id}
              onClick={() => setSelectedOpportunity(opp)}
              className="bg-stone-900 border border-stone-800 hover:border-teal-500 rounded-xl p-3.5 space-y-2.5 transition-all cursor-pointer shadow-xs hover:shadow-teal-950/40"
            >
              {/* Card Header: Route & Rank */}
              <div className="flex items-start justify-between gap-1 border-b border-stone-800 pb-2">
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-sm text-stone-100">
                    <span>{opp.originFlag} {opp.originCountry}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                    <span>{opp.targetFlag} {opp.targetMarketName}</span>
                  </div>
                  <div className="text-[10px] text-stone-400 mt-0.5">
                    {opp.feedstockName} (CI: {opp.carbonIntensity} g/MJ)
                  </div>
                </div>

                <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-teal-600 text-white font-bold text-[10px]">
                  #{idx + 1}
                </span>
              </div>

              {/* Economic Breakdown */}
              <div className="bg-stone-950 p-2.5 rounded space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-400">
                  <span>Total Delivered Value:</span>
                  <span className="text-stone-200 font-bold">€{opp.totalTerminalValueStackEurPerMWh?.toFixed(2) ?? '—'}/MWh</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Producer Pay (Index-Linked):</span>
                  <span className="text-stone-400">−€{opp.producerPayableEurPerMWh.toFixed(2)}/MWh</span>
                </div>
                <div className="flex justify-between text-stone-400">
                  <span>Grid Transit Tariff:</span>
                  <span className="text-stone-400">−€{opp.transitCostEurPerMWh.toFixed(2)}/MWh</span>
                </div>
                <div className="flex justify-between text-stone-200 border-t border-stone-800 pt-1 font-bold text-xs">
                  <span className="text-emerald-400">Real Desk Net Margin:</span>
                  <span className="text-emerald-400">
                    +€{opp.deskNetMarginEurPerMWh?.toFixed(2) ?? '—'}/MWh
                  </span>
                </div>
              </div>

              {/* Volume P&L & Gating Chip */}
              <div className="flex items-center justify-between text-[10px] pt-0.5">
                <StatusChip variant={opp.overallVerdict} size="xs" />
                <span className="font-bold text-teal-400">
                  10k MWh Profit: €{(opp.totalDealProfitEur ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive 20×14 European Arbitrage Heatmap Matrix */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-stone-800 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-400" />
            <h2 className="text-xs font-bold text-stone-200 uppercase">
              Pan-European Cross-Border Modelled Desk Margin Heatmap (€/MWh)
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-[10px] text-stone-400 uppercase font-bold">Feedstock:</label>
            <select
              value={selectedFeedstock}
              onChange={e => handleFeedstockChange(e.target.value)}
              className="bg-stone-950 border border-stone-700 rounded px-2 py-1 text-teal-300 font-bold text-xs"
            >
              {Object.entries(FEEDSTOCK_REGISTRY).map(([k, v]) => (
                <option key={k} value={k}>{v.name} (CI: {v.defaultCI})</option>
              ))}
            </select>
            <span className="text-[10px] text-stone-500 font-mono">
              (Effective CI: {ciOverride} g/MJ)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-center text-[10px] tabular-nums border-collapse">
            <thead>
              <tr className="bg-stone-950 text-stone-400 uppercase">
                <th className="p-1.5 text-left border border-stone-800">Origin</th>
                {matrixMarkets.map(mId => (
                  <th key={mId} className="p-1.5 border border-stone-800 whitespace-nowrap">
                    {MARKETS.find(m => m.id === mId)?.shortName || mId.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrixOrigins.map(originCode => (
                <tr key={originCode} className="hover:bg-stone-850">
                  <td className="p-1.5 text-left font-bold text-stone-200 bg-stone-950 border border-stone-800 whitespace-nowrap">
                    {originCode}
                  </td>
                  {matrixMarkets.map(mId => {
                    const cell = matrixCells.find(c => c.originCode === originCode && c.targetMarketId === mId);
                    if (!cell) return <td key={mId} className="border border-stone-800 p-1 text-stone-700">—</td>;

                    const margin = cell.deskNetMarginEurPerMWh;
                    let cellBg = 'bg-stone-900/60 text-stone-500 border-stone-800/80';

                    if (cell.isBlocked) {
                      cellBg = 'bg-red-950/40 text-red-400 border-red-900/40 font-bold';
                    } else if (margin === null) {
                      // NO MARK state: distinct neutral style separate from blocked (red ✕) and low margin
                      cellBg = 'bg-stone-900/60 text-stone-500 border-stone-800/80';
                    } else if (margin >= 5.0) {
                      cellBg = 'bg-emerald-900 text-emerald-200 font-bold';
                    } else if (margin >= 3.0) {
                      cellBg = 'bg-teal-900/80 text-teal-200 font-semibold';
                    } else if (margin >= 2.0) {
                      cellBg = 'bg-teal-950 text-teal-300';
                    } else if (margin > 0) {
                      cellBg = 'bg-amber-950 text-amber-300';
                    }

                    return (
                      <td
                        key={mId}
                        className={`border border-stone-800 p-1 transition-colors cursor-pointer ${cellBg}`}
                        title={`${originCode} ➔ ${mId}: ${cell.isBlocked ? cell.blockingReason : margin !== null ? `€${margin.toFixed(2)}/MWh desk margin (Total value: €${cell.totalValueEurPerMWh?.toFixed(2)}/MWh)` : 'No mark entered for this compliance market'}`}
                      >
                        {cell.isBlocked ? (
                          <span className="font-bold text-red-400">✕</span>
                        ) : margin !== null ? (
                          `+€${margin.toFixed(1)}`
                        ) : (
                          <span className="text-[8px] text-stone-500 font-mono tracking-tighter">No mark</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Heatmap 3-State Legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800 text-[11px] text-stone-400 font-mono">
          <div className="flex items-center gap-3">
            <span className="font-bold text-stone-300 uppercase text-[10px]">Matrix Legend:</span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-emerald-900 text-emerald-200 border border-emerald-700 rounded text-[10px] font-bold">+€5.0+</span>
              <span>High Margin (Priced)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-teal-950 text-teal-300 border border-teal-800 rounded text-[10px]">+€2.0–€4.9</span>
              <span>Standard (Priced)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-stone-900 text-stone-500 border border-stone-800 rounded text-[10px]">No mark</span>
              <span>Unpriceable (No Mark)</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-red-950 text-red-400 border border-red-800 rounded text-[10px] font-bold">✕</span>
              <span>Regulatory Blocked</span>
            </span>
          </div>
          <span className="text-stone-500 text-[10px]">Click any cell for full corridor route & desk breakdown</span>
        </div>
      </div>

      {/* Interactive AI Trader Copilot Chat & Dossier Synthesis */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-4 space-y-3 font-mono text-xs">
        <div className="flex items-center justify-between border-b border-stone-800 pb-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-purple-400" />
            <h2 className="text-xs font-bold text-stone-200 uppercase">
              Autonomous Trader Copilot & Legal Dossier Assistant
            </h2>
          </div>
          <span className="text-[10px] text-purple-300 bg-purple-950/80 border border-purple-800 px-2 py-0.5 rounded">
            Powered by {getModelBadgeName(selectedModel)} Reasoning Engine
          </span>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-[10px] text-stone-500 uppercase font-bold">Quick Analysis:</span>
          <button
            onClick={() => handleSendPrompt('Analyze the top alpha trade for Danish manure right now')}
            className="px-2 py-0.5 rounded border border-teal-800 bg-teal-950/60 text-teal-300 hover:bg-teal-900 transition-colors"
          >
            🇩🇰 Analyze Danish Manure Alpha
          </button>
          <button
            onClick={() => handleSendPrompt('Why is UK grid biomethane blocked from German THG quotas?')}
            className="px-2 py-0.5 rounded border border-red-800 bg-red-950/60 text-red-300 hover:bg-red-900 transition-colors"
          >
            🇬🇧 Stress-Test UK UDB Boundary
          </button>
          <button
            onClick={() => handleSendPrompt('Draft a FuelEU Bio-LNG term sheet for CMA CGM from Spain')}
            className="px-2 py-0.5 rounded border border-blue-800 bg-blue-950/60 text-blue-300 hover:bg-blue-900 transition-colors"
          >
            ⚓ Draft CMA CGM FuelEU Term Sheet
          </button>
          <button
            onClick={() => handleSendPrompt('What happens if German double counting is eliminated in 2026?')}
            className="px-2 py-0.5 rounded border border-amber-800 bg-amber-950/60 text-amber-300 hover:bg-amber-900 transition-colors"
          >
            📜 Germany §37a Double Counting Briefing
          </button>
        </div>

        {/* Chat Stream Window */}
        <div className="bg-stone-950 border border-stone-800 rounded-lg p-3 max-h-[360px] overflow-y-auto space-y-3">
          {chatMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-3 rounded-lg text-xs leading-relaxed space-y-1 ${
                msg.sender === 'user'
                  ? 'bg-teal-950/40 border border-teal-800/60 text-stone-200 ml-8'
                  : 'bg-stone-900 border border-stone-800 text-stone-100 mr-8'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] text-stone-500 border-b border-stone-800/80 pb-1 mb-1">
                <span className="font-bold text-teal-400 uppercase">{msg.sender === 'user' ? 'Trader' : msg.agentRole || 'Copilot Agent'}</span>
                <span>{msg.timestamp}</span>
              </div>
              <div className="prose prose-invert prose-xs max-w-none whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="p-3 bg-stone-900 border border-stone-800 rounded-lg text-xs text-stone-400 flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
              <span>Querying {getModelBadgeName(selectedModel)} with European regulatory directives...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Ask the AI desk agent (e.g. 'What is the highest margin export from Poland?')..."
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendPrompt()}
            className="flex-1 bg-stone-950 border border-stone-800 rounded px-3 py-1.5 text-xs text-stone-200 outline-none focus:border-teal-500"
          />
          <button
            onClick={() => handleSendPrompt()}
            disabled={chatLoading || !chatInput.trim()}
            className="bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold px-3 py-1.5 rounded text-xs transition-all flex items-center gap-1"
          >
            <Send className="w-3.5 h-3.5" /> Send
          </button>
        </div>
      </div>

      {/* Gemini Model & API Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="font-bold text-stone-100 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-teal-400" /> Configure Google Gemini Model & API Key
              </span>
              <button onClick={() => setShowKeyModal(false)} className="text-stone-500 hover:text-stone-300">✕</button>
            </div>

            <p className="text-stone-400 text-xs leading-relaxed">
              Connect your Google AI Studio API Key to enable live reasoning with **Gemini 3.7 Flash** across EUR-Lex directives and automated counterparty term sheet drafting.
            </p>

            {/* Model Selector Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">AI Reasoning Model</label>
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value as GeminiModelId)}
                className="w-full bg-stone-950 border border-stone-700 rounded p-2 text-teal-300 font-bold outline-none focus:border-teal-500 font-mono"
              >
                <option value="gemini-3.7-flash">⚡ Gemini 3.7 Flash (Recommended / High Speed & Reasoning)</option>
                <option value="gemini-3.7-pro">🧠 Gemini 3.7 Pro (Deep Legal & Directives Synthesis)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
              </select>
            </div>

            {/* API Key Input */}
            <div>
              <label className="block text-[10px] font-bold text-stone-400 uppercase mb-1">Google AI Studio API Key</label>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={e => setGeminiApiKey(e.target.value)}
                className="w-full bg-stone-950 border border-stone-800 rounded p-2 text-stone-200 outline-none focus:border-teal-500 font-mono"
              />
              <p className="text-[10px] text-stone-500 mt-1">
                Keys are stored locally in your browser only. Get a key at <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-teal-400 underline">aistudio.google.com</a>.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowKeyModal(false)}
                className="px-3 py-1.5 rounded border border-stone-800 text-stone-400 hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveApiKey(geminiApiKey, selectedModel)}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-1.5 rounded"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Opportunity Route Modal */}
      {selectedOpportunity && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 font-mono text-xs">
          <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 max-w-xl w-full space-y-3.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <div>
                <span className="font-bold text-sm text-stone-100 flex items-center gap-2">
                  <span>{selectedOpportunity.originFlag} {selectedOpportunity.originCountryName}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-400" />
                  <span>{selectedOpportunity.targetFlag} {selectedOpportunity.targetMarketName}</span>
                </span>
                <span className="text-[10px] text-stone-400">
                  {selectedOpportunity.feedstockName} (CI: {selectedOpportunity.carbonIntensity} gCO₂e/MJ)
                </span>
              </div>
              <StatusChip variant={selectedOpportunity.overallVerdict} size="xs" />
            </div>

            {/* Decomposed Value Stack */}
            <div className="p-3 bg-stone-950 rounded border border-stone-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-stone-400">
                <span>Delivered Compliance Value Stack:</span>
                <strong className="text-stone-200">€{selectedOpportunity.totalTerminalValueStackEurPerMWh?.toFixed(2) ?? '—'}/MWh</strong>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Producer Index-Linked Share (~90%):</span>
                <strong className="text-stone-400">−€{selectedOpportunity.producerPayableEurPerMWh.toFixed(2)}/MWh</strong>
              </div>
              <div className="flex justify-between text-stone-400">
                <span>Cross-Border Transit Tariff:</span>
                <strong className="text-stone-400">−€{selectedOpportunity.transitCostEurPerMWh.toFixed(2)}/MWh</strong>
              </div>
              <div className="flex justify-between text-stone-200 border-t border-stone-800 pt-1.5 font-bold">
                <span className="text-emerald-400">Real Desk Net Margin:</span>
                <span className="text-emerald-400">
                  +€{selectedOpportunity.deskNetMarginEurPerMWh?.toFixed(2) ?? '—'}/MWh
                </span>
              </div>
            </div>

            <div className="text-xs text-stone-300 p-2.5 rounded bg-stone-950/80 border border-stone-800 leading-relaxed">
              <strong>Execution Rationale:</strong> {selectedOpportunity.regulatoryRationale}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedOpportunity(null)}
                className="px-3 py-1.5 rounded border border-stone-800 text-stone-400 hover:bg-stone-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  navigate(`/trade?marketId=${selectedOpportunity.targetMarketId}`);
                }}
                className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-4 py-1.5 rounded flex items-center gap-1.5"
              >
                Open Full Dossier in Trade Builder <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
