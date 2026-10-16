import React, { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUp, Check, ChevronDown, Copy, Maximize2, MessageCircle, Minimize2, Square, X } from 'lucide-react';
import { Sheet } from '../../shared/ui/Sheet';
import { useIsMobile } from '../../shared/hooks/useMediaQuery';
import { getStoredAnthropicApiKey } from '../../domain/regcheck/claudeClient';
import { getStoredGeminiApiKey } from '../../domain/regcheck/storage';
import { getAssumption } from '../../domain/assumptions/registry';
import { useAssumptionsVersion } from '../../shared/hooks/useAssumptionsVersion';
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
  helperBudgetNote,
  helperOfflineNote,
  helperPrivacyNote,
  buildSuggestedQuestions,
  formatUserTurn,
  offlineAnswer,
  parseAnswer,
  type HelperTurn,
} from '../../domain/help/helperLogic';
import { askHelperStream } from '../../domain/help/helperClient';
import { askGeminiStream } from '../../domain/help/geminiHelperClient';
import { currentHelperModel, setHelperProvider, type HelperModel } from '../../domain/help/helperModels';
import { addTodaySpendUsd, dailyCapReached, dailyCapUsd, formatUsd, getTodaySpendUsd, subscribeTodaySpend } from '../../domain/help/helperCost';
import { addStagedMemory, appendHelperTurn, getHelperSnapshot, setHelperExpanded, setHelperOpen, setHelperViewing, setStagedRun, useHelperStore, type StagedMemoryRule } from './helperStore';
import { StagedMarksCard } from './StagedMarksCard';
import { StagedMemoryCard } from './StagedMemoryCard';
import type { BrokerParseResult } from '../../domain/markets/brokerRunParser';
import './helper.css';

/** The saved key for a model's provider ("" when none). */
function storedKeyFor(model: HelperModel): string {
  return (model.provider === 'google' ? getStoredGeminiApiKey() : getStoredAnthropicApiKey()).trim();
}
const providerName = (model: HelperModel) => (model.provider === 'google' ? 'Google' : 'Anthropic');
const keyName = (model: HelperModel) => (model.provider === 'google' ? 'Gemini' : 'Claude');

/** Estimated AI spend so far today on this device (re-renders when an answer adds to it). */
export function useTodaySpend(): number {
  return useSyncExternalStore(subscribeTodaySpend, getTodaySpendUsd, getTodaySpendUsd);
}

/** The route of the general desk chat (AskDeskScreen). */
export const ASK_ROUTE = '/ask';

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

export interface Chat {
  pageKey: string;
  guide: PageGuide | undefined;
  title: string;
  aiMode: boolean;
  /** The model that will answer, and which key it needs ("Claude" or "Gemini"), for the offline note. */
  model: HelperModel;
  keyName: string;
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
  stagedRun: BrokerParseResult | null;
  clearStagedRun: () => void;
  /** Memory rules proposed by the helper, waiting for the trader. */
  stagedMemory: readonly StagedMemoryRule[];
}

function titleFor(key: string): string {
  return getPageGuide(key)?.title ?? key;
}

/**
 * Conversation state for the page the trader is on: AI or offline answers, per-page history, suggestions.
 * On #/ask the "page" is the general desk chat, so the same hook drives the Ask the desk screen.
 */
