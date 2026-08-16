import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from '../../store/context';
import { queryDeskAgent, GeminiModelId } from '../../domain/arbitrage/geminiService';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Key, 
  ChevronRight, 
  Building2, 
  Globe, 
  Calculator, 
  TrendingUp, 
  Coins, 
  Copy, 
  Check,
  Zap,
  HelpCircle,
  CornerDownLeft
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

const PAGE_CONTEXT_TITLES: Record<string, { title: string; icon: any; suggestions: string[] }> = {
  '/': {
    title: 'Map & Export Clearing',
    icon: Globe,
    suggestions: [
      'What are the best export markets for Lithuanian biomethane?',
      'Explain German §37a BImSchG double counting rules for manure',
      'Why is UK injected gas restricted at EU UDB entry points?',
      'How does French TIRUERT certificate pricing work?',
    ],
  },
  '/trade': {
    title: 'Trade Builder & Compliance',
    icon: Calculator,
    suggestions: [
      'How do I optimize CI to maximize German THG netback?',
      'What are the certification requirements for RED III transport?',
      'Calculate netback spread between Germany DC vs Single Counting',
      'What are the remedies for a Mass Balance gate failure?',
    ],
  },
  '/scanner': {
    title: 'Opportunity Scanner',
    icon: TrendingUp,
    suggestions: [
      'Rank the top 3 highest margin cross-border routes right now',
      'How does avoided FuelEU maritime penalty compare to THG-Quote?',
      'What happens to Italian CIC netbacks if transport costs rise €5/MWh?',
      'Explain the margin difference between HBE-G and dRTFC',
    ],
  },
  '/plants': {
    title: '1,986 Facilities Directory',
    icon: Building2,
    suggestions: [
      'Find the largest biomethane plants in Denmark and their operators',
      'Which facilities in France produce over 50 GWh/year from biowaste?',
      'List the top 5 European biomethane plant developers by capacity',
      'Show plants using cryogenic distillation upgrading technology',
    ],
  },
  '/marks': {
    title: 'Price Marks & Curves',
    icon: Coins,
    suggestions: [
      'What is the current TTF gas index and GBP/EUR FX rate?',
      'How are THG-Quote €/tCO2e marks converted to €/MWh biomethane?',
      'What is the implied €/MWh value of a €0.30/HBE Dutch certificate?',
      'Which market marks are currently flagged as stale?',
    ],
  },
  '/library': {
    title: 'Dossiers & Audit Library',
    icon: HelpCircle,
    suggestions: [
      'How do I generate an institutional boss-readable trade dossier?',
      'What statutory RED III citations must be included in audit packs?',
      'How do I export trade assessments for compliance reporting?',
    ],
  },
  '/agents': {
    title: 'AI Multi-Agent Simulation Desk',
    icon: Zap,
    suggestions: [
      'Simulate the elimination of German double counting on EU arbitrage',
      'What if UK and EU agree on mutual UDB recognition next month?',
      'How does FuelEU 2026 penalty escalation affect bio-LNG trade?',
    ],
  },
};

