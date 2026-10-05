import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  ShieldAlert,
  Play,
  Copy,
  Check,
  ExternalLink,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  Clock,
  Sparkles,
  KeyRound,
  FileCheck2,
  HelpCircle,
  RefreshCw,
  Layers
} from 'lucide-react';
import { REGCHECK_WATCHLIST } from '../../domain/regcheck/watchlist';
import type {
  RegcheckReport,
  RegcheckItem,
  RegcheckNewItem,
  WatchItem
} from '../../domain/regcheck/types';
import {
  runRegulationCheck,
  DEFAULT_CLAUDE_MODEL,
  THOROUGH_CLAUDE_MODEL,
  ClaudeModelChoice
} from '../../domain/regcheck/claudeClient';
import {
  getStoredAnthropicApiKey,
  setStoredAnthropicApiKey,
  clearStoredAnthropicApiKey,
  getLastRegcheckReport,
  saveLastRegcheckReport,
  clearLastRegcheckReport,
  getDaysSinceChecked,
  isRegcheckStale
} from '../../domain/regcheck/storage';
import { FIXTURE_REGCHECK_REPORT } from '../../domain/regcheck/fixture';
import { showToast } from '../../app/DeskToastContainer';
import './regulationCheck.css';

export function generateFixHandoff(report: RegcheckReport): string {
  const changedItems = report.items.filter(i => i.status === 'CHANGED');
  const newItems = report.newItems;

  const lines: string[] = [];
  lines.push(`# REGULATION CHECK FIX HANDOFF — ${report.checkedAt}`);
  lines.push(`Checked model: ${report.model}`);
  lines.push(`Summary: ${report.summary}`);
  lines.push('');

  lines.push('## CHANGED ITEMS');
  if (changedItems.length === 0) {
    lines.push('None.');
  } else {
    changedItems.forEach((item, idx) => {
      const watch = REGCHECK_WATCHLIST.find(w => w.id === item.watchId);
      lines.push(`${idx + 1}. [Watch ID: ${item.watchId}] ${watch?.topic || ''}`);
      lines.push(`   Current App Claim: ${watch?.claim || 'N/A'}`);
      lines.push(`   App Impact: ${watch?.appImpact || 'N/A'}`);
      lines.push(`   Finding: ${item.finding}`);
      item.evidence.forEach(ev => {
        lines.push(`   - Evidence: "${ev.quote}"`);
        lines.push(`     URL: ${ev.url}`);
        lines.push(`     Date: ${ev.date || 'Unspecified'} | Publisher: ${ev.publisher}`);
      });
      lines.push('');
    });
  }

  lines.push('## NEW REGULATORY ITEMS');
  if (newItems.length === 0) {
    lines.push('None.');
  } else {
    newItems.forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.title}`);
      lines.push(`   Finding: ${item.finding}`);
      lines.push(`   App Impact: ${item.appImpact}`);
      item.evidence.forEach(ev => {
        lines.push(`   - Evidence: "${ev.quote}"`);
        lines.push(`     URL: ${ev.url}`);
        lines.push(`     Date: ${ev.date || 'Unspecified'} | Publisher: ${ev.publisher}`);
      });
      lines.push('');
    });
  }

  lines.push('## INSTRUCTION FOR DEVELOPER AGENT');
  lines.push('Update scripts/route-audit/rules.mjs accordingly, run npm run routes:generate, routes:check-quotes, routes:spot-checks, tsc, vitest; do not push to main.');
  return lines.join('\n');
}

export function RegulationCheckScreen() {
  const [apiKey, setApiKey] = useState('');
  const [savedKey, setSavedKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState<ClaudeModelChoice>(DEFAULT_CLAUDE_MODEL);
  const [report, setReport] = useState<RegcheckReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedHandoff, setCopiedHandoff] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Watchlist lookup map for instant metadata retrieval
  const watchMap = useMemo(() => {
    const map = new Map<string, WatchItem>();
    for (const item of REGCHECK_WATCHLIST) {
      map.set(item.id, item);
    }
    return map;
  }, []);

  // Initialize from storage or URL fixture parameter
  useEffect(() => {
    const key = getStoredAnthropicApiKey();
    setSavedKey(key);
    setApiKey(key);

    // Check for fixture URL param (?regcheckFixture=1 or ?fixture=1)
    const urlParams = new URLSearchParams(window.location.search || window.location.hash.split('?')[1] || '');
    if (urlParams.get('regcheckFixture') === '1' || urlParams.get('fixture') === '1') {
      setReport(FIXTURE_REGCHECK_REPORT);
      return;
    }

    const storedReport = getLastRegcheckReport();
    if (storedReport) {
      setReport(storedReport);
    }
  }, []);

  // Elapsed timer while running
  useEffect(() => {
    if (isRunning) {
      setElapsedSeconds(0);
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  const handleSaveKey = () => {
    const trimmed = apiKey.trim();
    setStoredAnthropicApiKey(trimmed);
    setSavedKey(trimmed);
    showToast('Anthropic API key saved to browser storage');
  };

  const handleClearKey = () => {
    clearStoredAnthropicApiKey();
    setSavedKey('');
    setApiKey('');
    showToast('Anthropic API key cleared');
  };

  const handleRunCheck = async () => {
    if (!savedKey) {
      setErrorMessage('Please save a valid Anthropic API key before running the check.');
      return;
    }

    setIsRunning(true);
    setErrorMessage(null);

    try {
      const result = await runRegulationCheck({
        apiKey: savedKey,
        model
      });
      setReport(result);
      saveLastRegcheckReport(result);
      showToast('✓ Regulation check complete');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Regulation check failed');
      showToast(`Regulation check error: ${err?.message || 'Execution failed'}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopyHandoff = () => {
    if (!report) return;
    const handoffText = generateFixHandoff(report);
    navigator.clipboard.writeText(handoffText);
    setCopiedHandoff(true);
    showToast('Fix handoff instructions copied to clipboard');
    setTimeout(() => setCopiedHandoff(false), 2500);
  };

  const handleLoadFixture = () => {
    setReport(FIXTURE_REGCHECK_REPORT);
    setErrorMessage(null);
    showToast('Loaded fixture report (1 Changed · 1 New · 1 Unclear · 26 Still Correct)');
  };

  const handleClearReport = () => {
    clearLastRegcheckReport();
    setReport(null);
    showToast('Cleared regulation check report');
  };

  // Status breakdown
  const changedItems = useMemo(() => report?.items.filter(i => i.status === 'CHANGED') || [], [report]);
  const unclearItems = useMemo(() => report?.items.filter(i => i.status === 'UNCLEAR') || [], [report]);
  const stillCorrectItems = useMemo(() => report?.items.filter(i => i.status === 'STILL_CORRECT') || [], [report]);
  const newItems = report?.newItems || [];

  const daysAgo = report ? getDaysSinceChecked(report.checkedAt) : null;
  const isStale = isRegcheckStale(report);

  return (
    <div className="regcheck-container">
      {/* Header Section */}
      <div className="regcheck-header">
        <div className="regcheck-header-top">
          <div className="regcheck-title-area">
            <div className="eyebrow" style={{ color: 'var(--color-primary)' }}>
              STATUTORY GOVERNANCE & PRIMARY SOURCE VERIFICATION
            </div>
            <h1 className="regcheck-title">
              <ShieldAlert size={26} color="var(--color-primary)" />
              Regulation check
            </h1>
            <p className="regcheck-subtitle">
              Weekly check that the app's regulatory rules, national registry routes, and statutory facts still match the law.
            </p>
          </div>

          <div className="regcheck-actions-bar">
            {report ? (
              <span className={`regcheck-last-run-badge ${isStale ? 'stale' : ''}`}>
                <Clock size={14} />
                <span>
                  Last run: {new Date(report.checkedAt).toLocaleDateString()} ({daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`})
                </span>
                {isStale && <span className="regcheck-amber-dot" title="Run is older than 7 days" />}
              </span>
            ) : (
              <span className="regcheck-last-run-badge stale">
                <AlertTriangle size={14} />
                <span>Never run</span>
                <span className="regcheck-amber-dot" />
              </span>
            )}

            <button
              type="button"
              className="btn btn-primary"
              style={{ minHeight: '38px', padding: '0 16px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
              onClick={handleRunCheck}
              disabled={isRunning || !savedKey}
              title={!savedKey ? 'Please enter and save your Anthropic API key first' : 'Run regulatory verification check'}
            >
              {isRunning ? (
                <>
                  <span className="regcheck-spinner" />
                  <span>Running check… ({elapsedSeconds}s)</span>
                </>
              ) : (
                <>
                  <Play size={14} fill="currentColor" />
                  <span>Run check</span>
                </>
              )}
            </button>

            {report && (
              <button
                type="button"
                className="btn btn-secondary"
                style={{ minHeight: '38px', padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={handleCopyHandoff}
                title="Copy plain-text handoff instructions for developer agent"
              >
                {copiedHandoff ? <Check size={14} color="var(--color-status-pass-border)" /> : <Copy size={14} />}
                <span>{copiedHandoff ? 'Copied handoff!' : 'Copy fix handoff'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Settings Area */}
        <div className="regcheck-config-card">
          <div className="regcheck-config-row">
            <div className="regcheck-key-form">
              <span style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <KeyRound size={14} />
                Anthropic API Key:
              </span>
              <div className="regcheck-key-input-wrap">
                <input
                  type={showKey ? 'text' : 'password'}
                  className="regcheck-input"
                  placeholder="sk-ant-api03-..."
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  className="regcheck-visibility-toggle"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                >
                  {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '6px 12px', fontSize: '12px' }}
                onClick={handleSaveKey}
                disabled={!apiKey.trim() || apiKey === savedKey}
              >
                Save
              </button>
              {savedKey && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={handleClearKey}
                >
                  Clear
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div className="regcheck-model-toggle">
                <button
                  type="button"
                  className={`regcheck-model-btn ${model === DEFAULT_CLAUDE_MODEL ? 'active' : ''}`}
                  onClick={() => setModel(DEFAULT_CLAUDE_MODEL)}
                >
                  Standard (Sonnet 3.7)
                </button>
                <button
                  type="button"
                  className={`regcheck-model-btn ${model === THOROUGH_CLAUDE_MODEL ? 'active' : ''}`}
                  onClick={() => setModel(THOROUGH_CLAUDE_MODEL)}
                >
                  Thorough (Opus 3.7)
                </button>
              </div>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ padding: '6px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                onClick={handleLoadFixture}
                title="Load sample regulatory check fixture report for testing"
              >
                <RefreshCw size={12} />
                <span>Load fixture</span>
              </button>

              {report && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '6px 10px', fontSize: '12px', color: 'var(--color-text-secondary)' }}
                  onClick={handleClearReport}
                  title="Clear the current report from memory and local storage"
                >
                  Clear report
                </button>
              )}
            </div>
          </div>

          <div className="regcheck-config-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={13} />
              <span>Your key is stored only in this browser and sent only to <code>api.anthropic.com</code>.</span>
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', gap: '3px', marginLeft: '6px' }}
              >
                Get API key at console.anthropic.com <ExternalLink size={11} />
              </a>
            </div>
            <div style={{ fontStyle: 'italic' }}>
              Estimated cost: about €1–3 per run (~25 web search & fetch calls).
            </div>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {errorMessage && (
        <div style={{
          padding: '14px 18px',
          background: 'var(--color-status-neg-bg, rgba(239,68,68,0.08))',
          border: '1px solid var(--color-status-neg-border, #ef4444)',
          borderRadius: '8px',
          color: 'var(--color-status-neg-text, #ef4444)',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Setup Guide when no key configured and no report */}
      {!savedKey && !report && (
        <div className="regcheck-setup-panel">
          <h2 className="regcheck-setup-title">
            <Sparkles size={18} color="var(--color-primary)" />
            How the weekly regulation check works
          </h2>
          <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
            Every Monday morning, click <strong>Run check</strong>. The desk connects directly to Claude via the Anthropic API,
            empowered with server-side web search and official document fetch tools, to inspect the latest statutory registers across 28 European jurisdictions.
          </p>
          <div className="regcheck-setup-steps">
            <div className="regcheck-setup-step">
              <span className="regcheck-step-num">Step 1</span>
              <div style={{ fontWeight: 600 }}>Obtain an Anthropic API Key</div>
              <div className="mut">
                Create an API key in your Anthropic Console account with permissions to invoke the Messages API.
              </div>
            </div>
            <div className="regcheck-setup-step">
              <span className="regcheck-step-num">Step 2</span>
              <div style={{ fontWeight: 600 }}>Store Key Locally</div>
              <div className="mut">
                Paste your key into the masked input above and click Save. It stays in your browser's localStorage.
              </div>
            </div>
            <div className="regcheck-setup-step">
              <span className="regcheck-step-num">Step 3</span>
              <div style={{ fontWeight: 600 }}>Execute Weekly Run</div>
              <div className="mut">
                Claude scans 18 statutory facts and 10 open market questions against primary regulatory sources and reports changes.
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleLoadFixture}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <RefreshCw size={13} />
              <span>Preview sample audit report (No API key needed)</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Running Indicator */}
      {isRunning && (
        <div className="regcheck-running-card">
          <div className="regcheck-spinner" style={{ width: '28px', height: '28px', borderWidth: '3px', borderColor: 'var(--color-primary)' }} />
          <div style={{ fontWeight: 600, fontSize: '16px' }}>Executing Statutory Regulation Check…</div>
          <div className="mut" style={{ maxWidth: '600px', fontSize: '13px' }}>
            Claude is querying official gas registries, AIB, ERGaR, and ministerial portals via web search and web fetch.
            Elapsed time: <span className="num" style={{ fontWeight: 700 }}>{elapsedSeconds}s</span>. This usually takes 1 to 2 minutes.
          </div>
        </div>
      )}

      {/* Report Section */}
      {report && (
        <>
          {/* Summary Bar */}
          <div className="regcheck-summary-bar">
            <div className="regcheck-summary-text">
              <FileCheck2 size={18} color="var(--color-primary)" />
              <span>Audit Summary: {report.summary}</span>
            </div>
            <div className="regcheck-summary-chips">
              <span className="chip" style={{
                background: changedItems.length > 0 ? 'var(--color-status-neg-bg, rgba(239,68,68,0.1))' : 'var(--color-surface)',
                color: changedItems.length > 0 ? 'var(--color-status-neg-text, #ef4444)' : 'var(--color-text-secondary)',
                border: changedItems.length > 0 ? '1px solid var(--color-status-neg-border, #ef4444)' : '1px solid var(--color-border)',
                fontWeight: 600
              }}>
                {changedItems.length} changed
              </span>
              <span className="chip" style={{
                background: newItems.length > 0 ? 'rgba(59,130,246,0.1)' : 'var(--color-surface)',
                color: newItems.length > 0 ? '#3b82f6' : 'var(--color-text-secondary)',
                border: newItems.length > 0 ? '1px solid #3b82f6' : '1px solid var(--color-border)',
                fontWeight: 600
              }}>
                {newItems.length} new
              </span>
              <span className="chip" style={{
                background: unclearItems.length > 0 ? 'var(--color-status-warn-bg, rgba(245,158,11,0.1))' : 'var(--color-surface)',
                color: unclearItems.length > 0 ? 'var(--color-status-warn-text, #f59e0b)' : 'var(--color-text-secondary)',
                border: unclearItems.length > 0 ? '1px solid var(--color-status-warn-border, #f59e0b)' : '1px solid var(--color-border)',
                fontWeight: 600
              }}>
                {unclearItems.length} unclear
              </span>
              <span className="chip" style={{
                background: 'var(--color-status-pass-bg, rgba(16,185,129,0.1))',
                color: 'var(--color-status-pass-text, #10b981)',
                border: '1px solid var(--color-status-pass-border, #10b981)',
                fontWeight: 600
              }}>
                {stillCorrectItems.length} still correct
              </span>
            </div>
          </div>

          {/* 1. CHANGED SECTION */}
          {changedItems.length > 0 && (
            <div className="regcheck-section">
              <div className="regcheck-section-header">
                <h2 className="regcheck-section-title changed">
                  <AlertTriangle size={16} />
                  Changed Regulations & Registries ({changedItems.length})
                </h2>
              </div>
              <div className="regcheck-card-list">
                {changedItems.map(item => (
                  <ItemCard key={item.watchId} item={item} watch={watchMap.get(item.watchId)} />
                ))}
              </div>
            </div>
          )}

          {/* 2. NEW ITEMS SECTION */}
          {newItems.length > 0 && (
            <div className="regcheck-section">
              <div className="regcheck-section-header">
                <h2 className="regcheck-section-title new">
                  <Sparkles size={16} />
                  New Regulatory Developments ({newItems.length})
                </h2>
              </div>
              <div className="regcheck-card-list">
                {newItems.map((newItem, idx) => (
                  <NewItemCard key={idx} item={newItem} />
                ))}
              </div>
            </div>
          )}

          {/* 3. UNCLEAR SECTION */}
          {unclearItems.length > 0 && (
            <div className="regcheck-section">
              <div className="regcheck-section-header">
                <h2 className="regcheck-section-title unclear">
                  <HelpCircle size={16} />
                  Unclear or Unconfirmed Items ({unclearItems.length})
                </h2>
              </div>
              <div className="regcheck-card-list">
                {unclearItems.map(item => (
                  <ItemCard key={item.watchId} item={item} watch={watchMap.get(item.watchId)} />
                ))}
              </div>
            </div>
          )}

          {/* 4. STILL CORRECT SECTION (Collapsed by default) */}
          <div className="regcheck-section">
            <details className="regcheck-details">
              <summary>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                  <span className="regcheck-section-title still-correct">
                    Still Correct Facts ({stillCorrectItems.length})
                  </span>
                </span>
                <span className="mut" style={{ fontSize: '12px' }}>Click to expand/collapse</span>
              </summary>
              <div className="regcheck-details-body">
                {stillCorrectItems.map(item => (
                  <ItemCard key={item.watchId} item={item} watch={watchMap.get(item.watchId)} />
                ))}
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}

interface ItemCardProps {
  item: RegcheckItem;
  watch?: WatchItem;
}

function ItemCard({ item, watch }: ItemCardProps) {
  const statusClass = item.status === 'CHANGED' ? 'changed' : item.status === 'UNCLEAR' ? 'unclear' : 'still-correct';

  return (
    <div className={`regcheck-item-card ${statusClass}`}>
      <div className="regcheck-item-top">
        <h3 className="regcheck-item-topic">
          {watch?.topic || item.watchId}
        </h3>
        <span className="chip" style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          fontWeight: 700,
          background: item.status === 'CHANGED' ? 'var(--color-status-neg-bg)' : item.status === 'UNCLEAR' ? 'var(--color-status-warn-bg)' : 'var(--color-status-pass-bg)',
          color: item.status === 'CHANGED' ? 'var(--color-status-neg-text)' : item.status === 'UNCLEAR' ? 'var(--color-status-warn-text)' : 'var(--color-status-pass-text)',
          border: item.status === 'CHANGED' ? '1px solid var(--color-status-neg-border)' : item.status === 'UNCLEAR' ? '1px solid var(--color-status-warn-border)' : '1px solid var(--color-status-pass-border)'
        }}>
          {item.status.replace(/_/g, ' ')}
        </span>
      </div>

      {watch && (
        <div className="regcheck-claim-box">
          <div className="regcheck-claim-label">App's Stored Claim:</div>
          <div>{watch.claim}</div>
        </div>
      )}

      <div className="regcheck-finding-box">
        <strong>Finding:</strong> {item.finding}
      </div>

      {item.evidence && item.evidence.length > 0 && (
        <div>
          {item.evidence.map((ev, i) => (
            <div key={i} style={{ marginTop: i > 0 ? '8px' : '2px' }}>
              <blockquote className="regcheck-quote">
                "{ev.quote}"
              </blockquote>
              <div className="regcheck-evidence-meta">
                <span><strong>Publisher:</strong> {ev.publisher}</span>
                {ev.date && <span><strong>Date:</strong> {ev.date}</span>}
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="regcheck-evidence-link"
                >
                  {ev.url} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {watch?.appImpact && (
        <div className="regcheck-impact-line">
          <strong>Trading Desk Impact:</strong> {watch.appImpact}
        </div>
      )}
    </div>
  );
}

interface NewItemCardProps {
  item: RegcheckNewItem;
}

function NewItemCard({ item }: NewItemCardProps) {
  return (
    <div className="regcheck-item-card new">
      <div className="regcheck-item-top">
        <h3 className="regcheck-item-topic" style={{ color: '#2563eb' }}>
          {item.title}
        </h3>
        <span className="chip" style={{
          textTransform: 'uppercase',
          fontSize: '11px',
          fontWeight: 700,
          background: 'rgba(59,130,246,0.1)',
          color: '#2563eb',
          border: '1px solid #3b82f6'
        }}>
          NEW REGULATION
        </span>
      </div>

      <div className="regcheck-finding-box">
        <strong>Finding:</strong> {item.finding}
      </div>

      {item.evidence && item.evidence.length > 0 && (
        <div>
          {item.evidence.map((ev, i) => (
            <div key={i} style={{ marginTop: i > 0 ? '8px' : '2px' }}>
              <blockquote className="regcheck-quote">
                "{ev.quote}"
              </blockquote>
              <div className="regcheck-evidence-meta">
                <span><strong>Publisher:</strong> {ev.publisher}</span>
                {ev.date && <span><strong>Date:</strong> {ev.date}</span>}
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="regcheck-evidence-link"
                >
                  {ev.url} <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {item.appImpact && (
        <div className="regcheck-impact-line">
          <strong>Trading Desk Impact:</strong> {item.appImpact}
        </div>
      )}
    </div>
  );
}
