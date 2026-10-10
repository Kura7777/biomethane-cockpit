import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, RotateCcw } from 'lucide-react';
import { ChatBody, ChatInput, ModeNote, useHelperChat } from './PageHelper';
import { clearHelperConversation } from './helperStore';
import './helper.css';

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