export function FloatingAgentDrawer() {
  const location = useLocation();
  const { state } = useAppState();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isQuerying, setIsQuerying] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('biomethane_gemini_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>('gemini-3.6-flash');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPath = location.pathname;
  const pageMeta = PAGE_CONTEXT_TITLES[currentPath] || PAGE_CONTEXT_TITLES['/'];
  const PageIcon = pageMeta.icon;

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'agent',
      content: `👋 **Trader Assistant Online.** I have complete 360° visibility across all **1,975 registered biomethane facilities**, live marks, RED III regulatory gates, and cross-border netback curves. \n\nYou are currently on the **${pageMeta.title}** page. How can I assist your trading desk?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Global shortcut (Ctrl+K or Cmd+K) to toggle drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (promptToSend?: string) => {
    const query = (promptToSend || inputQuery).trim();
    if (!query || isQuerying) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsQuerying(true);

    try {
      // Find active consignment if any
      const activeConsignment = state.consignments.find(c => c.id === state.activeConsignmentId) || null;

      const responseText = await queryDeskAgent({
        apiKey: apiKey || undefined,
        model: selectedModel,
        userPrompt: query,
        contextData: {
          marks: state.marks,
          costs: state.costs,
          activeConsignment,
          savedAssessmentsCount: state.savedAssessments.length,
        },
      });

      const agentMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages(prev => [...prev, agentMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `agent-${Date.now()}`,
        role: 'agent',
        content: `⚠️ Error executing query: ${err?.message || 'Failed to reach AI agent.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleSaveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('biomethane_gemini_key', key);
    setShowKeyInput(false);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `init-${Date.now()}`,
        role: 'agent',
        content: `🔄 Conversation refreshed. Context synchronized with **${pageMeta.title}**. Ready for questions.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <>
      {/* FLOATING ACTION TRIGGER PILL (Visible on all pages at bottom-right) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 right-5 z-40 bg-stone-900/95 hover:bg-stone-800 text-white border border-teal-500/70 hover:border-teal-400 rounded-full px-3.5 py-2 shadow-2xl flex items-center gap-2.5 transition-colors duration-150 group cursor-pointer backdrop-blur-md animate-in fade-in"
          title="Open AI Desk Copilot (Ctrl+K)"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-4 h-4 text-teal-400 group-hover:scale-110 transition-transform" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          </div>
          <span className="text-xs font-mono font-bold text-stone-100 group-hover:text-teal-300 transition-colors">
            Ask Copilot
          </span>
          <span className="hidden sm:inline-block text-micro text-teal-400/90 font-mono bg-teal-950/90 border border-teal-800/80 px-1.5 py-0.5 rounded">
            Ctrl+K
          </span>
        </button>
      )}

      {/* FLOATING AI TERMINAL DRAWER */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-colors duration-200 flex flex-col font-mono text-xs shadow-2xl bg-stone-900/98 border border-teal-500/80 backdrop-blur-xl  overflow-hidden ${
            isExpanded
              ? 'inset-4 md:inset-8 w-auto h-auto'
              : 'bottom-5 right-5 w-[92vw] sm:w-[460px] h-[580px] max-h-[85vh]'
          }`}
        >
          {/* Header */}
          <div className="p-3 bg-stone-950 border-b border-stone-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-teal-500/20 border border-teal-500/50 flex items-center justify-center text-teal-400">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-xs">AI Desk Copilot</span>
                  <span className="text-micro bg-teal-950 text-teal-300 border border-teal-800 px-1 rounded font-bold">
                    Context: {pageMeta.title.split(' ')[0]}
                  </span>
                </div>
                <div className="text-micro text-stone-400 flex items-center gap-1">
                  <PageIcon className="w-3 h-3 text-teal-400" />
                  <span className="truncate max-w-[200px]">{pageMeta.title}</span>
                </div>
              </div>
            </div>

            {/* Window Actions */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowKeyInput(prev => !prev)}
                className={`p-1.5 rounded transition-colors ${
                  apiKey ? 'text-teal-400 hover:bg-stone-800' : 'text-amber-400 hover:bg-stone-800'
                }`}
                title={apiKey ? 'Gemini API Key active' : 'Add Gemini API Key (Optional)'}
              >
                <Key className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleResetChat}
                aria-label="Clear conversation"
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                title="Clear Conversation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsExpanded(prev => !prev)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                title={isExpanded ? 'Restore window size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-stone-400 hover:text-white hover:bg-stone-800 rounded transition-colors"
                title="Close (Ctrl+K)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* API Key Drawer (Optional) */}
          {showKeyInput && (
            <div className="p-2.5 bg-stone-950 border-b border-stone-800 space-y-2 animate-in slide-in-from-top-2 duration-150">
              <div className="flex justify-between items-center text-micro">
                <span className="text-stone-300 font-bold flex items-center gap-1">
                  <Key className="w-3 h-3 text-amber-400" />
                  <span>Google Gemini API Key (Optional):</span>
                </span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-teal-400 hover:underline text-micro"
                >
                  Get free key ↗
                </a>
              </div>
              <div className="flex gap-1.5">
                <input
                  type="password"
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="flex-1 bg-stone-900 border border-stone-700 rounded px-2 py-1 text-stone-100 text-xs outline-none focus:border-teal-400"
                />
                <button
                  onClick={() => handleSaveApiKey(apiKey)}
                  className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-2.5 py-1 rounded text-xs"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex flex-col space-y-1 ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div className="flex items-center gap-1.5 text-micro text-stone-400 px-1">
                  <span>{msg.role === 'user' ? 'Trader' : 'AI Copilot'}</span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3  max-w-[90%] leading-relaxed break-words relative group ${
                    msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-br-xs'
                      : 'bg-stone-950/90 text-stone-100 border border-stone-800 rounded-bl-xs'
                  }`}
                >
                  {/* Markdown-style formatted body */}
                  <div className="space-y-1.5 text-meta whitespace-pre-wrap">
                    {msg.content}
                  </div>

                  {/* Copy Button for Assistant responses */}
                  {msg.role === 'agent' && (
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded bg-stone-800/80 hover:bg-stone-700 text-stone-300 transition-colors"
                      title="Copy response"
                    >
                      {copiedId === msg.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isQuerying && (
              <div className="flex flex-col items-start space-y-1">
                <div className="text-micro text-teal-400 px-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-spin" />
                  <span>Synthesizing desk intelligence...</span>
                </div>
                <div className="p-3 bg-stone-950/90 text-stone-300 border border-stone-800 rounded-bl-xs flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-75"></div>
                  <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse delay-150"></div>
                  <span className="text-micro text-stone-400 ml-1">Analyzing 1,986 registry & marks...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Context-Aware Suggested Questions */}
          <div className="p-2 bg-stone-950/80 border-t border-stone-800 shrink-0">
            <span className="text-micro font-bold text-stone-400 uppercase tracking-wider block mb-1">
              Suggested for {pageMeta.title.split(' ')[0]}:
            </span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {pageMeta.suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(s)}
                  className="px-2 py-1 rounded bg-stone-900 hover:bg-teal-950 border border-stone-800 hover:border-teal-700 text-stone-300 hover:text-teal-200 text-micro whitespace-nowrap transition-colors shrink-0 flex items-center gap-1 text-left"
                >
                  <Sparkles className="w-2.5 h-2.5 text-teal-400 shrink-0" />
                  <span className="truncate max-w-[240px]">{s}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Input Area */}
          <div className="p-2.5 bg-stone-950 border-t border-stone-800 flex items-center gap-2 shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSendMessage();
              }}
              placeholder={`Ask anything about ${pageMeta.title.toLowerCase()}, plants, or rules...`}
              className="flex-1 bg-stone-900 border border-stone-700 rounded px-3 py-2 text-white text-xs outline-none focus:border-teal-400 transition-colors"
            />
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputQuery.trim() || isQuerying}
              className="bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white font-bold px-3 py-2 rounded flex items-center justify-center transition-colors cursor-pointer"
              title="Send (Enter)"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
