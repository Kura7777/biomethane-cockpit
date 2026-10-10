import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronDown, CircleHelp } from 'lucide-react';
import { Sheet } from '../../shared/ui/Sheet';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { getStoredAnthropicApiKey } from '../../domain/regcheck/claudeClient';
import { getPageGuide, type PageGuide } from '../../domain/help/pageGuides';
import { GLOSSARY_BY_ID } from '../../domain/help/glossary';
import {
  canonicalRoute,
  getPageContext,
  getPageContextVersion,
  subscribePageContext,
} from '../../domain/help/pageContext';
import {
  HELPER_OFFLINE_NOTE,
  HELPER_PRIVACY_NOTE,
  buildSuggestedQuestions,
  formatUserTurn,
  offlineAnswer,
  parseAnswer,
  type HelperTurn,
} from '../../domain/help/helperLogic';
import { askHelper } from '../../domain/help/helperClient';
import { appendHelperTurn, getHelperSnapshot, setHelperOpen, setHelperViewing, useHelperStore } from './helperStore';
import './helper.css';

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}
const getOnline = () => (typeof navigator === 'undefined' ? true : navigator.onLine);

let turnCounter = 0;
const nextId = () => `t${Date.now().toString(36)}${(turnCounter++).toString(36)}`;

interface Chat {
  pageKey: string;
  guide: PageGuide | undefined;
  title: string;
  aiMode: boolean;
  busy: boolean;
  shownKey: string;
  turns: readonly HelperTurn[];
  previous: { key: string; title: string } | null;
  viewingPrevious: boolean;
  suggestions: string[];
  send: (question: string) => void;
}

function titleFor(key: string): string {
  return getPageGuide(key)?.title ?? key;
}

/** Conversation state for the page the trader is on: AI or offline answers, per-page history, suggestions. */
function useHelperChat(): Chat {
  const { pathname, search } = useLocation();
  const store = useHelperStore();
  const contextVersion = useSyncExternalStore(subscribePageContext, getPageContextVersion, getPageContextVersion);
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const [busy, setBusy] = useState(false);

  const pageKey = canonicalRoute(pathname);
  const guide = getPageGuide(pathname);
  const apiKey = getStoredAnthropicApiKey().trim();
  const aiMode = Boolean(apiKey) && online;

  // eslint-disable-next-line react-hooks/exhaustive-deps -- contextVersion is the change signal for the provider registry
  const context = useMemo(() => getPageContext(pathname, search), [pathname, search, contextVersion]);
  const suggestions = useMemo(() => buildSuggestedQuestions(guide, context), [guide, context]);

  const shownKey = store.viewing ?? pageKey;
  const turns = store.conversations[shownKey] ?? [];
  const previousKey = store.recent.find(k => k !== pageKey) ?? null;

  const send = useCallback((raw: string) => {
    const question = raw.trim();
    if (!question || busy) return;
    setHelperViewing(null);
    const live = getPageContext(pathname, search);
    const history = (getHelperSnapshot().conversations[pageKey] ?? []) as HelperTurn[];
    const userTurn: HelperTurn = { id: nextId(), role: 'user', text: question, sent: formatUserTurn(question, live) };
    appendHelperTurn(pageKey, userTurn);

    const key = getStoredAnthropicApiKey().trim();
    if (!key || !getOnline()) {
      const answer = offlineAnswer(question, guide, live);
      appendHelperTurn(pageKey, {
        id: nextId(),
        role: 'offline',
        text: answer.lines.join('\n'),
        termIds: answer.glossary.map(g => g.id),
      });
      return;
    }

    setBusy(true);
    askHelper({ apiKey: key, route: pageKey, guide, history, question, context: live })
      .then(text => appendHelperTurn(pageKey, { id: nextId(), role: 'assistant', text }))
      .catch((err: unknown) => appendHelperTurn(pageKey, {
        id: nextId(),
        role: 'error',
        text: err instanceof Error ? err.message : 'The helper could not answer.',
      }))
      .finally(() => setBusy(false));
  }, [busy, pathname, search, pageKey, guide]);

  return {
    pageKey,
    guide,
    title: guide?.title ?? pageKey,
    aiMode,
    busy,
    shownKey,
    turns,
    previous: previousKey ? { key: previousKey, title: titleFor(previousKey) } : null,
    viewingPrevious: store.viewing !== null && store.viewing !== pageKey,
    suggestions,
    send,
  };
}

