import React, { useState, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { showToast } from '../../app/DeskToastContainer';
import {
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
  clearStoredGeminiApiKey,
  isGeminiKeyPersisted,
  geminiKeyFingerprint,
} from '../../domain/regcheck/storage';
import { testGeminiApiKey } from '../../domain/auditor/geminiClient';
import './mobileSettings.css';

export function SettingsScreen() {
  const { state } = useAppState();
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [persistLocal, setPersistLocal] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ testing: boolean; valid?: boolean; message?: string } | null>(null);

  useEffect(() => {
    setApiKey(getStoredGeminiApiKey());
    setPersistLocal(isGeminiKeyPersisted());
  }, []);

  const handleSaveApiKey = () => {
    setStoredGeminiApiKey(apiKey, persistLocal);
    setSaveSuccess(true);
    showToast('Gemini API key updated successfully');
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleClearApiKey = () => {
    clearStoredGeminiApiKey();
    setApiKey('');
    setTestResult(null);
    showToast('Gemini API key cleared from browser storage');
  };

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) {
      setTestResult({ testing: false, valid: false, message: 'Please enter an API key first.' });
      return;
    }
    setTestResult({ testing: true });
    try {
      const res = await testGeminiApiKey(apiKey.trim());
      if (res.valid) {
        setTestResult({ testing: false, valid: true, message: `Key active: verified with Google (${res.model || 'Gemini 3.8 Flash'}).` });
      } else {
        setTestResult({ testing: false, valid: false, message: res.error || 'Key verification failed.' });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ testing: false, valid: false, message: `Error: ${msg}` });
    }
  };

  const originCode = state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK';
  const originName = PRODUCING_ORIGINS[originCode]?.countryName || 'Denmark';
  const savedKeyFingerprint = geminiKeyFingerprint(getStoredGeminiApiKey());

  return (
    <div className="set-page" style={{ flex: 1, minHeight: 0, overflowY: 'auto', backgroundColor: 'var(--color-bg)', padding: '24px' }}>
      <div style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Page Header */}
        <div className="set-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '2px solid var(--color-divider)' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 800 }} className="font-heading">
              Desk Settings &amp; Security
            </h1>
            <p style={{ margin: '4px 0 0', fontSize: '12px' }} className="mut">
              AI intelligence API keys, browser storage boundaries, trading defaults, and data backups.
            </p>
          </div>
          {saveSuccess && (
            <span style={{ fontSize: '12px', color: 'var(--color-status-pass-text, #15803d)', fontWeight: 700 }}>
              ✓ Settings Saved
            </span>
          )}
        </div>

        {/* SECTION 1: GEMINI API KEY & SECURITY NOTICE */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: apiKey ? 'var(--color-status-pass-text, #15803d)' : 'var(--color-status-review-text, #d97706)', flex: 'none' }} />
              <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }} className="font-heading">
                Google Gemini API Configuration
              </h2>
            </div>
            {savedKeyFingerprint && (
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--color-muted)' }}>
                Saved: {savedKeyFingerprint} ({persistLocal ? 'localStorage' : 'sessionStorage'})
              </span>
            )}
          </div>

          {/* Hardened Security Notice Box */}
          <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', borderRadius: 'var(--radius-control)', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-accent, #3b82f6)', fontWeight: 700, fontSize: '12px' }}>
              <span>🔒 Client-Side Browser Storage &amp; Privacy Notice</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.5, color: 'var(--color-text)' }}>
              Your Google Gemini API key is stored directly in your browser&apos;s <strong>sessionStorage</strong> (or opt-in <strong>localStorage</strong>) for local browser execution only.
              The key is <strong>never transmitted to any backend intermediary</strong> or stored on remote servers; all copilot inquiries, regulatory verifications, and compliance audits communicate directly from your browser to Google&apos;s API endpoints over encrypted HTTPS (TLS 1.3).
            </p>
          </div>

          {/* API Key Input and Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label htmlFor="gemini-api-key-input" style={{ fontSize: '12px', fontWeight: 700 }}>
              Gemini API Key
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                id="gemini-api-key-input"
                type="password"
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck="false"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '13px',
                  fontFamily: 'var(--font-mono, monospace)',
                  backgroundColor: 'var(--color-bg)',
                  border: '1px solid var(--color-divider)',
                  borderRadius: 'var(--radius-control)',
                  color: 'var(--color-text)',
                }}
              />
              <button
                type="button"
                onClick={handleSaveApiKey}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-control)' }}
              >
                Save Key
              </button>
              <button
                type="button"
                onClick={handleTestApiKey}
                disabled={testResult?.testing}
                className="btn btn-secondary"
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: 'var(--radius-control)' }}
              >
                {testResult?.testing ? 'Testing...' : 'Test Connection'}
              </button>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearApiKey}
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-control)', color: 'var(--color-status-fail-text, #dc2626)' }}
                >
                  Clear
                </button>
              )}
            </div>

            {/* Storage Persistence Preference */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', marginTop: '4px' }}>
              <input
                type="checkbox"
                checked={persistLocal}
                onChange={e => {
                  const checked = e.target.checked;
                  setPersistLocal(checked);
                  if (apiKey) {
                    setStoredGeminiApiKey(apiKey, checked);
                    showToast(checked ? 'Key will persist across browser sessions (localStorage)' : 'Key restricted to current session tab (sessionStorage)');
                  }
                }}
                style={{ cursor: 'pointer' }}
              />
              <span>Persist key in browser <code>localStorage</code> across sessions (uncheck for tab-only <code>sessionStorage</code>)</span>
            </label>

            {testResult?.message && (
              <div
                style={{
                  fontSize: '12px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-control)',
                  backgroundColor: testResult.valid ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: testResult.valid ? 'var(--color-status-pass-text, #15803d)' : 'var(--color-status-fail-text, #dc2626)',
                  border: `1px solid ${testResult.valid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                }}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 2: DESK TRADING DEFAULTS */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--color-status-pass-text, #15803d)', flex: 'none' }} />
            <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }} className="font-heading">
              Trading Desk Parameters &amp; Defaults
            </h2>
          </div>

          <div className="set-grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Pricing Side Mode
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-accent)', marginTop: '4px' }}>
                {state.marks.pricingSides.certificateSide.toUpperCase()} SIDE
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Controls whether netbacks evaluate off Bid, Mid, or Offer marks across all screens.
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Active Benchmark Origin
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                {originCode} ({originName})
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Default production origin loaded on opportunity scanner and trade tickets.
              </span>
            </div>

            <div style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-control)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span className="eyebrow">
                Regulatory Framework
              </span>
              <span className="num" style={{ fontSize: '14px', fontWeight: 800, marginTop: '4px' }}>
                RED III / UDB 2026
              </span>
              <span style={{ fontSize: '11px' }} className="mut">
                Directive (EU) 2023/2413 statutory rules and Union Database mass balance gates.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM DIAGNOSTICS & EXPORTS */}
        <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: 'var(--radius-panel)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '14px', fontWeight: 800 }} className="font-heading">
            Data Snapshots &amp; Maintenance
          </h2>
          
          <div className="set-export-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600 }}>Export Desk Snapshot</div>
              <div style={{ fontSize: '11px' }} className="mut">Download current marks and custom costs as JSON</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const data = {
                  marks: state.marks,
                  costs: state.costs,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biomethane-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showToast('Settings snapshot exported to JSON');
              }}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '6px 12px' }}
            >
              Export JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
