/**
 * Central Data Connectors Configuration Store
 * Enables zero-code API credential entry on Day 1 for institutional pricing, TSO, and registry feeds.
 */

export type ConnectorCategory = 'PRICING' | 'GRID_FLOW' | 'REGISTRY';
export type ConnectorStatus = 'CONNECTED' | 'DISCONNECTED' | 'TESTING' | 'ERROR';

export interface ApiConnectorEntry {
  id: string;
  name: string;
  category: ConnectorCategory;
  provider: string;
  description: string;
  isLiveMode: boolean;
  endpointUrl: string;
  apiKey: string;
  clientId?: string;
  status: ConnectorStatus;
  lastPingTimestamp?: string | null;
  latencyMs?: number | null;
  errorMessage?: string | null;
  requiresAuth: boolean;
  /** True when this endpoint is expected to reject direct browser calls (CORS) and needs a server-side proxy to actually reach. */
  requiresServerProxy?: boolean;
}

const STORAGE_KEY = 'biomethane_desk_api_connectors_v1';

export const DEFAULT_CONNECTORS: ApiConnectorEntry[] = [
  // 1. Commercial Pricing Feeds
  {
    id: 'argus_biofuels',
    name: 'Argus Direct API',
    category: 'PRICING',
    provider: 'Argus Media',
    description: 'European Biomethane, THG-Quote, and ERE assessment marks & spot indexes.',
    isLiveMode: false,
    endpointUrl: 'https://api.argusmedia.com/v1/biofuels/biomethane',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },
  {
    id: 'icis_esgm',
    name: 'ICIS ESGM Data Feed',
    category: 'PRICING',
    provider: 'ICIS / LexisNexis',
    description: 'European Spot Gas Markets (TTF, THE, PEG, PSV) and Biomethane Guarantees of Origin.',
    isLiveMode: false,
    endpointUrl: 'https://api.icis.com/energy/v2/prices/biomethane',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },
  {
    id: 'eex_auctions',
    name: 'EEX French Biomethane Auctions',
    category: 'PRICING',
    provider: 'European Energy Exchange',
    description: 'Monthly clearing prices and volumes for subsidized French Biomethane GO auctions.',
    isLiveMode: false,
    endpointUrl: 'https://api.eex.com/v1/registries/france/auctions',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },

  // 2. Transmission & Grid Flow Feeds
  {
    id: 'energinet_live',
    name: 'Energinet Open Data Service',
    category: 'GRID_FLOW',
    provider: 'Energinet Gas TSO (Denmark)',
    description: 'Live hourly biomethane injection flows into Danish transmission and distribution grids.',
    isLiveMode: true,
    endpointUrl: 'https://api.energidataservice.dk/dataset/Gasflow?limit=50',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: false,
    lastPingTimestamp: null,
    latencyMs: null,
  },
  {
    id: 'odre_france_live',
    name: 'ODRE France Biomethane Production',
    category: 'GRID_FLOW',
    provider: 'GRDF / GRTgaz / Teréga (ODRE)',
    description: 'Open Data Réseaux Énergies — annual biomethane production per injection site.',
    isLiveMode: true,
    endpointUrl: 'https://odre.opendatasoft.com/api/explore/v2.1/catalog/datasets/production-annuelle-de-biomethane-par-site-raccorde-au-reseau-de-transport-et-de/records?limit=50',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: false,
    lastPingTimestamp: null,
    latencyMs: null,
  },
  {
    id: 'entsog_transparency',
    name: 'ENTSOG Transparency Platform',
    category: 'GRID_FLOW',
    provider: 'ENTSOG AISBL',
    description: 'Cross-border interconnection point entry/exit capacity tariffs and physical flows across Europe.',
    isLiveMode: false,
    endpointUrl: 'https://transparency.entsog.eu/api/v1/tariffs',
    apiKey: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },

  // 3. Registries & Sustainability
  {
    id: 'udb_ec_edi',
    name: 'Union Database (UDB) EDI Gateway',
    category: 'REGISTRY',
    provider: 'European Commission (RED III Art. 31a)',
    description: 'Central registry for European mass-balance gas and Proof of Sustainability (PoS) transfers.',
    isLiveMode: false,
    endpointUrl: 'https://udb.ec.europa.eu/api/edi/v1/mass-balance',
    apiKey: '',
    clientId: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },
  {
    id: 'dena_biogasregister',
    name: 'dena Biogasregister API / SFTP',
    category: 'REGISTRY',
    provider: 'Deutsche Energie-Agentur GmbH',
    description: 'German national biomethane account batches, mass balance audits, and THG verification.',
    isLiveMode: false,
    endpointUrl: 'https://api.biogasregister.de/v2/batches',
    apiKey: '',
    clientId: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },
  {
    id: 'verticer_netherlands',
    name: 'VertiCer REV API',
    category: 'REGISTRY',
    provider: 'VertiCer B.V. (Netherlands)',
    description: 'Dutch national renewable gas register and Register Energie Vervoer (ERE) claims.',
    isLiveMode: false,
    endpointUrl: 'https://api.verticer.eu/v1/accounts/batches',
    apiKey: '',
    clientId: '',
    status: 'DISCONNECTED',
    requiresAuth: true,
    requiresServerProxy: true,
  },
];