export function useHelperChat(): Chat {
  const { pathname, search } = useLocation();
  const store = useHelperStore();
  const stagedRun = store.stagedRun;
  const contextVersion = useSyncExternalStore(subscribePageContext, getPageContextVersion, getPageContextVersion);
  const online = useSyncExternalStore(subscribeOnline, getOnline, () => true);
  const [busy, setBusy] = useState(false);
  const [liveText, setLiveText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const app = useOptionalAppState();
  const appRef = useRef(app);
  useEffect(() => { appRef.current = app; }, [app]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const pageKey = canonicalRoute(pathname);
  const guide = getPageGuide(pathname);
  useAssumptionsVersion(); // the chosen model can change on Ask the desk or on #/pricing

  // Smart auto-fallback: if currently on Anthropic but no Claude key is saved
  // while a Gemini key IS saved, automatically switch provider to Google (Gemini)
  useEffect(() => {
    const m = currentHelperModel();
    if (m.provider === 'anthropic' && !getStoredAnthropicApiKey().trim() && getStoredGeminiApiKey().trim()) {
      setHelperProvider('google');
    }
  }, []);

  const model = currentHelperModel();
  const aiMode = Boolean(storedKeyFor(model)) && online;

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

    const model = currentHelperModel();
    const key = storedKeyFor(model);
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

    const cap = dailyCapUsd();
    if (cap !== null && dailyCapReached()) {
      const answer = offlineAnswer(question, guide, live);
      appendHelperTurn(pageKey, {
        id: nextId(),
        role: 'offline',
        text: answer.lines.join('\n'),
        termIds: answer.glossary.map(g => g.id),
        budgetNote: helperBudgetNote(cap),
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
    const ask = model.provider === 'google' ? askGeminiStream : askHelperStream;
    ask({
      apiKey: key,
      model: model.id,
      webSearch: getAssumption('helper.webSearch') >= 1,
      route: pageKey,
      guide,
      history,
      question,
      context: live,
      toolCtx: {
        marks: state.marks,
        costs: state.costs,
        pricingBook: state.pricingBook,
        onStageMarks: (res: BrokerParseResult) => setStagedRun(res),
        onStageMemory: rule => addStagedMemory(rule),
      },
      // Spend counts as each round completes, so a stopped or failed answer still counts toward the daily cap.
      onSpend: usd => addTodaySpendUsd(usd),
      budgetReached: () => dailyCapReached(),
      signal: controller.signal,
      onText: delta => { streamed += delta; setLiveText(streamed); },
      onStatus: setStatus,
    })
      .then(answer => {
        appendHelperTurn(pageKey, { id: nextId(), role: 'assistant', text: answer.text, sources: answer.sources, model: model.name, costUsd: answer.costUsd });
      })
      .catch((err: unknown) => {
        const isAbort =
          (err instanceof Error && (err.name === 'AbortError' || err.message === 'Stopped.')) ||
          err === 'Stopped.';
        // Keep whatever was already written when the trader stops or the stream fails midway.
        if (streamed.trim()) {
          appendHelperTurn(pageKey, { id: nextId(), role: 'assistant', text: streamed.trim(), model: model.name });
        }
        if (!isAbort) {
          appendHelperTurn(pageKey, { id: nextId(), role: 'error', text: err instanceof Error ? err.message : 'The helper could not answer.' });
        }
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
    model,
    keyName: keyName(model),
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
    stagedRun,
    clearStagedRun: () => setStagedRun(null),
    stagedMemory: store.stagedMemory,
  };
}

// ── Rendering ───────────────────────────────────────────────────────────────

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

/** Inline `code` inside runs of text. */
function InlineCode({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]{1,120}`)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('`') && p.endsWith('`') && p.length > 2 ? (
          <code key={i} className="ph-code">{p.slice(1, -1)}</code>
        ) : (
          <Linked key={i} text={p} />
        )
      )}
    </>
  );
}

/** Clean raw LaTeX formulas into legible mathematical typography. */
export function cleanMathText(text: string): string {
  if (!text) return '';
  return text
    // Replace LaTeX text macros
    .replace(/\\(?:text|mathrm|mathbf|mathit)\{([^}]+)\}/g, '$1')
    // Brackets
    .replace(/\\left\s*\[/g, '[')
    .replace(/\\right\s*\]/g, ']')
    .replace(/\\left\s*\(/g, '(')
    .replace(/\\right\s*\)/g, ')')
    // Common operators and greek symbols
    .replace(/\\times/g, '×')
    .replace(/\\cdot/g, '·')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\pm/g, '±')
    .replace(/\\leq/g, '≤')
    .replace(/\\geq/g, '≥')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\to/g, '→')
    .replace(/\\approx/g, '≈')
    .replace(/\\%/g, '%')
    .replace(/\\_/g, '_')
    // Chemistry & common subscripts
    .replace(/CO_2/g, 'CO₂')
    .replace(/CH_4/g, 'CH₄')
    .replace(/N_2O/g, 'N₂O')
    .replace(/_\{([^}]+)\}/g, ' ($1)')
    .replace(/\^\{([^}]+)\}/g, '^$1');
}

/** Inline math `$formula$` cleaned and rendered with math badge. */
function InlineMath({ text }: { text: string }) {
  const parts = text.split(/(\$[^$\n]{1,160}\$)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('$') && p.endsWith('$') && p.length > 2 ? (
          <span key={i} className="ph-math">{cleanMathText(p.slice(1, -1))}</span>
        ) : (
          <InlineCode key={i} text={p} />
        )
      )}
    </>
  );
}

/** **bold** inside a run of text, preserving inline math, code and links. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*\n]{1,240}\*\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') && p.length > 4 ? (
          <strong key={i}><InlineMath text={p.slice(2, -2)} /></strong>
        ) : (
          <InlineMath key={i} text={p} />
        )
      )}
    </>
  );
}

/** Markdown links `[label](url)`, inline code, bold, and bare URLs. */
function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\[[^\]\n]{1,120}\]\(https?:\/\/[^\s)]+\))/g);
  return (
    <>
      {parts.map((p, i) => {
        const linkMatch = p.match(/^\[([^\]\n]{1,120})\]\((https?:\/\/[^\s)]+)\)$/);
        if (linkMatch) {
          const [, label, url] = linkMatch;
          return (
            <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="ph-md-link">
              {label}
            </a>
          );
        }
        return <Inline key={i} text={p} />;
      })}
    </>
  );
}

/** Text with "[[go:/route|Label]]" turned into buttons and markdown formatted. */
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
        return <MarkdownText key={i} text={s.text} />;
      })}
    </>
  );
}

export type AnswerBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'divider' }
  | { kind: 'code'; code: string; lang?: string }
  | { kind: 'formula'; formula: string }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'paragraph'; text: string };

const TABLE_LINE = /^\s*\|.*\|\s*$/;
const TABLE_RULE = /^:?-{2,}:?$/;

/** Split an answer into text runs and "| a | b |" tables (preserved for backwards-compatibility). */
export function splitTables(text: string): ({ kind: 'text'; text: string } | { kind: 'table'; rows: string[][] })[] {
  const out: ({ kind: 'text'; text: string } | { kind: 'table'; rows: string[][] })[] = [];
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

/** Parses markdown headings, dividers, code blocks, formulas, tables, lists, and paragraphs. */
export function parseAnswerBlocks(text: string): AnswerBlock[] {
  const blocks: AnswerBlock[] = [];
  const lines = text.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Blank line: skip
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced code block: ``` ... ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ kind: 'code', code: codeLines.join('\n'), lang: lang || undefined });
      continue;
    }

    // 3. Block formula: $$ ... $$
    if (trimmed.startsWith('$$')) {
      if (trimmed.length > 4 && trimmed.endsWith('$$') && trimmed.indexOf('$$', 2) === trimmed.length - 2) {
        blocks.push({ kind: 'formula', formula: trimmed.slice(2, -2).trim() });
        i++;
        continue;
      }
      const formulaLines: string[] = [trimmed.slice(2)];
      i++;
      while (i < lines.length && !lines[i].trim().includes('$$')) {
        formulaLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        formulaLines.push(lines[i].replace(/\$\$.*$/, ''));
        i++;
      }
      blocks.push({ kind: 'formula', formula: formulaLines.join(' ').trim() });
      continue;
    }

    // 4. Horizontal rule: --- or ***
    if (/^[-*_]{3,}$/.test(trimmed)) {
      blocks.push({ kind: 'divider' });
      i++;
      continue;
    }

    // 5. Headings: #, ##, ###, ####
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        kind: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 6. Markdown Tables: | a | b |
    if (TABLE_LINE.test(line)) {
      const rows: string[][] = [];
      while (i < lines.length && TABLE_LINE.test(lines[i])) {
        const cells = lines[i].trim().slice(1, -1).split('|').map(c => c.trim());
        if (!cells.every(c => TABLE_RULE.test(c))) {
          rows.push(cells);
        }
        i++;
      }
      if (rows.length >= 2) {
        blocks.push({ kind: 'table', rows });
      } else {
        blocks.push({ kind: 'paragraph', text: rows.map(r => r.join(' | ')).join('\n') });
      }
      continue;
    }

    // 7. Bullet or Ordered Lists
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (bulletMatch || orderedMatch) {
      const isOrdered = Boolean(orderedMatch);
      const items: string[] = [];
      while (i < lines.length) {
        const curTrim = lines[i].trim();
        if (!curTrim) break;
        const b = curTrim.match(/^[-*•]\s+(.*)$/);
        const o = curTrim.match(/^\d+\.\s+(.*)$/);
        if (isOrdered && o) {
          items.push(o[1]);
          i++;
        } else if (!isOrdered && b) {
          items.push(b[1]);
          i++;
        } else if (lines[i].startsWith('  ') || lines[i].startsWith('\t')) {
          if (items.length > 0) {
            items[items.length - 1] += '\n' + curTrim;
          } else {
            items.push(curTrim);
          }
          i++;
        } else {
          break;
        }
      }
      blocks.push({ kind: 'list', ordered: isOrdered, items });
      continue;
    }

    // 8. Regular text paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const curTrim = lines[i].trim();
      if (!curTrim) break;
      if (
        curTrim.startsWith('```') ||
        curTrim.startsWith('$$') ||
        /^[-*_]{3,}$/.test(curTrim) ||
        /^#{1,6}\s+/.test(curTrim) ||
        TABLE_LINE.test(lines[i]) ||
        /^[-*•]\s+/.test(curTrim) ||
        /^\d+\.\s+/.test(curTrim)
      ) {
        break;
      }
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      blocks.push({ kind: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

/** An assistant answer: clean headings, structured paragraphs, styled tables, formula blocks, and links. */
export function AnswerView({ text, onNavigate }: { text: string; onNavigate: (to: string) => void }) {
  const blocks = parseAnswerBlocks(text);
  return (
    <div className="ph-answer" data-testid="helper-answer">
      {blocks.map((block, i) => {
        switch (block.kind) {
          case 'heading': {
            if (block.level <= 2) {
              return <h2 key={i} className="ph-h2"><RichText text={block.text} onNavigate={onNavigate} /></h2>;
            }
            if (block.level === 3) {
              return <h3 key={i} className="ph-h3"><RichText text={block.text} onNavigate={onNavigate} /></h3>;
            }
            return <h4 key={i} className="ph-h4"><RichText text={block.text} onNavigate={onNavigate} /></h4>;
          }
          case 'divider':
            return <hr key={i} className="ph-divider" />;
          case 'code':
            return (
              <pre key={i} className="ph-code-block">
                <code>{block.code}</code>
              </pre>
            );
          case 'formula':
            return (
              <div key={i} className="ph-formula-card">
                <strong>Formula:</strong> <code>{cleanMathText(block.formula)}</code>
              </div>
            );
          case 'table':
            return (
              <div key={i} className="ph-table-wrap">
                <table className="ph-table">
                  <thead>
                    <tr>
                      {block.rows[0].map((c, j) => (
                        <th key={j}><RichText text={c} onNavigate={onNavigate} /></th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.slice(1).map((r, k) => (
                      <tr key={k}>
                        {r.map((c, j) => (
                          <td key={j}><RichText text={c} onNavigate={onNavigate} /></td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'list': {
            if (block.ordered) {
              return (
                <ol key={i} className="ph-ol">
                  {block.items.map((it, idx) => (
                    <li key={idx}><RichText text={it} onNavigate={onNavigate} /></li>
                  ))}
                </ol>
              );
            }
            return (
              <ul key={i} className="ph-ul">
                {block.items.map((it, idx) => (
                  <li key={idx}><RichText text={it} onNavigate={onNavigate} /></li>
                ))}
              </ul>
            );
          }
          case 'paragraph':
          default:
            return (
              <p key={i} className="ph-p">
                <RichText text={block.text} onNavigate={onNavigate} />
              </p>
            );
        }
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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = useCallback(() => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  }, [text]);
  return (
    <button
      type="button"
      className="ph-copy-btn"
      data-testid="helper-copy"
      aria-label={copied ? 'Copied to clipboard' : 'Copy answer to clipboard'}
      title={copied ? 'Copied!' : 'Copy answer'}
      onClick={onCopy}
    >
      {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}

function Turn({ turn, onNavigate, onRetry }: { turn: HelperTurn; onNavigate: (to: string) => void; onRetry?: () => void }) {
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
        {turn.model && (
          <div className="ph-answered-by">
            <span data-testid="helper-answered-by">{turn.model}{turn.costUsd !== undefined && <span data-testid="helper-cost"> · ≈ {formatUsd(turn.costUsd)}</span>}</span>
            <CopyButton text={turn.text} />
          </div>
        )}
      </div>
    );
  }
  if (turn.role === 'error') {
    return (
      <div className="ph-msg ph-msg--error" role="alert" data-testid="helper-error">
        <div>{turn.text}</div>
        {onRetry && (
          <button
            type="button"
            className="ph-retry-btn"
            onClick={onRetry}
            style={{
              marginTop: '8px',
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '4px',
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ↻ Retry question
          </button>
        )}
      </div>
    );
  }
  const entries = (turn.termIds ?? []).map(id => GLOSSARY_BY_ID[id]).filter(Boolean);
  return (
    <div className="ph-msg" data-testid="helper-offline-answer">
      {turn.text && <AnswerView text={turn.text} onNavigate={onNavigate} />}
      {turn.budgetNote && (
        <p className="ph-note ph-budget-note" data-testid="helper-budget-note">
          {turn.budgetNote.split(' Change the cap')[0]}{' '}
          <Link to="/pricing?tab=assumptions">Change the cap on the Pricing desk.</Link>
        </p>
      )}
      {entries.map(e => (
        <div key={e.id} className="ph-term" data-testid={`helper-term-${e.id}`}>
          <strong>{e.term}</strong> — {e.short}{' '}
          <Link to={`/glossary?term=${e.id}`} onClick={() => onNavigate(`/glossary?term=${e.id}`)}>Open in glossary →</Link>
        </div>
      ))}
    </div>
  );
}

interface ChatBodyProps {
  chat: Chat;
  onNavigate: (to: string) => void;
  emptyChips?: React.ReactNode;
  /** 'desk' is the general chat on #/ask: its own empty state, no page overview, no previous-page link. */
  variant?: 'page' | 'desk';
  /** Replaces the greeting and overview when the conversation is empty. */
  emptyState?: React.ReactNode;
}

export function ChatBody({ chat, onNavigate, emptyChips, variant = 'page', emptyState }: ChatBodyProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const userScrolledUp = useRef(false);

  const onScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    userScrolledUp.current = distanceToBottom > 80;
  }, []);

  useEffect(() => {
    if (chat.busy) userScrolledUp.current = false;
  }, [chat.busy]);

  useEffect(() => {
    if (!userScrolledUp.current && typeof endRef.current?.scrollIntoView === 'function') {
      endRef.current.scrollIntoView({ block: 'end' });
    }
  }, [chat.turns.length, chat.busy, chat.liveText, chat.status]);

  return (
    <div className="ph-body" data-testid="helper-body" ref={bodyRef} onScroll={onScroll}>
      {chat.viewingPrevious && (
        <div className="ph-prev-banner">
          Previous page chat: {titleFor(chat.shownKey)}.{' '}
          <button type="button" className="ph-link" onClick={() => setHelperViewing(null)}>Back to this page</button>
        </div>
      )}
      {chat.turns.length === 0 && !chat.viewingPrevious && emptyState}
      {chat.turns.length === 0 && !chat.viewingPrevious && !emptyState && (
        <>
          <p className="ph-greeting" data-testid="helper-greeting">Ask about this page: what it shows, a term, or what to do next.</p>
          {emptyChips}
          <Overview guide={chat.guide} onNavigate={onNavigate} />
        </>
      )}
      {chat.turns.map((t, idx) => {
        let retryFn: (() => void) | undefined;
        if (t.role === 'error') {
          for (let i = idx - 1; i >= 0; i--) {
            if (chat.turns[i].role === 'user') {
              const q = chat.turns[i].text;
              retryFn = () => chat.send(q);
              break;
            }
          }
        }
        return <Turn key={t.id} turn={t} onNavigate={onNavigate} onRetry={retryFn} />;
      })}
      {chat.busy && chat.liveText && <div className="ph-msg" data-testid="helper-live"><AnswerView text={chat.liveText} onNavigate={onNavigate} /></div>}
      {chat.busy && (chat.status || !chat.liveText) && (
        <ThinkingLine status={chat.status ?? 'Thinking'} />
      )}
      {variant === 'page' && chat.previous && !chat.viewingPrevious && (
        <button type="button" className="ph-link ph-prev-link" data-testid="helper-previous" onClick={() => setHelperViewing(chat.previous!.key)}>
          Previous page chat ({chat.previous.title})
        </button>
      )}
      {chat.stagedRun && <StagedMarksCard stagedRun={chat.stagedRun} onDismiss={chat.clearStagedRun} />}
      {chat.stagedMemory.map((rule, i) => <StagedMemoryCard key={`${rule.subject}-${i}`} rule={rule} />)}
      <div ref={endRef} />
    </div>
  );
}

/** Seconds since the current question was sent, shown once the wait is long enough to wonder about. */
function useElapsedSeconds(): number {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  return seconds;
}

/** "Thinking…" with a pulsing dot and stepping dots, so a long Opus think visibly keeps going. */
function ThinkingLine({ status }: { status: string }) {
  const seconds = useElapsedSeconds();
  return (
    <div className="ph-msg ph-thinking" data-testid="helper-thinking" role="status" aria-live="polite">
      <span className="ph-pulse" aria-hidden="true" />
      <span>{status}</span>
      <span className="ph-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span>
      {seconds >= 3 && <span className="ph-elapsed">{seconds}s</span>}
    </div>
  );
}

export function Chips({ chat, onPick, limit }: { chat: Chat; onPick: (q: string) => void; limit: number }) {
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

export function ChatInput({ chat, autoFocus, placeholder = 'Ask about this page…' }: { chat: Chat; autoFocus?: boolean; placeholder?: string }) {
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
        placeholder={placeholder}
        aria-label={placeholder.replace(/…$/, '')}
        maxLength={2000}
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

export function ModeNote({ chat }: { chat: Chat }) {
  return chat.aiMode ? (
    <p className="ph-note" data-testid="helper-privacy">{helperPrivacyNote(providerName(chat.model))}</p>
  ) : (
    <p className="ph-note" data-testid="helper-offline-note">
      {helperOfflineNote(chat.keyName)} <Link to="/regulation-check">Open settings →</Link>
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

  // The general chat has its own screen at #/ask; the page capsule steps aside there.
  if (pageKey === ASK_ROUTE) return null;

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
              <ModeNote chat={chat} />
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
            <ModeNote chat={chat} />
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
