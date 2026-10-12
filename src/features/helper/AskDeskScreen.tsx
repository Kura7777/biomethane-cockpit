import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, ChevronDown, KeyRound, MessageCircle, RotateCcw, X } from 'lucide-react';
import { setAssumption } from '../../domain/assumptions/registry';
import { currentHelperModel, helperModelsFor, type HelperProvider } from '../../domain/help/helperModels';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { formatUsd } from '../../domain/help/helperCost';
import { isSimulatedMark } from '../../domain/marks/applyMarks';
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
  const chat = useHelperChat();
  const todaySpend = useTodaySpend();
  const go = useCallback((to: string) => navigate(to), [navigate]);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
  };

  const empty = (
    <div className="ask-empty" data-testid="ask-empty">
      <span className="ask-empty-mark" aria-hidden="true"><MessageCircle size={22} /></span>
      <h1 className="ask-empty-title">Ask the desk</h1>
      <p className="ask-empty-text">
        Markets, regulation, certificate routes, plants or a deal. Answers use the desk’s own marks, routes and
        pricing first, then the web, and say when something is general knowledge.
      </p>
      <div className="ask-starters" data-testid="ask-starters">
        {chat.suggestions.map(q => (
          <button key={q} type="button" className="ask-starter" disabled={chat.busy} onClick={() => chat.send(q)}>{q}</button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="ask-screen" data-testid="ask-screen">
      <header className="ask-head">
        <div className="ask-head-text">
          <strong className="ask-title">Ask the desk</strong>
          <button
            type="button"
            className={`ph-mode ph-mode--btn ${chat.aiMode ? 'ph-mode--ai' : ''}`}
            data-testid="helper-mode"
            title={chat.aiMode ? 'AI answers enabled (click to manage keys)' : 'Offline help mode (click to add API key)'}
            onClick={() => setKeyModalOpen(true)}
          >
            {chat.aiMode ? 'AI answers' : 'Offline help'}
          </button>
        </div>
        <span className="ask-today" data-testid="ask-today" title="Estimated from the token counts each answer reports and the list prices on Pricing desk → Desk assumptions. Kept on this device.">
          Today ≈ {formatUsd(todaySpend)}
        </span>
        <button
          type="button"
          className="ask-key-btn"
          data-testid="ask-open-keys"
          title="Manage Gemini and Anthropic API keys on this device"
          onClick={() => setKeyModalOpen(true)}
        >
          <KeyRound size={13} aria-hidden="true" /> Keys
        </button>
        <ProviderSwitch disabled={chat.busy} />
        <ModelPicker disabled={chat.busy} />
        <button
          type="button"
          className={`ask-new ${confirmClear ? 'ask-new--confirm' : ''}`}
          data-testid="ask-new-chat"
          disabled={chat.busy || chat.turns.length === 0}
          onClick={handleNewChat}
          title={confirmClear ? 'Click again to confirm clearing conversation' : 'Start a fresh conversation'}
        >
          <RotateCcw size={14} aria-hidden="true" /> {confirmClear ? 'Clear chat?' : 'New chat'}
        </button>
      </header>
      <ChatBody chat={chat} onNavigate={go} variant="desk" emptyState={empty} />
      <footer className="ask-foot">
        <div className="ask-column">
          <ChatInput chat={chat} autoFocus placeholder="Ask the desk anything…" />
          <ModeNote chat={chat} />
        </div>
      </footer>
      <KeyDialog open={keyModalOpen} onClose={() => setKeyModalOpen(false)} />
    </div>
  );
}