export function loadConnectors(): ApiConnectorEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONNECTORS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_CONNECTORS;
    
    // Merge with defaults in case new connectors were added
    return DEFAULT_CONNECTORS.map(def => {
      const match = parsed.find((p: ApiConnectorEntry) => p.id === def.id);
      return match ? { ...def, ...match } : def;
    });
  } catch {
    return DEFAULT_CONNECTORS;
  }
}

export function saveConnectors(connectors: ApiConnectorEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connectors));
  } catch (err) {
    console.error('Failed to save connectors to localStorage', err);
  }
}

/**
 * Ping test an API connector endpoint.
 */
export async function testConnectorPing(connector: ApiConnectorEntry): Promise<{
  success: boolean;
  latencyMs: number;
  message: string;
}> {
  const start = Date.now();
  try {
    // Open feeds without required auth can be tested directly
    if (!connector.requiresAuth) {
      const res = await fetch(connector.endpointUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      const latency = Date.now() - start;
      if (res.ok) {
        return {
          success: true,
          latencyMs: latency,
          message: `HTTP ${res.status} OK (${latency}ms) — Feed active and streaming`,
        };
      }
      return {
        success: false,
        latencyMs: latency,
        message: `HTTP ${res.status} ${res.statusText}`,
      };
    }

    // Authenticated endpoints
    if (!connector.apiKey && !connector.clientId) {
      return {
        success: false,
        latencyMs: 0,
        message: 'Missing API Key / Client Credentials. Enter credentials to test connection.',
      };
    }

    // Attempt a real authenticated request. Most enterprise feeds (Argus, ICIS, EEX,
    // the UDB gateway, dena, VertiCer) are not CORS-enabled for direct browser calls,
    // so a network-level failure here is an expected, truthful result for those
    // connectors — not a reason to fall back to a simulated success.
    const headers: Record<string, string> = {};
    if (connector.apiKey) headers['Authorization'] = `Bearer ${connector.apiKey}`;
    if (connector.clientId) headers['X-Client-Id'] = connector.clientId;

    const res = await fetch(connector.endpointUrl, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(4000),
    });
    const latency = Date.now() - start;
    if (res.ok) {
      return {
        success: true,
        latencyMs: latency,
        message: `HTTP ${res.status} OK (${latency}ms) — Feed active and streaming`,
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        success: false,
        latencyMs: latency,
        message: `HTTP ${res.status} ${res.statusText} — credentials rejected by ${connector.provider}`,
      };
    }
    return {
      success: false,
      latencyMs: latency,
      message: `HTTP ${res.status} ${res.statusText}`,
    };
  } catch (err: any) {
    const latency = Date.now() - start;
    // A browser fetch to a cross-origin API that doesn't send CORS headers surfaces
    // as a generic "Failed to fetch" / TypeError, indistinguishable at the JS layer
    // from a real network outage. Where we already know a connector needs a
    // server-side proxy, say so rather than reporting an ambiguous failure.
    if (connector.requiresServerProxy) {
      return {
        success: false,
        latencyMs: latency,
        message: `Blocked by CORS — ${connector.provider} does not permit direct browser calls. This endpoint requires a server-side proxy.`,
      };
    }
    return {
      success: false,
      latencyMs: latency,
      message: err?.message || 'Connection timeout or network failure',
    };
  }
}
