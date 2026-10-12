import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Brain, Check, ChevronDown, Download, FileText, KeyRound, MessageCircle, Paperclip, Plus, RotateCcw, Trash2, Upload, X } from 'lucide-react';
import { setAssumption } from '../../domain/assumptions/registry';
import { currentHelperModel, helperModelsFor, type HelperProvider } from '../../domain/help/helperModels';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { formatUsd } from '../../domain/help/helperCost';
import { isSimulatedMark } from '../../domain/marks/applyMarks';
import {
  getDeskRules,
  saveDeskRule,
  deleteDeskRule,
  clearDeskRules,
  exportDeskMemoryJson,
  importDeskMemoryJson,
  type DeskMemoryRule,
} from '../../domain/help/deskMemory';
import {
  getStoredAnthropicApiKey,
  setStoredAnthropicApiKey,
  clearStoredAnthropicApiKey,
  anthropicKeyFingerprint,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  clearStoredGeminiApiKey,
  geminiKeyFingerprint,
} from '../../domain/regcheck/storage';
import { useOptionalAppState } from '../../store/context';
import { usePageContext } from './usePageContext';
import { ChatBody, ChatInput, ModeNote, useHelperChat, useTodaySpend } from './PageHelper';
import { clearHelperConversation } from './helperStore';
import { ProviderSwitch } from './ProviderSwitch';
import './helper.css';

/**
 * Direct in-line key management: allows traders to view, save, or clear their
 * Anthropic or Gemini API key right from Ask the desk without navigating away.
 */
function KeyDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const current = currentHelperModel();
  const [provider, setProvider] = useState<HelperProvider>(current.provider);
  const [geminiVal, setGeminiVal] = useState('');
  const [claudeVal, setClaudeVal] = useState('');
  const [savedGemini, setSavedGemini] = useState(getStoredGeminiApiKey());
  const [savedClaude, setSavedClaude] = useState(getStoredAnthropicApiKey());
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setProvider(current.provider);
      setSavedGemini(getStoredGeminiApiKey());
      setSavedClaude(getStoredAnthropicApiKey());
      setGeminiVal('');
      setClaudeVal('');
      setMsg(null);
    }
  }, [open, current.provider]);

  if (!open) return null;

  const handleSave = () => {
    if (provider === 'google') {
      if (geminiVal.trim()) {
        setStoredGeminiApiKey(geminiVal.trim());
        setSavedGemini(getStoredGeminiApiKey());
        setGeminiVal('');
        setMsg('✓ Gemini key saved.');
      }
    } else {
      if (claudeVal.trim()) {
        setStoredAnthropicApiKey(claudeVal.trim());
        setSavedClaude(getStoredAnthropicApiKey());
        setClaudeVal('');
        setMsg('✓ Anthropic key saved.');
      }
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const handleClear = () => {
    if (provider === 'google') {
      clearStoredGeminiApiKey();
      setSavedGemini('');
      setMsg('Gemini key cleared.');
    } else {
      clearStoredAnthropicApiKey();
      setSavedClaude('');
      setMsg('Anthropic key cleared.');
    }
    setTimeout(() => setMsg(null), 3000);
  };

  const hasKey = provider === 'google' ? Boolean(savedGemini) : Boolean(savedClaude);
  const fingerprint = provider === 'google' ? geminiKeyFingerprint(savedGemini) : anthropicKeyFingerprint(savedClaude);

  return (
    <div className="ask-modal-backdrop" onClick={onClose} data-testid="ask-key-backdrop">
      <div className="ask-modal" role="dialog" aria-modal="true" aria-label="Desk AI API Keys" onClick={e => e.stopPropagation()}>
        <header className="ask-modal-head">
          <div className="ask-modal-title">
            <KeyRound size={16} aria-hidden="true" />
            <strong>Desk AI API Keys</strong>
          </div>
          <button type="button" className="ph-icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </header>
        <div className="ask-modal-body">
          <p className="ask-modal-note">
            Keys are saved in this browser only and used directly for desk answers. You can also manage keys on{' '}
            <Link to="/regulation-check" onClick={onClose}>Regulation check</Link>.
          </p>
          <div className="ask-modal-tabs">
            <button
              type="button"
              className={`ask-modal-tab ${provider === 'google' ? 'is-active' : ''}`}
              onClick={() => { setProvider('google'); setMsg(null); }}
            >
              Gemini {savedGemini ? '●' : '○'}
            </button>
            <button
              type="button"
              className={`ask-modal-tab ${provider === 'anthropic' ? 'is-active' : ''}`}
              onClick={() => { setProvider('anthropic'); setMsg(null); }}
            >
              Claude {savedClaude ? '●' : '○'}
            </button>
          </div>
          {hasKey && (
            <div className="ask-modal-current">
              Saved key: <code>{fingerprint}</code>
            </div>
          )}
          <div className="ask-modal-field">
            <label htmlFor="ask-key-input">
              {provider === 'google' ? 'New Gemini API Key' : 'New Anthropic API Key'}
            </label>
            <input
              id="ask-key-input"
              type="password"
              className="ask-modal-input"
              placeholder={provider === 'google' ? 'Paste AIza... key' : 'Paste sk-ant-... key'}
              value={provider === 'google' ? geminiVal : claudeVal}
              onChange={e => provider === 'google' ? setGeminiVal(e.target.value) : setClaudeVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
              autoFocus
            />
          </div>
          {msg && <div className="ask-modal-status">{msg}</div>}
        </div>
        <footer className="ask-modal-foot">
          {hasKey && (
            <button type="button" className="ask-modal-btn-clear" onClick={handleClear}>Clear saved key</button>
          )}
          <div className="ask-modal-foot-right">
            <button type="button" className="ask-modal-btn-cancel" onClick={onClose}>Done</button>
            <button
              type="button"
              className="ask-modal-btn-save"
              disabled={!(provider === 'google' ? geminiVal.trim() : claudeVal.trim())}
              onClick={handleSave}
            >
              Save Key
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Desk Memory & Continuous Learning Dialog:
 * Shows stored trading rules, lessons learned, and counterparty traits.
 */
function MemoryDialog({ open, onClose, onRuleChange }: { open: boolean; onClose: () => void; onRuleChange: () => void }) {
  const [rules, setRules] = useState<DeskMemoryRule[]>([]);
  const [subject, setSubject] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [category, setCategory] = useState<DeskMemoryRule['category']>('counterparty');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const refresh = () => setRules(getDeskRules());

  useEffect(() => {
    if (open) {
      refresh();
      setSubject('');
      setRuleText('');
      setStatusMsg(null);
    }
  }, [open]);

  if (!open) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !ruleText.trim()) return;
    saveDeskRule({ subject: subject.trim(), rule: ruleText.trim(), category });
    setSubject('');
    setRuleText('');
    setStatusMsg('✓ Rule saved to desk memory.');
    refresh();
    onRuleChange();
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleDelete = (id: string) => {
    deleteDeskRule(id);
    refresh();
    onRuleChange();
  };

  const handleExport = () => {
    const json = exportDeskMemoryJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `biomethane_desk_memory_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      if (text && importDeskMemoryJson(text)) {
        refresh();
        onRuleChange();
        setStatusMsg('✓ Memory imported successfully.');
        setTimeout(() => setStatusMsg(null), 3000);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="ask-modal-backdrop" onClick={onClose} data-testid="ask-memory-backdrop">
      <div className="ask-modal" role="dialog" aria-modal="true" aria-label="Desk Memory & Custom Rules" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <header className="ask-modal-head">
          <div className="ask-modal-title">
            <Brain size={16} aria-hidden="true" />
            <strong>Desk Memory & Learned Rules</strong>
          </div>
          <button type="button" className="ph-icon-btn" aria-label="Close" onClick={onClose}><X size={16} /></button>
        </header>
        <div className="ask-modal-body">
          <p className="ask-modal-note">
            The desk autonomously records custom counterparty traits, tariff rules, and trade reflections whenever you say "Remember this..." in chat. Stored locally in this browser.
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Active Rules ({rules.length})</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button type="button" className="ph-icon-btn" title="Export Memory Backup" onClick={handleExport}><Download size={14} /></button>
              <label className="ph-icon-btn" title="Import Memory Backup" style={{ cursor: 'pointer' }}>
                <Upload size={14} />
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
              </label>
              {rules.length > 0 && (
                <button type="button" className="ph-icon-btn" title="Clear All Rules" onClick={() => { if (confirm('Clear all stored desk rules?')) { clearDeskRules(); refresh(); onRuleChange(); } }}><Trash2 size={14} /></button>
              )}
            </div>
          </div>

          <div className="ask-mem-rules-list">
            {rules.length === 0 ? (
              <p style={{ margin: '16px 0', fontSize: 12, color: 'var(--color-muted)', textAlign: 'center' }}>
                No custom rules stored yet. Tell the desk in chat: <em>"Remember: Shell requires bilateral UDB transfer and CI below -50"</em> or add one below.
              </p>
            ) : (
              rules.map(r => (
                <div key={r.id} className="ask-mem-rule-card">
                  <div>
                    <span className="ask-mem-rule-tag">{r.category}</span>
                    <strong>{r.subject}:</strong> {r.rule}
                  </div>
                  <button type="button" className="ask-mem-rule-del" title="Delete rule" onClick={() => handleDelete(r.id)}>
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>

          <form className="ask-mem-add-form" onSubmit={handleAdd}>
            <span style={{ fontSize: 12, fontWeight: 600 }}>Add Custom Rule</span>
            <div className="ask-mem-add-row">
              <input
                type="text"
                className="ask-modal-input"
                style={{ flex: '1 1 50%' }}
                placeholder="Subject (e.g. Shell, Eni, DK Tariff)"
                value={subject}
                onChange={e => setSubject(e.target.value)}
              />
              <select
                className="ask-modal-input"
                style={{ flex: '0 0 120px' }}
                value={category}
                onChange={e => setCategory(e.target.value as DeskMemoryRule['category'])}
              >
                <option value="counterparty">Counterparty</option>
                <option value="market">Market</option>
                <option value="tariff">Tariff</option>
                <option value="contract">Contract</option>
                <option value="general">General</option>
              </select>
            </div>
            <textarea
              className="ask-modal-input"
              rows={2}
              placeholder="Rule description or requirement..."
              value={ruleText}
              onChange={e => setRuleText(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
              <button
                type="submit"
                className="ask-modal-btn-save"
                disabled={!subject.trim() || !ruleText.trim()}
              >
                <Plus size={13} style={{ marginRight: 4 }} /> Add Rule
              </button>
            </div>
          </form>

          {statusMsg && <div className="ask-modal-status" style={{ marginTop: 6 }}>{statusMsg}</div>}
        </div>
        <footer className="ask-modal-foot">
          <div className="ask-modal-foot-right">
            <button type="button" className="ask-modal-btn-cancel" onClick={onClose}>Close</button>
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Which model answers: a button showing the current one, opening a menu that says what each of the
 * current provider's models is for (Claude or Gemini is chosen with the switch beside it). It writes the
 * desk setting helper.model, so #/pricing shows the same choice.
 */
function ModelPicker({ disabled }: { disabled: boolean }) {
  useAssumptionsVersion();
  const current = currentHelperModel();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="ask-model" ref={rootRef}>
      <button
        type="button"
        className="ask-model-btn"
        data-testid="ask-model"
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        title="Choose the model that answers"
        onClick={() => setOpen(!open)}
      >
        {current.name} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="ask-model-menu" role="menu" aria-label="Model" data-testid="ask-model-menu">
          {helperModelsFor(current.provider).map(m => (
            <button
              key={m.id}
              type="button"
              role="menuitemradio"
              aria-checked={m.id === current.id}
              className={`ask-model-opt ${m.id === current.id ? 'is-current' : ''}`}
              data-testid={`ask-model-${m.value}`}
              onClick={() => { setAssumption('helper.model', m.value); setOpen(false); }}
            >
              <span className="ask-model-opt-head">
                <strong>{m.name}</strong> <span className="ask-model-tag">{m.tagline}</span>
                {m.id === current.id && <Check size={14} aria-hidden="true" className="ask-model-check" />}
              </span>
              <span className="ask-model-use">{m.useFor}</span>
              <span className="ask-model-cost">{m.speedAndCost}</span>
            </button>
          ))}
          <p className="ask-model-note">{current.provider === 'google' ? 'Uses your Gemini key' : 'Uses your Anthropic key'} (Regulation check). Switch between Claude and Gemini beside this menu. Saved for the desk; also on Pricing desk → Desk assumptions.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Ask the desk (#/ask): the general chat on the main bar. Same engine as the page helper (model,
 * tools, web search, settings on #/pricing), shown full-page and not tied to one screen. One running
 * conversation per browser tab; "New chat" clears it. Read-only, like the helper.
 */
export function AskDeskScreen() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q');
  const handledQueryRef = useRef<string | null>(null);
  const chat = useHelperChat();
  const todaySpend = useTodaySpend();
  const go = useCallback((to: string) => navigate(to), [navigate]);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [memoryModalOpen, setMemoryModalOpen] = useState(false);
  const [rulesCount, setRulesCount] = useState(() => getDeskRules().length);
  const [confirmClear, setConfirmClear] = useState(false);
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; size: string; content: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshRulesCount = () => {
    setRulesCount(getDeskRules().length);
  };

  // Register high-level desk awareness for general trading questions
  const app = useOptionalAppState();
  usePageContext('/ask', () => {
    const marks = app?.state?.marks?.marks ? Object.values(app.state.marks.marks) : [];
    const activeMarks = marks.filter(m => m && (m.mid !== null || m.bid !== null || m.offer !== null));
    return {
      activeMarketsTracked: activeMarks.length,
      simulatedMarksCount: marks.filter(m => isSimulatedMark(m)).length,
      todaySpendEstimateUsd: todaySpend,
      provider: chat.model.provider,
      model: chat.model.name,
      deskMemoryRulesCount: rulesCount,
    };
  });

  const handleNewChat = () => {
    if (chat.turns.length > 2 && !confirmClear) {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
      return;
    }
    setConfirmClear(false);
    clearHelperConversation(chat.pageKey);
    setAttachedDoc(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeStr = file.size < 1024 * 1024
      ? `${Math.round(file.size / 1024)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();

    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // Read PDF bytes and extract printable text chunks
      reader.onload = ev => {
        const buffer = ev.target?.result as ArrayBuffer;
        if (!buffer) return;
        const bytes = new Uint8Array(buffer);
        let text = '';
        let currentChunk = '';
        for (let i = 0; i < bytes.length; i++) {
          const b = bytes[i];
          if ((b >= 32 && b <= 126) || b === 10 || b === 13 || b === 9) {
            currentChunk += String.fromCharCode(b);
          } else {
            if (currentChunk.length >= 4) {
              text += currentChunk + ' ';
            }
            currentChunk = '';
          }
        }
        if (currentChunk.length >= 4) text += currentChunk;
        const cleaned = text.replace(/\s+/g, ' ').slice(0, 30000); // Up to ~30k chars
        setAttachedDoc({
          name: file.name,
          size: sizeStr,
          content: cleaned || `[Binary PDF with ${file.size} bytes: text layer not directly extractable]`,
        });
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Plain text, markdown, json, csv
      reader.onload = ev => {
        const content = (ev.target?.result as string) || '';
        setAttachedDoc({
          name: file.name,
          size: sizeStr,
          content: content.slice(0, 30000),
        });
      };
      reader.readAsText(file);
    }
    e.target.value = '';
  };

  const handleSendPrompt = useCallback((prompt: string) => {
    if (attachedDoc) {
      const fullText = `[ATTACHED REFERENCE DOCUMENT: ${attachedDoc.name} (${attachedDoc.size})]\n${attachedDoc.content}\n\n[TRADER QUESTION]:\n${prompt}`;
      chat.send(fullText);
      setAttachedDoc(null);
    } else {
      chat.send(prompt);
    }
  }, [attachedDoc, chat]);

  useEffect(() => {
    if (queryParam && queryParam.trim() && handledQueryRef.current !== queryParam && !chat.busy) {
      handledQueryRef.current = queryParam;
      handleSendPrompt(queryParam.trim());
      setSearchParams({}, { replace: true });
    }
  }, [queryParam, chat.busy, handleSendPrompt, setSearchParams]);

  const wrappedChat = {
    ...chat,
    send: handleSendPrompt,
  };

  const COMMERCIAL_STARTERS = [
    'How should we structure an EFET term sheet for Danish manure into German THG?',
    'Where is the cross-border netback highest today for a -80 CI manure asset?',
    'Stress-test a TTF + €35 floor deal for an agricultural plant in Spain.',
    'Compare FuelEU Maritime Bio-LNG pooling vs German THG quota.',
    'Remember: Shell will not accept CI above -50 and requires bilateral UDB transfer within 10 days.',
  ];

  const empty = (
    <div className="ask-empty" data-testid="ask-empty">
      <span className="ask-empty-mark" aria-hidden="true"><MessageCircle size={22} /></span>
      <h1 className="ask-empty-title">Ask the desk</h1>
      <p className="ask-empty-text">
        Commercial structures, cross-border arbitrage, regulatory compliance, plant sourcing, or stress-testing a deal.
        Learns custom rules and counterparty traits over time.
      </p>
      <div className="ask-starters" data-testid="ask-starters">
        {chat.suggestions.map(q => (
          <button key={q} type="button" className="ask-starter" disabled={chat.busy} onClick={() => handleSendPrompt(q)}>{q}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ask-screen" data-testid="ask-screen">
      <header className="ask-head">
        <div className="ask-head-left">
          <div className="ask-brand-group">
            <strong className="ask-title">Ask the desk</strong>
            <button
              type="button"
              className={`ask-status-pill ${chat.aiMode ? 'ask-status-pill--live' : 'ask-status-pill--offline'}`}
              data-testid="helper-mode"
              title={chat.aiMode ? 'AI answers enabled (click to manage keys)' : 'Offline help mode (click to add API key)'}
              onClick={() => setKeyModalOpen(true)}
            >
              <span className={`ask-status-dot ${chat.aiMode ? 'is-live' : ''}`} aria-hidden="true" />
              <span>{chat.aiMode ? 'AI answers' : 'Offline help'}</span>
            </button>
          </div>
          <span
            className="ask-today"
            data-testid="ask-today"
            title="Estimated from the token counts each answer reports and the list prices on Pricing desk → Desk assumptions. Kept on this device."
          >
            Today ≈ {formatUsd(todaySpend)}
          </span>
        </div>

        <div className="ask-head-right">
          <div className="ask-tools-group">
            <button
              type="button"
              className="ask-key-btn"
              data-testid="ask-open-memory"
              title="View custom rules, lessons learned, and trade memory"
              onClick={() => setMemoryModalOpen(true)}
            >
              <Brain size={13} aria-hidden="true" />
              <span>Memory</span>
              {rulesCount > 0 && <span className="ask-mem-badge">{rulesCount}</span>}
            </button>
            <button
              type="button"
              className="ask-key-btn"
              data-testid="ask-open-keys"
              title="Manage Gemini and Anthropic API keys on this device"
              onClick={() => setKeyModalOpen(true)}
            >
              <KeyRound size={13} aria-hidden="true" />
              <span>Keys</span>
            </button>
          </div>

          <span className="ask-head-divider" aria-hidden="true" />

          <div className="ask-tools-group ask-model-group">
            <ProviderSwitch disabled={chat.busy} />
            <ModelPicker disabled={chat.busy} />
          </div>

          <span className="ask-head-divider" aria-hidden="true" />

          <button
            type="button"
            className={`ask-new ${confirmClear ? 'ask-new--confirm' : ''}`}
            data-testid="ask-new-chat"
            disabled={chat.busy || chat.turns.length === 0}
            onClick={handleNewChat}
            title={confirmClear ? 'Click again to confirm clearing conversation' : 'Start a fresh conversation'}
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>{confirmClear ? 'Clear chat?' : 'New chat'}</span>
          </button>
        </div>
      </header>
      <ChatBody chat={wrappedChat} onNavigate={go} variant="desk" emptyState={empty} />
      <footer className="ask-foot">
        <div className="ask-column">
          {attachedDoc && (
            <div className="ask-attachment-pill" data-testid="ask-attachment-pill">
              <FileText size={13} aria-hidden="true" />
              <span>{attachedDoc.name} ({attachedDoc.size})</span>
              <button type="button" onClick={() => setAttachedDoc(null)} aria-label="Remove attached file"><X size={12} /></button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <button
              type="button"
              className="ask-attach-btn"
              data-testid="ask-attach-btn"
              title="Attach a trading book chapter, broker report, or term sheet"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={13} aria-hidden="true" /> Attach Doc
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <ChatInput chat={wrappedChat} autoFocus placeholder="Ask the desk anything…" />
            </div>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            accept=".pdf,.txt,.md,.json,.csv"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
          <ModeNote chat={wrappedChat} />
        </div>
      </footer>
      <KeyDialog open={keyModalOpen} onClose={() => setKeyModalOpen(false)} />
      <MemoryDialog
        open={memoryModalOpen}
        onClose={() => setMemoryModalOpen(false)}
        onRuleChange={refreshRulesCount}
      />
    </div>
  );
}
