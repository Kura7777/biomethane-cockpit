import React, { useState, useEffect } from 'react';
import {
  loadConnectors,
  saveConnectors,
  testConnectorPing,
  ApiConnectorEntry,
  ConnectorCategory
} from '../../domain/api/connectorConfig';
import { parseBrokerRunText, BrokerRunParseResult } from '../../domain/markets/brokerRunParser';
import { useAppState } from '../../store/context';
import { showToast } from '../../app/DeskToastContainer';
import { PageShell } from '../../shared/ui/PageShell';
import {
  Key,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileText,
  Database,
  Zap,
  Layers,
  ExternalLink,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import './dataConnectors.css';

export function DataConnectorsScreen() {
  const { state, dispatch } = useAppState();
  const [connectors, setConnectors] = useState<ApiConnectorEntry[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ConnectorCategory | 'ALL'>('ALL');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  // Broker run parser state
  const [brokerRunText, setBrokerRunText] = useState<string>('');
  const [parsedRun, setParsedRun] = useState<BrokerRunParseResult | null>(null);

  useEffect(() => {
    setConnectors(loadConnectors());
  }, []);

  const handleToggleLive = (id: string) => {
    // Flipping "live mode" is a configuration change, not a verified connection —
    // status must only ever be set by an actual ping result (see handleTestPing).
    // Claiming CONNECTED here because a key string happens to be present was the
    // same fabricated-success bug as the old testConnectorPing default.
    const updated = connectors.map(c => {
      if (c.id === id) {
        return {
          ...c,
          isLiveMode: !c.isLiveMode,
          status: 'DISCONNECTED',
          lastPingTimestamp: null,
          latencyMs: null,
        } as ApiConnectorEntry;
      }
      return c;
    });
    setConnectors(updated);
    saveConnectors(updated);
    showToast('Connector mode updated — run Test to verify the connection');
  };

  const handleFieldChange = (id: string, field: 'apiKey' | 'clientId' | 'endpointUrl', value: string) => {
    setConnectors(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleSaveConnector = (id: string) => {
    saveConnectors(connectors);
    showToast('Credentials saved successfully');
  };

  const handleTestPing = async (connector: ApiConnectorEntry) => {
    setTestingId(connector.id);
    const result = await testConnectorPing(connector);
    setTestingId(null);

    const updated = connectors.map(c => {
      if (c.id === connector.id) {
        return {
          ...c,
          status: result.success ? 'CONNECTED' : 'ERROR',
          lastPingTimestamp: new Date().toISOString(),
          latencyMs: result.latencyMs,
          errorMessage: result.success ? null : result.message,
        } as ApiConnectorEntry;
      }
      return c;
    });

    setConnectors(updated);
    saveConnectors(updated);

    if (result.success) {
      showToast(`Success: ${result.message}`);
    } else {
      showToast(`Error: ${result.message}`);
    }
  };

  // Handle live broker run parsing
  const handleParseBrokerRun = (text: string) => {
    setBrokerRunText(text);
    if (!text.trim()) {
      setParsedRun(null);
      return;
    }
    const res = parseBrokerRunText(text);
    setParsedRun(res);
  };

  const handleApplyBrokerQuotesToDesk = () => {
    if (!parsedRun || parsedRun.quotes.length === 0) return;

    let appliedCount = 0;
    const marketMap: Record<string, string> = {
      DE: 'DE_THG',
      NL: 'NL_ERE',
      FR: 'FR_CPB',
      UK: 'UK_RTFO',
      IT: 'IT_CIC',
    };

    parsedRun.quotes.forEach(quote => {
      const marketId = marketMap[quote.country];
      if (marketId && (quote.numericBidEurMwh || quote.numericOfferEurMwh)) {
        const existing = state.marks.marks[marketId];
        const now = new Date().toISOString();

        dispatch({
          type: 'SET_MARK',
          marketId,
          bid: quote.numericBidEurMwh ?? existing?.bid ?? null,
          offer: quote.numericOfferEurMwh ?? existing?.offer ?? null,
          mid: quote.numericBidEurMwh && quote.numericOfferEurMwh
            ? (quote.numericBidEurMwh + quote.numericOfferEurMwh) / 2
            : quote.numericBidEurMwh ?? quote.numericOfferEurMwh ?? existing?.mid ?? null,
          source: `${parsedRun.inferredSource} (OTC Run)`,
          provenance: {
            sourceType: 'BROKER_INDICATION',
            sourceName: parsedRun.inferredSource,
            sourceUrl: null,
            observedAt: now,
            note: 'Imported from OTC broker text run',
          },
          updatedAt: now,
        });
        appliedCount++;
      }
    });

    showToast(`Applied ${appliedCount} quotes from ${parsedRun.inferredSource} run directly to desk marks!`);
  };

  const filteredConnectors = connectors.filter(c => {
    if (selectedCategory === 'ALL') return true;
    return c.category === selectedCategory;
  });

  return (
    <div className="dc-screen">
      <PageShell>
        <div className="dc-banner">
          <div>
            <div className="eyebrow dc-eyebrow">Institutional Feeds &amp; Registries</div>
            <h2 className="ptitle dc-title">Data Connectors Hub</h2>
            <div className="subttl dc-subtitle">
              Plug in your trading house API credentials for Argus, ICIS, ENTSOG, the Union Database (UDB), and national registries.
              Toggle between live production feeds and high-fidelity baseline simulations.
            </div>
          </div>

          {/* Status Chips */}
          <div className="dc-banner-chips">
            <div className="dc-stat-chip">
              <div className="eyebrow">Active Feeds</div>
              <div className="num dc-stat-value">
                {connectors.filter(c => c.status === 'CONNECTED').length} / {connectors.length}
              </div>
            </div>
            <div className="dc-stat-chip">
              <div className="eyebrow">Telemetry Status</div>
              <div className="dc-telemetry-value">
                <span className="dc-telemetry-dot" />
                Live Streaming (DK &amp; FR)
              </div>
            </div>
          </div>
        </div>
      </PageShell>

      <PageShell className="dc-body">
        {/* OTC Broker Run Fast Ingest Panel */}
        <div className="dc-otc-panel">
          <div className="dc-otc-header">
            <div className="dc-otc-header-left">
              <FileText className="w-5 h-5 text-indigo-500" />
              <div>
                <h3 className="dc-otc-title">Instant OTC Broker Run Parser (STX, ACT, Marex)</h3>
                <div className="dc-otc-sub">
                  Paste unformatted chat runs or email quote sheets to parse and apply bid/offers to desk marks in real-time.
                </div>
              </div>
            </div>

            {parsedRun && parsedRun.quotes.length > 0 && (
              <button
                type="button"
                className="btn btn-primary dc-otc-apply-btn"
                onClick={handleApplyBrokerQuotesToDesk}
              >
                <Zap className="w-4 h-4" />
                Apply {parsedRun.quotes.length} Quotes to Active Marks
              </button>
            )}
          </div>

          <div className={`dc-otc-grid ${parsedRun && parsedRun.quotes.length > 0 ? 'has-quotes' : ''}`}>
            <div>
              <textarea
                rows={4}
                value={brokerRunText}
                onChange={e => handleParseBrokerRun(e.target.value)}
                placeholder="Paste raw broker text here... E.g.&#10;DE Manure+Gas H2-26 -100 CI: €147 Bid / €152 Offer (10 GWh)&#10;DK Manure 2026 ISCC <-100 CI: €144 Bid / €149 Offer (20 GWh)&#10;NL Waste 2026 Certified <0 CI: €48 Bid / €50 Offer (25 GWh)&#10;UK Waste 2026 ISCC <18 CI: £24.50 Bid / £25.00 Offer (15 GWh)"
                className="dc-textarea"
              />
            </div>

            {parsedRun && parsedRun.quotes.length > 0 && (
              <div className="dc-quotes-box">
                <div className="dc-quotes-header">
                  <span>Parsed quotes ({parsedRun.quotes.length}) · detected source: {parsedRun.inferredSource}</span>
                  <span>{parsedRun.skippedLines.length} skipped</span>
                </div>
                <div className="dc-quote-list">
                  {parsedRun.quotes.map((q, idx) => (
                    <div key={idx} className="dc-quote-row">
                      <span>
                        <strong>[{q.country}]</strong> {q.feedstock} ({q.vintage}) · <span className={`dc-quote-class ${q.productClass === 'BUNDLED_COMPLIANCE' ? 'bundled' : ''}`}>{q.productClass}</span>
                      </span>
                      <span className="dc-quote-price">
                        {q.bidPrice ? `Bid: ${q.bidPrice}` : ''} {q.offerPrice ? `Ask: ${q.offerPrice}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Category Tabs */}
        <div className="dc-cat-tabs">
          {(['ALL', 'PRICING', 'GRID_FLOW', 'REGISTRY'] as const).map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn dc-cat-tab ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat === 'ALL' ? 'All Connectors' : cat === 'PRICING' ? 'Market Pricing Feeds' : cat === 'GRID_FLOW' ? 'Pipeline & Grid Telemetry' : 'Registries & Sustainability'}
            </button>
          ))}
        </div>

        {/* Connectors Grid */}
        <div className="dc-grid">
          {filteredConnectors.map(c => {
            const isShowKey = showKeys[c.id] || false;
            const isTesting = testingId === c.id;
            const badgeClass = c.category === 'PRICING' ? '' : c.category === 'GRID_FLOW' ? 'grid-flow' : 'registry';

            return (
              <div key={c.id} className="dc-card">
                <div>
                  {/* Header Row */}
                  <div className="dc-card-head">
                    <div>
                      <span className={`dc-card-badge ${badgeClass}`}>
                        {c.provider}
                      </span>
                      <h4 className="dc-card-title">{c.name}</h4>
                    </div>

                    {/* Mode Pill */}
                    <button
                      type="button"
                      onClick={() => handleToggleLive(c.id)}
                      className={`dc-mode-pill ${c.isLiveMode ? 'live' : ''}`}
                    >
                      {c.isLiveMode ? 'LIVE FEED' : 'MOCK / BASELINE'}
                    </button>
                  </div>

                  <div className="dc-card-desc">
                    {c.description}
                  </div>

                  {/* Endpoint Field */}
                  <div className="dc-field">
                    <label className="dc-field-label">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={c.endpointUrl}
                      onChange={e => handleFieldChange(c.id, 'endpointUrl', e.target.value)}
                      className="dc-input"
                      title={c.endpointUrl}
                    />
                  </div>

                  {/* API Key Field (if auth required) */}
                  {c.requiresAuth && (
                    <div className="dc-field with-toggle">
                      <div className="dc-field-label-row">
                        <label className="dc-field-label">
                          API Key / Access Token
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowKeys(prev => ({ ...prev, [c.id]: !isShowKey }))}
                          className="dc-field-toggle"
                        >
                          {isShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <input
                        type={isShowKey ? 'text' : 'password'}
                        value={c.apiKey}
                        onChange={e => handleFieldChange(c.id, 'apiKey', e.target.value)}
                        placeholder="Enter API Key on Day 1..."
                        className="dc-input"
                      />
                    </div>
                  )}

                  {/* Status Indicator */}
                  <div className="dc-status-row">
                    {c.status === 'CONNECTED' ? (
                      <span className="dc-status-connected">
                        <CheckCircle2 className="w-4 h-4" />
                        Connected {c.latencyMs ? `(${c.latencyMs}ms latency)` : ''}
                      </span>
                    ) : c.status === 'ERROR' ? (
                      <span className="dc-status-error">
                        <AlertCircle className="w-4 h-4" />
                        {c.errorMessage || 'Connection Failed'}
                      </span>
                    ) : (
                      <span className="dc-status-pending">
                        <Lock className="w-4 h-4" />
                        Awaiting Credentials
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="dc-card-actions">
                  <button
                    type="button"
                    className="btn btn-secondary dc-test-btn"
                    disabled={isTesting}
                    onClick={() => handleTestPing(c)}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                    {isTesting ? 'Pinging...' : 'Test Connection'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary dc-save-btn"
                    onClick={() => handleSaveConnector(c.id)}
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </PageShell>
    </div>
  );
}