// ── Rendering ───────────────────────────────────────────────────────────────

/** An assistant answer: text with "[[go:/route|Label]]" turned into buttons. Never HTML. */
export function AnswerView({ text, onNavigate }: { text: string; onNavigate: (to: string) => void }) {
  const segments = parseAnswer(text);
  return (
    <div className="ph-answer" data-testid="helper-answer">
      {segments.map((s, i) => {
        if (s.kind === 'text') return <React.Fragment key={i}>{s.text}</React.Fragment>;
        if (s.kind === 'plain') return <React.Fragment key={i}>{s.text}</React.Fragment>;
        return (
          <button key={i} type="button" className="ph-go" data-testid="helper-go" onClick={() => onNavigate(s.to)}>
            {s.label} →
          </button>
        );
      })}
    </div>
  );
}

function Overview({ guide, onNavigate }: { guide: PageGuide | undefined; onNavigate: (to: string) => void }) {
  if (!guide) {
    return <p className="ph-muted" data-testid="helper-overview">No guide is written for this page yet. Ask about a term, or open the <Link to="/glossary">glossary</Link>.</p>;
  }
  return (
    <div className="ph-overview" data-testid="helper-overview">
      <p className="ph-purpose"><strong>{guide.title}.</strong> {guide.purpose}</p>
      <details>
        <summary>How to read this page</summary>
        <ul>
          {guide.howToRead.map(s => <li key={s.section}><strong>{s.section}.</strong> {s.text}</li>)}
        </ul>
      </details>
      <details>
        <summary>Common tasks</summary>
        <ul>
          {guide.commonTasks.map(t => (
            <li key={t.question}>
              <strong>{t.question}</strong> {t.steps.join(' ')}
              {t.link && <> <button type="button" className="ph-go" onClick={() => onNavigate(t.link!)}>Take me there →</button></>}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}

function Turn({ turn, onNavigate }: { turn: HelperTurn; onNavigate: (to: string) => void }) {
  if (turn.role === 'user') return <div className="ph-msg ph-msg--user" data-testid="helper-user">{turn.text}</div>;
  if (turn.role === 'assistant') return <div className="ph-msg"><AnswerView text={turn.text} onNavigate={onNavigate} /></div>;
  if (turn.role === 'error') return <div className="ph-msg ph-msg--error" role="alert" data-testid="helper-error">{turn.text}</div>;
  const entries = (turn.termIds ?? []).map(id => GLOSSARY_BY_ID[id]).filter(Boolean);
  return (
    <div className="ph-msg" data-testid="helper-offline-answer">
      {turn.text && <div className="ph-answer">{turn.text}</div>}
      {entries.map(e => (
        <div key={e.id} className="ph-term" data-testid={`helper-term-${e.id}`}>
          <strong>{e.term}</strong> — {e.short}{' '}
          <Link to={`/glossary?term=${e.id}`} onClick={() => onNavigate(`/glossary?term=${e.id}`)}>Open in glossary →</Link>
        </div>
      ))}
    </div>
  );
}

function ChatBody({ chat, onNavigate }: { chat: Chat; onNavigate: (to: string) => void }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' });
  }, [chat.turns.length, chat.busy]);

  return (
    <div className="ph-body" data-testid="helper-body">
      {chat.viewingPrevious && (
        <div className="ph-prev-banner">
          Previous page chat: {titleFor(chat.shownKey)}.{' '}
          <button type="button" className="ph-link" onClick={() => setHelperViewing(null)}>Back to this page</button>
        </div>
      )}
      {chat.turns.length === 0 && !chat.viewingPrevious && <Overview guide={chat.guide} onNavigate={onNavigate} />}
      {chat.turns.map(t => <Turn key={t.id} turn={t} onNavigate={onNavigate} />)}
      {chat.busy && <div className="ph-msg ph-thinking" data-testid="helper-thinking" aria-live="polite">Thinking…</div>}
      {chat.previous && !chat.viewingPrevious && (
        <button type="button" className="ph-link ph-prev-link" data-testid="helper-previous" onClick={() => setHelperViewing(chat.previous!.key)}>
          Previous page chat ({chat.previous.title})
        </button>
      )}
      <div ref={endRef} />
    </div>
  );
}

function Chips({ chat, onPick, limit }: { chat: Chat; onPick: (q: string) => void; limit: number }) {
  const list = chat.suggestions.slice(0, limit);
  if (list.length === 0) return null;
  return (
    <div className="ph-chips" data-testid="helper-chips">
      {list.map(q => (
        <button key={q} type="button" className="ph-chip" disabled={chat.busy} onClick={() => onPick(q)}>{q}</button>
      ))}
    </div>
  );
}

function ChatInput({ chat, autoFocus }: { chat: Chat; autoFocus?: boolean }) {
  const [value, setValue] = useState('');
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    chat.send(value);
    setValue('');
  };
  return (
    <form className="ph-form" onSubmit={submit}>
      <input
        className="ph-input"
        data-testid="helper-input"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="Ask about this page…"
        aria-label="Ask about this page"
        maxLength={500}
        autoFocus={autoFocus}
      />
      <button type="submit" className="ph-send" data-testid="helper-send" disabled={chat.busy || !value.trim()} aria-label="Ask">
        <ArrowUp size={16} aria-hidden="true" />
      </button>
    </form>
  );
}

function ModeNote({ aiMode }: { aiMode: boolean }) {
  return aiMode ? (
    <p className="ph-note" data-testid="helper-privacy">{HELPER_PRIVACY_NOTE}</p>
  ) : (
    <p className="ph-note" data-testid="helper-offline-note">
      {HELPER_OFFLINE_NOTE} <Link to="/regulation-check">Open settings →</Link>
    </p>
  );
}

// ── The "Would you like help?" nudge ───────────────────────────────────────

const NUDGE_OFF_KEY = 'biomethane-helper-nudge-off';
const NUDGE_SECONDS = 9;

function nudgeDisabled(): boolean {
  try { return localStorage.getItem(NUDGE_OFF_KEY) === '1'; } catch { return false; }
}

/**
 * A small prompt that appears when the trader moves to a new screen, so they know the helper is there.
 * It goes away by itself, is skipped while the helper is open, and can be switched off for good.
 */
function useNudge(pageKey: string, open: boolean) {
  const [shownFor, setShownFor] = useState<string | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (open || nudgeDisabled()) { setShownFor(null); return; }
    setShownFor(pageKey);
    const t = window.setTimeout(() => setShownFor(null), NUDGE_SECONDS * 1000);
    return () => window.clearTimeout(t);
    // Only a change of page raises the prompt; opening the helper just hides it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageKey]);

  const visible = shownFor === pageKey && !open;
  return {
    visible,
    dismiss: () => setShownFor(null),
    disableForever: () => {
      try { localStorage.setItem(NUDGE_OFF_KEY, '1'); } catch { /* ignore */ }
      setShownFor(null);
    },
  };
}

function Nudge({ title, onYes, onNo, onNever }: { title: string; onYes: () => void; onNo: () => void; onNever: () => void }) {
  return (
    <div className="ph-nudge" role="status" data-testid="helper-nudge">
      <div className="ph-nudge-text">Would you like help with this page? <span className="ph-muted">({title})</span></div>
      <div className="ph-nudge-actions">
        <button type="button" className="ph-nudge-yes" data-testid="helper-nudge-yes" onClick={onYes}>Yes, help me</button>
        <button type="button" className="ph-nudge-no" data-testid="helper-nudge-no" onClick={onNo}>Not now</button>
        <button type="button" className="ph-link" data-testid="helper-nudge-never" onClick={onNever}>Don’t ask again</button>
      </div>
    </div>
  );
}

// ── The dock ────────────────────────────────────────────────────────────────

/**
 * The page helper: a slim bar at the bottom of the page (a round "?" and a sheet on a phone).
 * Read-only: it explains the page and links to other pages; it never changes desk data.
 */
export function PageHelper() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const store = useHelperStore();
  const chat = useHelperChat();
  const open = store.open;
  const nudge = useNudge(canonicalRoute(pathname), open);
  const nudgeEl = nudge.visible ? (
    <Nudge
      title={chat.title}
      onYes={() => { nudge.dismiss(); setHelperOpen(true); }}
      onNo={nudge.dismiss}
      onNever={nudge.disableForever}
    />
  ) : null;

  // A new page starts on its own chat.
  const pageKey = canonicalRoute(pathname);
  useEffect(() => { setHelperViewing(null); }, [pageKey]);

  // Esc collapses the desktop panel.
  useEffect(() => {
    if (isMobile || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented) setHelperOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, open]);

  const go = useCallback((to: string) => {
    navigate(to);
    if (isMobile) setHelperOpen(false);
  }, [navigate, isMobile]);

  const modeChip = (
    <span className={`ph-mode ${chat.aiMode ? 'ph-mode--ai' : ''}`} data-testid="helper-mode">{chat.aiMode ? 'AI answers' : 'Offline help'}</span>
  );

  if (isMobile) {
    return (
      <>
        {nudgeEl}
        <button type="button" className="ph-fab" data-testid="helper-fab" aria-label="Ask about this page" aria-haspopup="dialog" onClick={() => setHelperOpen(true)}>
          <CircleHelp size={22} aria-hidden="true" />
        </button>
        <Sheet
          open={open}
          onClose={() => setHelperOpen(false)}
          title={<>Ask about this page {modeChip}</>}
          subtitle={chat.title}
          ariaLabel="Page helper"
          testId="helper-sheet"
          footer={
            <div className="ph-sheet-footer">
              <Chips chat={chat} limit={3} onPick={chat.send} />
              <ChatInput chat={chat} />
              <ModeNote aiMode={chat.aiMode} />
            </div>
          }
        >
          <ChatBody chat={chat} onNavigate={go} />
        </Sheet>
      </>
    );
  }

  if (!open) {
    return (
      <section className="ph-dock" data-testid="page-helper" data-open="false" aria-label="Page helper">
        {nudgeEl}
        <div className="ph-bar">
          <button type="button" className="ph-ask" data-testid="helper-open" onClick={() => setHelperOpen(true)}>
            <CircleHelp size={15} aria-hidden="true" /> Ask about this page…
          </button>
          <Chips chat={chat} limit={3} onPick={q => { setHelperOpen(true); chat.send(q); }} />
        </div>
      </section>
    );
  }

  return (
    <section className="ph-dock ph-dock--open" data-testid="page-helper" data-open="true" aria-label="Page helper">
      <header className="ph-head">
        <CircleHelp size={15} aria-hidden="true" />
        <strong>Ask about this page</strong>
        <span className="ph-muted">{chat.title}</span>
        {modeChip}
        <button type="button" className="ph-close" data-testid="helper-close" onClick={() => setHelperOpen(false)} aria-label="Collapse helper (Esc)" title="Collapse (Esc)">
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </header>
      <ChatBody chat={chat} onNavigate={go} />
      <footer className="ph-foot">
        <Chips chat={chat} limit={3} onPick={chat.send} />
        <ChatInput chat={chat} autoFocus />
        <ModeNote aiMode={chat.aiMode} />
      </footer>
    </section>
  );
}
