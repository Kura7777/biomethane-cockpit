import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { testConnectorPing, DEFAULT_CONNECTORS, ApiConnectorEntry } from '../api/connectorConfig';

/**
 * Task 0.1 — the connector ping must never report success without a completed,
 * real fetch. Prior behavior returned a hardcoded success + random latency for
 * any authenticated connector with a key present, without contacting the endpoint.
 */
describe('testConnectorPing — no fabricated success', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  const authedConnector: ApiConnectorEntry = {
    id: 'test_authed',
    name: 'Test Authenticated Feed',
    category: 'PRICING',
    provider: 'Test Provider',
    description: 'test',
    isLiveMode: false,
    endpointUrl: 'https://example.com/api/v1/prices',
    apiKey: 'sk-test-key',
    status: 'DISCONNECTED',
    requiresAuth: true,
  };

  it('calls fetch exactly once for an authenticated connector with a key present', async () => {
    (global.fetch as any).mockResolvedValue({ ok: true, status: 200, statusText: 'OK' });
    await testConnectorPing(authedConnector);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      authedConnector.endpointUrl,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('reports failure, not success, when fetch rejects (network error)', async () => {
    (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await testConnectorPing(authedConnector);
    expect(result.success).toBe(false);
  });

  it('reports failure with a distinguishable message on HTTP 401', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' });
    const result = await testConnectorPing(authedConnector);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/401|credentials rejected/i);
  });

  it('reports failure with a distinguishable message on HTTP 500', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500, statusText: 'Internal Server Error' });
    const result = await testConnectorPing(authedConnector);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/500/);
    // 401 and 500 must not produce the same message
    const unauthorized = await testConnectorPing(authedConnector).then(() => {
      (global.fetch as any).mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' });
      return testConnectorPing(authedConnector);
    });
    expect(unauthorized.message).not.toBe(result.message);
  });

  it('names the CORS/proxy requirement for connectors flagged requiresServerProxy', async () => {
    const proxied: ApiConnectorEntry = { ...authedConnector, requiresServerProxy: true };
    (global.fetch as any).mockRejectedValue(new TypeError('Failed to fetch'));
    const result = await testConnectorPing(proxied);
    expect(result.success).toBe(false);
    expect(result.message).toMatch(/CORS|proxy/i);
  });

  it('never returns success without fetch having resolved', async () => {
    (global.fetch as any).mockImplementation(() => new Promise(() => {})); // never resolves
    const promise = testConnectorPing(authedConnector);
    // Race against a short timer — if the function could return success without
    // awaiting fetch, it would resolve near-instantly.
    const raced = await Promise.race([
      promise.then(() => 'resolved'),
      new Promise(resolve => setTimeout(() => resolve('still-pending'), 50)),
    ]);
    expect(raced).toBe('still-pending');
  });
});

describe('DEFAULT_CONNECTORS — no unverified CONNECTED defaults', () => {
  it('every connector starts DISCONNECTED until a real ping succeeds', () => {
    for (const connector of DEFAULT_CONNECTORS) {
      expect(connector.status).toBe('DISCONNECTED');
      expect(connector.lastPingTimestamp ?? null).toBeNull();
      expect(connector.latencyMs ?? null).toBeNull();
    }
  });

  it('flags every requiresAuth connector as requiring a server proxy', () => {
    // These are enterprise feeds with no public CORS policy; claiming otherwise
    // is how the fabricated-success bug shipped in the first place.
    for (const connector of DEFAULT_CONNECTORS) {
      if (connector.requiresAuth) {
        expect(connector.requiresServerProxy).toBe(true);
      }
    }
  });
});
