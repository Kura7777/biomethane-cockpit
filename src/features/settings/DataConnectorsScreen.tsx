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
    const updated = connectors.map(c => {
      if (c.id === id) {
        const nextLive = !c.isLiveMode;
        return {
          ...c,
          isLiveMode: nextLive,
          status: nextLive ? (c.apiKey || !c.requiresAuth ? 'CONNECTED' : 'DISCONNECTED') : 'DISCONNECTED',
        } as ApiConnectorEntry;
      }
      return c;
    });
    setConnectors(updated);
    saveConnectors(updated);
    showToast('Connector mode updated');
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
    <div style={{ display: 'flex', flexDirection: 'column', padding: '24px', gap: '28px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="eyebrow" style={{ color: 'var(--color-accent-600)' }}>Institutional Feeds & Registries</div>
          <h2 className="ptitle" style={{ marginTop: '4px', fontSize: '26px' }}>Data Connectors Hub</h2>
          <div className="subttl" style={{ maxWidth: '800px', marginTop: '6px' }}>
            Plug in your trading house API credentials for Argus, ICIS, ENTSOG, the Union Database (UDB), and national registries. 
            Toggle between live production feeds and high-fidelity baseline simulations.
          </div>
        </div>

        {/* Status Chips */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Active Feeds</div>
            <div className="num" style={{ fontSize: '18px', fontWeight: 800, color: 'var(--color-accent-700)' }}>
              {connectors.filter(c => c.status === 'CONNECTED').length} / {connectors.length}
            </div>
          </div>
          <div style={{ backgroundColor: 'var(--color-surface)', padding: '10px 18px', borderRadius: '8px', border: '1px solid var(--color-divider)' }}>
            <div className="eyebrow">Telemetry Status</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16a34a', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#16a34a', display: 'inline-block' }} />
              Live Streaming (DK & FR)
            </div>
          </div>
        </div>
      </div>

      {/* OTC Broker Run Fast Ingest Panel */}
      <div style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-divider)', borderRadius: '10px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Instant OTC Broker Run Parser (STX, ACT, Marex)</h3>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Paste unformatted chat runs or email quote sheets to parse and apply bid/offers to desk marks in real-time.
              </div>
            </div>
          </div>

          {parsedRun && parsedRun.quotes.length > 0 && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleApplyBrokerQuotesToDesk}
              style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Zap className="w-4 h-4" />
              Apply {parsedRun.quotes.length} Quotes to Active Marks
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: parsedRun && parsedRun.quotes.length > 0 ? '1fr 1fr' : '1fr', gap: '16px' }}>
          <div>
            <textarea
              rows={4}
              value={brokerRunText}
              onChange={e => handleParseBrokerRun(e.target.value)}
              placeholder="Paste raw broker text here... E.g.&#10;DE Manure+Gas H2-26 -100 CI: €147 Bid / €152 Offer (10 GWh)&#10;DK Manure 2026 ISCC <-100 CI: €144 Bid / €149 Offer (20 GWh)&#10;NL Waste 2026 Certified <0 CI: €48 Bid / €50 Offer (25 GWh)&#10;UK Waste 2026 ISCC <18 CI: £24.50 Bid / £25.00 Offer (15 GWh)"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--color-divider)',
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                fontFamily: 'monospace',
                fontSize: '12.5px',
                resize: 'vertical',
              }}
            />
          </div>

          {parsedRun && parsedRun.quotes.length > 0 && (
            <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--color-divider)', borderRadius: '6px', backgroundColor: 'var(--color-bg)', padding: '10px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>PARSED QUOTES ({parsedRun.quotes.length}) · DETECTED SOURCE: {parsedRun.inferredSource}</span>
                <span>{parsedRun.skippedLines.length} SKIPPED</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {parsedRun.quotes.map((q, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', backgroundColor: 'var(--color-surface)', borderRadius: '4px', border: '1px solid var(--color-divider)' }}>
                    <span>
                      <strong>[{q.country}]</strong> {q.feedstock} ({q.vintage}) · <span style={{ color: q.productClass === 'BUNDLED_COMPLIANCE' ? '#16a34a' : '#2563eb' }}>{q.productClass}</span>
                    </span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>
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
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
        {(['ALL', 'PRICING', 'GRID_FLOW', 'REGISTRY'] as const).map(cat => (
          <button
            key={cat}
            type="button"
            className={`btn ${selectedCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px', padding: '6px 14px' }}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat === 'ALL' ? 'All Connectors' : cat === 'PRICING' ? 'Market Pricing Feeds' : cat === 'GRID_FLOW' ? 'Pipeline & Grid Telemetry' : 'Registries & Sustainability'}
          </button>
        ))}
      </div>

      {/* Connectors Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '20px' }}>
        {filteredConnectors.map(c => {
          const isShowKey = showKeys[c.id] || false;
          const isTesting = testingId === c.id;

          return (
            <div 
              key={c.id} 
              style={{ 
                backgroundColor: 'var(--color-surface)', 
                border: '1px solid var(--color-divider)', 
                borderRadius: '10px', 
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '16px'
              }}
            >
              <div>
                {/* Header Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div>
                    <span style={{ 
                      fontSize: '10px', 
                      fontWeight: 800, 
                      letterSpacing: '0.05em', 
                      textTransform: 'uppercase',
                      color: c.category === 'PRICING' ? '#2563eb' : c.category === 'GRID_FLOW' ? '#059669' : '#9333ea',
                      backgroundColor: 'rgba(0,0,0,0.04)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}>
                      {c.provider}
                    </span>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, margin: '6px 0 2px 0' }}>{c.name}</h4>
                  </div>

                  {/* Mode Pill */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleLive(c.id)}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-divider)',
                        cursor: 'pointer',
                        backgroundColor: c.isLiveMode ? '#16a34a' : 'var(--color-bg)',
                        color: c.isLiveMode ? '#ffffff' : 'var(--color-text-secondary)',
                      }}
                    >
                      {c.isLiveMode ? 'LIVE FEED' : 'MOCK / BASELINE'}
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '12.5px', color: 'var(--color-text-secondary)', marginBottom: '14px', lineHeight: 1.4 }}>
                  {c.description}
                </div>

                {/* Endpoint Field */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)', display: 'block', marginBottom: '4px' }}>
                    Endpoint URL
                  </label>
                  <input
                    type="text"
                    value={c.endpointUrl}
                    onChange={e => handleFieldChange(c.id, 'endpointUrl', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: '6px',
                      border: '1px solid var(--color-divider)',
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text)',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                    }}
                  />
                </div>

                {/* API Key Field (if auth required) */}
                {c.requiresAuth && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-secondary)' }}>
                        API Key / Access Token
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowKeys(prev => ({ ...prev, [c.id]: !isShowKey }))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-secondary)', padding: 0 }}
                      >
                        {isShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input
                      type={isShowKey ? 'text' : 'password'}
                      value={c.apiKey}
                      onChange={e => handleFieldChange(c.id, 'apiKey', e.target.value)}
                      placeholder="Enter API Key on Day 1..."
                      style={{
                        width: '100%',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid var(--color-divider)',
                        backgroundColor: 'var(--color-bg)',
                        color: 'var(--color-text)',
                        fontSize: '12px',
                        fontFamily: 'monospace',
                      }}
                    />
                  </div>
                )}

                {/* Status Indicator */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '6px' }}>
                  {c.status === 'CONNECTED' ? (
                    <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <CheckCircle2 className="w-4 h-4" />
                      Connected {c.latencyMs ? `(${c.latencyMs}ms latency)` : ''}
                    </span>
                  ) : c.status === 'ERROR' ? (
                    <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                      <AlertCircle className="w-4 h-4" />
                      {c.errorMessage || 'Connection Failed'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Lock className="w-4 h-4" />
                      Awaiting Credentials
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', paddingTop: '12px', borderTop: '1px solid var(--color-divider)' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={isTesting}
                  onClick={() => handleTestPing(c)}
                  style={{ flex: 1, fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Pinging...' : 'Test Connection'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleSaveConnector(c.id)}
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                >
                  Save
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
