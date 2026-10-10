import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, MessageCircle, RotateCcw } from 'lucide-react';
import { setAssumption } from '../../domain/assumptions/registry';
import { HELPER_MODELS, currentHelperModel } from '../../domain/help/helperModels';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
import { ChatBody, ChatInput, ModeNote, useHelperChat } from './PageHelper';
import { clearHelperConversation } from './helperStore';
import './helper.css';

/**
 * Which Claude model answers: a button showing the current one, opening a menu that says what each
 * model is for. It writes the desk setting helper.model, so #/pricing shows the same choice.
 */
function ModelPicker({ disabled }: { disabled: boolean }) {
  useAssumptionsVersion();
  const current = currentHelperModel();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
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
        title="Choose the Claude model that answers"
        onClick={() => setOpen(!open)}
      >
        {current.name} <ChevronDown size={14} aria-hidden="true" />
      </button>
      {open && (
        <div className="ask-model-menu" role="menu" aria-label="Claude model" data-testid="ask-model-menu">
          {HELPER_MODELS.map(m => (
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
          <p className="ask-model-note">Saved for the desk; also on Pricing desk → Desk assumptions.</p>
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
  const go = useCallback((to: string) => navigate(to), [navigate]);

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
          <span className={`ph-mode ${chat.aiMode ? 'ph-mode--ai' : ''}`} data-testid="helper-mode">{chat.aiMode ? 'AI answers' : 'Offline help'}</span>
        </div>
        <ModelPicker disabled={chat.busy} />
        <button
          type="button"
          className="ask-new"
          data-testid="ask-new-chat"
          disabled={chat.busy || chat.turns.length === 0}
          onClick={() => clearHelperConversation(chat.pageKey)}
        >
          <RotateCcw size={14} aria-hidden="true" /> New chat
        </button>
      </header>
      <ChatBody chat={chat} onNavigate={go} variant="desk" emptyState={empty} />
      <footer className="ask-foot">
        <div className="ask-column">
          <ChatInput chat={chat} autoFocus placeholder="Ask the desk anything…" />
          <ModeNote aiMode={chat.aiMode} />
        </div>
      </footer>
    </div>
  );
}
