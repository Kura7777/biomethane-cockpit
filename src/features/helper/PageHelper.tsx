import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, ChevronDown, Maximize2, MessageCircle, Minimize2, Square, X } from 'lucide-react';
import { Sheet } from '../../shared/ui/Sheet';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { DEFAULT_CLAUDE_MODEL, THOROUGH_CLAUDE_MODEL, getStoredAnthropicApiKey } from '../../domain/regcheck/claudeClient';
import { getAssumption } from '../../domain/assumptions/registry';
import { useOptionalAppState } from '../../store/context';
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
import { askHelperStream } from '../../domain/help/helperClient';
import { appendHelperTurn, getHelperSnapshot, setHelperExpanded, setHelperOpen, setHelperViewing, useHelperStore } from './helperStore';
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
  /** The answer being streamed right now, and what the helper is doing ("Searching the web"). */
  liveText: string;
  status: string | null;
  stop: () => void;
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
  const [liveText, setLiveText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const app = useOptionalAppState();
  const appRef = useRef(app);
  useEffect(() => { appRef.current = app; }, [app]);

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

    const state = appRef.current?.state;
    if (!state) {
      appendHelperTurn(pageKey, { id: nextId(), role: 'error', text: 'The desk data is not loaded yet. Try again in a moment.' });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setLiveText('');
    let streamed = '';
    askHelperStream({
      apiKey: key,
      model: getAssumption('helper.useOpus') >= 1 ? THOROUGH_CLAUDE_MODEL : DEFAULT_CLAUDE_MODEL,
      webSearch: getAssumption('helper.webSearch') >= 1,
      route: pageKey,
      guide,
      history,
      question,
      context: live,
      toolCtx: { marks: state.marks, costs: state.costs },
      signal: controller.signal,
      onText: delta => { streamed += delta; setLiveText(streamed); },
      onStatus: setStatus,
    })
      .then(answer => appendHelperTurn(pageKey, { id: nextId(), role: 'assistant', text: answer.text, sources: answer.sources }))
      .catch((err: unknown) => {
        // Keep whatever was already written when the trader stops or the stream fails midway.
        if (streamed.trim()) appendHelperTurn(pageKey, { id: nextId(), role: 'assistant', text: streamed.trim() });
        appendHelperTurn(pageKey, { id: nextId(), role: 'error', text: err instanceof Error ? err.message : 'The helper could not answer.' });
      })
      .finally(() => {
        abortRef.current = null;
        setBusy(false);
        setLiveText('');
        setStatus(null);
      });
  }, [busy, pathname, search, pageKey, guide]);

  return {
    pageKey,
    guide,
    title: guide?.title ?? pageKey,
    aiMode,
    busy,
    shownKey,
    turns,
    liveText,
    status,
    stop: () => abortRef.current?.abort(),
    previous: previousKey ? { key: previousKey, title: titleFor(previousKey) } : null,
    viewingPrevious: store.viewing !== null && store.viewing !== pageKey,
    suggestions,
    send,
  };
}

// ── Rendering ───────────────────────────────────────────────────────────────

/** **bold** inside a run of text; everything else stays plain text (never HTML). */
/** Bare http(s) URLs become links that open in a new tab; trailing punctuation stays text. */
function Linked({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>()[\]]+)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 0) return <React.Fragment key={i}>{p}</React.Fragment>;
        const url = p.replace(/[.,;:!?'"]+$/, '');
        return <React.Fragment key={i}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a>{p.slice(url.length)}</React.Fragment>;
      })}
    </>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]{1,120}\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') && p.length > 4 ? <strong key={i}><Linked text={p.slice(2, -2)} /></strong> : <Linked key={i} text={p} />))}</>;
}

/** Text with "[[go:/route|Label]]" turned into buttons and **bold** kept. */
function RichText({ text, onNavigate }: { text: string; onNavigate: (to: string) => void }) {
  return (
    <>
      {parseAnswer(text).map((s, i) => {
        if (s.kind === 'link') {
          return (
            <button key={i} type="button" className="ph-go" data-testid="helper-go" onClick={() => onNavigate(s.to)}>
              {s.label} →
            </button>
          );
        }
        return <Inline key={i} text={s.text} />;
      })}
    </>
  );
}

type AnswerBlock = { kind: 'text'; text: string } | { kind: 'table'; rows: string[][] };
const TABLE_LINE = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^:?-{2,}:?$/;

