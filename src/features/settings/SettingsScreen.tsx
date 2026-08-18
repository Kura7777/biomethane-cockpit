import React, { useState, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { PRODUCING_ORIGINS } from '../../domain/arbitrage/origins';
import { GeminiModelId } from '../../domain/arbitrage/geminiService';

const AVAILABLE_MODELS: { id: GeminiModelId; label: string; desc: string }[] = [
  { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash', desc: 'Frontier Model: Next-gen hybrid reasoning & high speed trading analysis' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', desc: 'Production Default: Ultra-fast, low latency, advanced reasoning' },
  { id: 'gemini-2.0-flash-thinking-exp', label: 'Gemini 2.0 Flash (Thinking)', desc: 'Reasoning Mode: Step-by-step statutory evaluation' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', desc: 'High throughput stable model' },
  { id: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', desc: 'Deep regulatory multi-document analysis' },
];

export function SettingsScreen() {
  const { state, dispatch } = useAppState();

  // API Key & Model State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem('gemini_api_key') || '');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    const stored = localStorage.getItem('gemini_model');
    if (stored && stored !== 'gemini-2.5-flash') return stored;
    return 'gemini-3.7-flash';
  });
  const [customModelInput, setCustomModelInput] = useState<string>('');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [testStatus, setTestStatus] = useState<'IDLE' | 'TESTING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [testMsg, setTestMsg] = useState<string>('');
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  // Saved Feedback
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Save changes to localStorage
  const handleSaveSettings = () => {
    localStorage.setItem('gemini_api_key', apiKey.trim());
    localStorage.setItem('gemini_model', selectedModel);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Test live connection to Google Gemini API
  const handleTestConnection = async () => {
    if (!apiKey.trim()) {
      setTestStatus('ERROR');
      setTestMsg('Please enter a Google Gemini API Key first.');
      return;
    }

    const modelToUse = customModelInput.trim() || selectedModel;
    setTestStatus('TESTING');
    setTestMsg(`Pinging Google Generative AI (${modelToUse})…`);
    const start = performance.now();

    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelToUse}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey.trim(),
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Respond with exactly the word "CONNECTED".' }] }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0.1,
          },
        }),
      });

      const end = performance.now();
      const elapsed = Math.round(end - start);
      setLatencyMs(elapsed);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        setTestStatus('SUCCESS');
        setSelectedModel(modelToUse);
        setTestMsg(`✓ Connected successfully to Google Gemini (${modelToUse}) in ${elapsed}ms. Response: "${text || 'OK'}"`);
        localStorage.setItem('gemini_api_key', apiKey.trim());
        localStorage.setItem('gemini_model', modelToUse);
      } else {
        const err = await response.json().catch(() => ({}));
        setTestStatus('ERROR');
        setTestMsg(`API Error (HTTP ${response.status}): ${err.error?.message || response.statusText}`);
      }
    } catch (e: unknown) {
      const errMsg = e instanceof Error ? e.message : 'Failed to contact Google API server';
      setTestStatus('ERROR');
      setTestMsg(`Network Error: ${errMsg}`);
    }
  };

  const hasKey = Boolean(apiKey.trim());

  return (
    <div className="flex-1 min-h-0 min-w-[1400px] overflow-y-auto bg-stone-950 font-sans p-6 text-stone-100">
      <div className="max-w-[880px] mx-auto flex flex-col gap-6">
        
        {/* Page Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h1 className="m-0 font-mono text-lg font-semibold tracking-[0.12em] uppercase text-stone-100">
              Desk Settings & API Configuration
            </h1>
            <p className="m-0 text-xs text-stone-400 mt-1">
              Configure Google Gemini API keys, intelligence engine models (Gemini 3.7 Flash, 2.0 Flash), and desk trading defaults.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveSettings}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-xs font-bold tracking-[0.08em] uppercase cursor-pointer rounded-xs transition-colors"
          >
            {saveSuccess ? '✓ Settings Saved' : 'Save Changes'}
          </button>
        </div>

        {/* SECTION 1: GOOGLE GEMINI AI CONFIGURATION */}
        <div className="bg-stone-900 border border-stone-800 rounded-xs p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400" />
              <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.1em] text-stone-100 uppercase">
                Google Gemini API Connection
              </h2>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`font-mono text-micro font-bold px-2 py-0.5 border rounded-xs ${
                hasKey
                  ? 'text-emerald-300 bg-emerald-950 border-emerald-800'
                  : 'text-sky-300 bg-sky-950 border-sky-800'
              }`}>
                {hasKey ? `● API Active (${selectedModel})` : '○ Deterministic Engine Mode'}
              </span>
            </div>
          </div>

          <p className="m-0 text-xs leading-relaxed text-stone-300">
            When an API Key is provided, the <strong>Desk Copilot</strong> connects directly to Google Gemini for deep qualitative reasoning, statutory cross-examination, and freeform queries. If no key is set, the Copilot runs in <strong>Deterministic Mode</strong> using internal valuation and eligibility engines with zero external network dependencies.
          </p>

          {/* API Key Input */}
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
              Google AI Studio API Key (x-goog-api-key)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-stone-950 border border-stone-700 text-stone-100 font-mono text-xs px-3 py-2 rounded-xs outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2 top-2 font-mono text-micro text-stone-400 hover:text-stone-200 bg-stone-800 px-1.5 py-0.5 rounded-xs cursor-pointer"
                >
                  {showKey ? 'HIDE' : 'SHOW'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'TESTING'}
                className="px-3.5 py-2 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-mono text-xs font-semibold tracking-[0.06em] uppercase rounded-xs cursor-pointer transition-colors shrink-0"
              >
                {testStatus === 'TESTING' ? 'Testing…' : 'Test Connection'}
              </button>
            </div>
            <span className="text-micro text-stone-500 font-mono">
              Stored securely in local browser storage (`localStorage.gemini_api_key`). Never sent to third-party servers.
            </span>
          </div>

          {/* Test Status Banner */}
          {testStatus !== 'IDLE' && (
            <div className={`p-3 border rounded-xs font-mono text-xs leading-relaxed ${
              testStatus === 'TESTING' ? 'bg-stone-950 border-stone-700 text-stone-300' :
              testStatus === 'SUCCESS' ? 'bg-emerald-950/80 border-emerald-800 text-emerald-300' :
              'bg-red-950/80 border-red-800 text-red-300'
            }`}>
              {testMsg}
            </div>
          )}

          {/* Model Selection */}
          <div className="flex flex-col gap-2 pt-2 border-t border-stone-800">
            <div className="flex items-center justify-between">
              <label className="font-mono text-micro font-semibold tracking-[0.12em] text-stone-400 uppercase">
                Active Gemini Model
              </label>
              <span className="font-mono text-micro text-teal-300 font-semibold">
                Selected: {selectedModel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {AVAILABLE_MODELS.map(m => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedModel(m.id);
                    setCustomModelInput('');
                  }}
                  className={`p-2.5 border rounded-xs cursor-pointer transition-colors ${
                    selectedModel === m.id
                      ? 'bg-stone-950 border-teal-500 ring-1 ring-teal-500'
                      : 'bg-stone-950/50 border-stone-800 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-stone-200">{m.label}</span>
                    {selectedModel === m.id && (
                      <span className="w-2 h-2 rounded-full bg-teal-400" />
                    )}
                  </div>
                  <div className="text-micro text-stone-400 mt-1 leading-normal">
                    {m.desc}
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Model Override Input */}
            <div className="mt-2 p-2.5 bg-stone-950 border border-stone-800 rounded-xs flex flex-col gap-1.5">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Or Custom Model ID (e.g. gemini-3.7-flash, gemini-2.0-pro-exp)
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter custom Gemini model identifier…"
                  value={customModelInput}
                  onChange={e => {
                    setCustomModelInput(e.target.value);
                    if (e.target.value.trim()) setSelectedModel(e.target.value.trim());
                  }}
                  className="flex-1 bg-stone-900 border border-stone-700 text-stone-100 font-mono text-xs px-2.5 py-1.5 rounded-xs outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customModelInput.trim()) {
                      setSelectedModel(customModelInput.trim());
                      handleSaveSettings();
                    }
                  }}
                  className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 font-mono text-micro font-semibold uppercase rounded-xs cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: DESK TRADING DEFAULTS */}
        <div className="bg-stone-900 border border-stone-800 rounded-xs p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.1em] text-stone-100 uppercase">
              Trading Desk Parameters & Defaults
            </h2>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Pricing Side Mode
              </span>
              <span className="font-mono font-num text-sm font-bold text-teal-300 uppercase mt-1">
                {state.marks.pricingSides.certificateSide.toUpperCase()} SIDE
              </span>
              <span className="text-micro text-stone-500">
                Controls whether netbacks evaluate off Bid, Mid, or Offer marks across all screens.
              </span>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Active Benchmark Origin
              </span>
              <span className="font-mono font-num text-sm font-bold text-stone-100 mt-1">
                {state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK'} ({PRODUCING_ORIGINS[state.consignments.find(c => c.id === state.activeConsignmentId)?.originCountry || 'DK']?.countryName || 'Denmark'})
              </span>
              <span className="text-micro text-stone-500">
                Default production origin loaded on opportunity scanner and trade tickets.
              </span>
            </div>

            <div className="bg-stone-950 border border-stone-800 p-3 rounded-xs flex flex-col gap-1">
              <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
                Regulatory Framework
              </span>
              <span className="font-mono font-num text-sm font-bold text-stone-100 mt-1">
                RED III / UDB 2026
              </span>
              <span className="text-micro text-stone-500">
                Directive (EU) 2023/2413 statutory rules and Union Database mass balance gates.
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 3: SYSTEM DIAGNOSTICS & EXPORTS */}
        <div className="bg-stone-900 border border-stone-800 rounded-xs p-5 flex flex-col gap-3">
          <h2 className="m-0 font-mono text-sm font-semibold tracking-[0.1em] text-stone-100 uppercase">
            Data Snapshots & Maintenance
          </h2>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <div className="text-xs font-semibold text-stone-200">Export Desk Snapshot</div>
              <div className="text-micro text-stone-500">Download current marks, custom costs, and API settings as JSON</div>
            </div>
            <button
              type="button"
              onClick={() => {
                const data = {
                  marks: state.marks,
                  costs: state.costs,
                  model: selectedModel,
                  exportedAt: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `biomethane-desk-settings-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-1.5 bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 font-mono text-micro font-semibold uppercase rounded-xs cursor-pointer"
            >
              Export JSON
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