/** Split an answer into text runs and "| a | b |" tables (a header row, an optional |---| row, then rows). */
export function splitTables(text: string): AnswerBlock[] {
  const out: AnswerBlock[] = [];
  const lines = text.split('\n');
  let buf: string[] = [];
  const flush = () => {
    if (buf.length) { out.push({ kind: 'text', text: buf.join('\n') }); buf = []; }
  };
  let i = 0;
  while (i < lines.length) {
    if (TABLE_LINE.test(lines[i])) {
      const raw: string[] = [];
      const rows: string[][] = [];
      while (i < lines.length && TABLE_LINE.test(lines[i])) {
        raw.push(lines[i]);
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        if (!cells.every(c => TABLE_RULE.test(c))) rows.push(cells);
        i++;
      }
      if (rows.length >= 2) { flush(); out.push({ kind: 'table', rows }); } else buf.push(...raw);
      continue;
    }
    buf.push(lines[i]);
    i++;
  }
  flush();
  return out;
}

/** An assistant answer: text, small tables and "[[go:/route|Label]]" buttons. Never HTML. */
export function AnswerView({ text, onNavigate }: { text: string; onNavigate: (to: string) => void }) {
  return (
    <div className="ph-answer" data-testid="helper-answer">
      {splitTables(text).map((block, i) =>
        block.kind === 'text' ? (
          <RichText key={i} text={block.text} onNavigate={onNavigate} />
        ) : (
          <div key={i} className="ph-table-wrap">
            <table className="ph-table">
              <thead><tr>{block.rows[0].map((c, j) => <th key={j}><RichText text={c} onNavigate={onNavigate} /></th>)}</tr></thead>
              <tbody>
                {block.rows.slice(1).map((r, k) => (
                  <tr key={k}>{r.map((c, j) => <td key={j}><RichText text={c} onNavigate={onNavigate} /></td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
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
  if (turn.role === 'assistant') {
    return (
      <div className="ph-msg">
        <AnswerView text={turn.text} onNavigate={onNavigate} />
        {turn.sources && turn.sources.length > 0 && (
          <div className="ph-sources" data-testid="helper-sources">
            <div className="ph-sources-title">Web sources</div>
            <ul>
              {turn.sources.map(src => (
                <li key={src.url}><a href={src.url} target="_blank" rel="noopener noreferrer">{src.title}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
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

function ChatBody({ chat, onNavigate, emptyChips }: { chat: Chat; onNavigate: (to: string) => void; emptyChips?: React.ReactNode }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (typeof endRef.current?.scrollIntoView === 'function') endRef.current.scrollIntoView({ block: 'end' });
  }, [chat.turns.length, chat.busy, chat.liveText.length > 0, chat.status]);

  return (
    <div className="ph-body" data-testid="helper-body">
      {chat.viewingPrevious && (
        <div className="ph-prev-banner">
          Previous page chat: {titleFor(chat.shownKey)}.{' '}
          <button type="button" className="ph-link" onClick={() => setHelperViewing(null)}>Back to this page</button>
        </div>
      )}
      {chat.turns.length === 0 && !chat.viewingPrevious && (
        <>
          <p className="ph-greeting" data-testid="helper-greeting">Ask about this page: what it shows, a term, or what to do next.</p>
          {emptyChips}
          <Overview guide={chat.guide} onNavigate={onNavigate} />
        </>
      )}
      {chat.turns.map(t => <Turn key={t.id} turn={t} onNavigate={onNavigate} />)}
      {chat.busy && chat.liveText && <div className="ph-msg" data-testid="helper-live"><AnswerView text={chat.liveText} onNavigate={onNavigate} /></div>}
      {chat.busy && (chat.status || !chat.liveText) && (
        <div className="ph-msg ph-thinking" data-testid="helper-thinking" aria-live="polite">{chat.status ?? 'Thinking'}…</div>
      )}
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

/**
 * Screens with a pinned footer in their side rail (the Trade Builder's "Build deal package", the map's
 * "Open delivery playbook") sit exactly where the capsule floats. Lift the capsule just above that footer.
 * Returns the extra distance from the window bottom (px) the capsule needs, or null for none.
 */
function useCapsuleBottom(enabled: boolean, routeKey: string): number | null {
  const [bottom, setBottom] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = document.querySelector('.ds-aside-footer');
      const rect = el?.getBoundingClientRect();
      const next = rect && rect.width > 0 && rect.height > 0 ? Math.ceil(window.innerHeight - rect.top + 8) : null;
      setBottom(prev => (prev === next ? prev : next));
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(measure); };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', schedule);
    return () => {
      mo.disconnect();
      window.removeEventListener('resize', schedule);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [enabled, routeKey]);
  return enabled ? bottom : null;
}

const INPUT_MAX_PX = 4 * 20 + 14; // four lines of 20px plus padding

function ChatInput({ chat, autoFocus }: { chat: Chat; autoFocus?: boolean }) {
  const [value, setValue] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);

  // One line that grows to four.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, INPUT_MAX_PX)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || chat.busy) return;
    chat.send(value);
    setValue('');
  };
  return (
    <form className="ph-form" onSubmit={e => { e.preventDefault(); submit(); }}>
      <textarea
        ref={ref}
        className="ph-input"
        data-testid="helper-input"
        value={value}
        rows={1}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder="Ask about this page…"
        aria-label="Ask about this page"
        maxLength={500}
        autoFocus={autoFocus}
      />
      {chat.busy ? (
        <button type="button" className="ph-send" data-testid="helper-stop" onClick={chat.stop} aria-label="Stop the answer">
          <Square size={14} aria-hidden="true" />
        </button>
      ) : (
        <button type="submit" className="ph-send" data-testid="helper-send" disabled={!value.trim()} aria-label="Ask">
          <ArrowUp size={16} aria-hidden="true" />
        </button>
      )}
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

// ── The capsule and chat card ───────────────────────────────────────────────

/**
 * The page helper: a capsule floating at the bottom-right that opens a chat card (and, from there, a large
 * centred window). On a phone the capsule opens the full-screen sheet instead.
 * Read-only: it explains the page and links to other pages; it never changes desk data.
 */
export function PageHelper() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const store = useHelperStore();
  const chat = useHelperChat();
  const { open, expanded } = store;
  const capsuleRef = useRef<HTMLButtonElement>(null);
  const liftedBottom = useCapsuleBottom(!isMobile, canonicalRoute(pathname));
  const wasOpen = useRef(open);

  // A new page starts on its own chat.
  const pageKey = canonicalRoute(pathname);
  useEffect(() => { setHelperViewing(null); }, [pageKey]);

  // Esc steps back: expanded window → card → closed.
  useEffect(() => {
    if (isMobile || !open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      if (getHelperSnapshot().expanded) setHelperExpanded(false);
      else setHelperOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, open]);

  // Focus returns to the capsule when the card closes (the card focuses its own input on open).
  useEffect(() => {
    if (wasOpen.current && !open) capsuleRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  const go = useCallback((to: string) => {
    navigate(to);
    if (isMobile) setHelperOpen(false);
  }, [navigate, isMobile]);

  const modeChip = (
    <span className={`ph-mode ${chat.aiMode ? 'ph-mode--ai' : ''}`} data-testid="helper-mode">{chat.aiMode ? 'AI answers' : 'Offline help'}</span>
  );

  if (isMobile) {
    return (
      <div className="ph-root ph-root--compact">
        <button
          ref={capsuleRef}
          type="button"
          className="ph-capsule"
          data-testid="helper-open"
          aria-label="Ask about this page"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setHelperOpen(true)}
        >
          <MessageCircle size={18} aria-hidden="true" /> Ask
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
      </div>
    );
  }

  return (
    <div
      className="ph-root"
      style={liftedBottom && liftedBottom > 44 ? ({ '--ph-bottom': `${liftedBottom}px` } as React.CSSProperties) : undefined}
      data-testid="page-helper"
      data-open={open ? 'true' : 'false'} data-expanded={expanded ? 'true' : 'false'}>
      {open && expanded && <div className="ph-backdrop" data-testid="helper-backdrop" onClick={() => setHelperExpanded(false)} />}
      {open && (
        <section
          className={`ph-card ${expanded ? 'ph-card--expanded' : ''}`}
          data-testid="helper-card"
          role="dialog"
          aria-modal={expanded}
          aria-label="Desk helper"
        >
          <header className="ph-head">
            <div className="ph-head-text">
              <strong className="ph-title">Desk helper</strong>
              <span className="ph-subtitle" data-testid="helper-subtitle">{chat.title}</span>
            </div>
            {modeChip}
            <button
              type="button"
              className="ph-icon-btn"
              data-testid="helper-expand"
              onClick={() => setHelperExpanded(!expanded)}
              aria-label={expanded ? 'Back to the small card' : 'Open bigger'}
              title={expanded ? 'Back to the small card (Esc)' : 'Open bigger'}
            >
              {expanded ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            </button>
            <button type="button" className="ph-icon-btn" data-testid="helper-close" onClick={() => setHelperOpen(false)} aria-label="Close helper" title="Close">
              <X size={16} aria-hidden="true" />
            </button>
          </header>
          <ChatBody
            chat={chat}
            onNavigate={go}
            emptyChips={<Chips chat={chat} limit={3} onPick={chat.send} />}
          />
          <footer className="ph-foot">
            {chat.turns.length > 0 && <Chips chat={chat} limit={3} onPick={chat.send} />}
            <ChatInput chat={chat} autoFocus />
            <ModeNote aiMode={chat.aiMode} />
          </footer>
        </section>
      )}
      <button
        ref={capsuleRef}
        type="button"
        className={`ph-capsule ${open ? 'ph-capsule--open' : ''}`}
        data-testid={open ? 'helper-capsule-close' : 'helper-open'}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={open ? 'Close the desk helper' : 'Ask about this page'}
        onClick={() => setHelperOpen(!open)}
      >
        {open ? <><ChevronDown size={18} aria-hidden="true" /> Close</> : <><MessageCircle size={18} aria-hidden="true" /> Ask about this page</>}
      </button>
    </div>
  );
}
