import { DealRecord, DealStatus, DealAuditEntry, DealFilterCriteria } from '../deals/types';
import { MarksState } from '../netback/types';
import {
  MarksAuditRecord,
  getMarksAuditHistory,
  saveMarksAuditRecord,
  registerMarksAuditSyncHandler,
} from '../marks/marksStore';
import { Role, RoleDefinition, SessionState } from '../auth/types';
import { getActiveRole, setActiveRole, getSessionState } from '../auth/authStore';
import { ROLE_DEFINITIONS } from '../auth/rbac';
import { INITIAL_LEDGER_DEALS, dealLedger } from '../../server/dealLedger';
import {
  DealsResponse,
  DealResponse,
  MarksResponse,
  MarksAuditResponse,
  SessionResponse,
  RolesResponse,
  ApiResponse,
} from './types';

export const LOCAL_DEALS_STORAGE_KEY = 'biomethane_desk_deals_ledger_v1';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  public setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  // Helper: Local fallback deal loader
  private getLocalDeals(filters?: DealFilterCriteria): DealRecord[] {
    if (typeof localStorage === 'undefined') {
      return dealLedger.getDeals(filters);
    }

    let deals: DealRecord[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_DEALS_STORAGE_KEY);
      if (raw) {
        deals = JSON.parse(raw);
      }
    } catch {
      // Fallback to initial seeds
    }

    if (!deals || deals.length === 0) {
      deals = JSON.parse(JSON.stringify(INITIAL_LEDGER_DEALS));
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(LOCAL_DEALS_STORAGE_KEY, JSON.stringify(deals));
        }
      } catch {
        // Ignored
      }
    }

    let list = [...deals].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    if (filters?.status && filters.status !== 'ALL') {
      list = list.filter(d => d.status === filters.status);
    }
    if (filters?.marketId) {
      list = list.filter(d => d.marketId === filters.marketId);
    }
    if (filters?.originCountry) {
      list = list.filter(d => d.originCountry === filters.originCountry);
    }
    if (filters?.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      list = list.filter(
        d =>
          d.id.toLowerCase().includes(q) ||
          d.tradeTitle.toLowerCase().includes(q) ||
          d.counterparty.toLowerCase().includes(q) ||
          d.marketName.toLowerCase().includes(q)
      );
    }

    return list;
  }

  private saveLocalDeals(deals: DealRecord[]): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_DEALS_STORAGE_KEY, JSON.stringify(deals));
      }
    } catch {
      // Ignored
    }
  }

  // ----------------------------------------------------------------------
  // DEALS API
  // ----------------------------------------------------------------------

  public async getDeals(filters?: DealFilterCriteria): Promise<DealsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.status && filters.status !== 'ALL') params.set('status', filters.status);
      if (filters?.marketId) params.set('marketId', filters.marketId);
      if (filters?.originCountry) params.set('originCountry', filters.originCountry);
      if (filters?.searchQuery) params.set('q', filters.searchQuery);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`${this.baseUrl}/api/v1/deals${qs}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, count: data.count, deals: data.deals, isFallback: false };
    } catch {
      const deals = this.getLocalDeals(filters);
      return { success: true, count: deals.length, deals, isFallback: true };
    }
  }

  public async getDealById(id: string): Promise<DealResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/deals/${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, deal: data.deal, isFallback: false };
    } catch {
      if (typeof localStorage === 'undefined') {
        const deal = dealLedger.getDealById(id);
        if (!deal) {
          return { success: false, error: `Deal ${id} not found`, isFallback: true };
        }
        return { success: true, deal, isFallback: true };
      }
      const deals = this.getLocalDeals();
      const deal = deals.find(d => d.id === id);
      if (!deal) {
        return { success: false, error: `Deal ${id} not found`, isFallback: true };
      }
      return { success: true, deal, isFallback: true };
    }
  }

  public async createDeal(
    dealData: Partial<DealRecord>,
    actor = 'Desk Trader',
    role: Role = 'TRADER',
    note?: string
  ): Promise<DealResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/deals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deal: dealData, actor, actorRole: role, note }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, deal: data.deal, isFallback: false };
    } catch {
      if (typeof localStorage === 'undefined') {
        const record = dealLedger.createDeal(dealData, actor, role, note);
        return { success: true, deal: record, isFallback: true };
      }
      const deals = this.getLocalDeals();
      const id = dealData.id || `DEAL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date().toISOString();
      const initialStatus: DealStatus = dealData.status || 'DRAFT';

      const auditEntry: DealAuditEntry = {
        id: `AUD-${id}-${Date.now()}`,
        dealId: id,
        timestamp: now,
        previousStatus: null,
        newStatus: initialStatus,
        actor,
        actorRole: role,
        note: note || `Deal originated and saved locally as ${initialStatus}`,
      };

      const record: DealRecord = {
        id,
        status: initialStatus,
        createdAt: dealData.createdAt || now,
        updatedAt: now,
        tradeTitle: dealData.tradeTitle || 'New Biomethane Trade',
        counterparty: dealData.counterparty || 'Bilateral Counterparty',
        marketId: dealData.marketId || 'DE_THG',
        marketName: dealData.marketName || 'German THG-Quote',
        originCountry: dealData.originCountry || 'DE',
        originCountryName: dealData.originCountryName || 'Germany',
        feedstock: dealData.feedstock || 'manure',
        feedstockName: dealData.feedstockName || 'Raw Manure / Slurry',
        volumeMWh: dealData.volumeMWh || 10000,
        carbonIntensity: dealData.carbonIntensity ?? -100,
        netbackEur: dealData.netbackEur ?? 0,
        deskMarginEur: dealData.deskMarginEur ?? 0,
        gasIndexEur: dealData.gasIndexEur ?? null,
        currency: dealData.currency || 'EUR',
        notes: dealData.notes || '',
        auditTrail: [auditEntry],
        assessment: dealData.assessment,
      };

      deals.unshift(record);
      this.saveLocalDeals(deals);
      return { success: true, deal: record, isFallback: true };
    }
  }

  public async transitionDeal(
    id: string,
    newStatus: DealStatus,
    actor = 'Desk Trader',
    role: Role = 'TRADER',
    note = ''
  ): Promise<DealResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/deals/${encodeURIComponent(id)}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, actor, actorRole: role, note }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || `HTTP ${res.status}`, isFallback: false };
      }
      return { success: true, deal: data.deal, isFallback: false };
    } catch {
      if (typeof localStorage === 'undefined') {
        const transRes = dealLedger.transitionDeal(id, newStatus, actor, role, note);
        if (!transRes.success) {
          return { success: false, error: transRes.error, isFallback: true };
        }
        return { success: true, deal: transRes.deal, isFallback: true };
      }
      const deals = this.getLocalDeals();
      const existing = deals.find(d => d.id === id);
      if (!existing) {
        return { success: false, error: `Deal ${id} not found`, isFallback: true };
      }

      // Role check in fallback
      if (newStatus === 'SETTLED' && role !== 'RISK_MANAGER' && role !== 'COMPLIANCE_OFFICER') {
        return {
          success: false,
          error: `Settlement requires RISK_MANAGER or COMPLIANCE_OFFICER role`,
          isFallback: true,
        };
      }

      const now = new Date().toISOString();
      const auditEntry: DealAuditEntry = {
        id: `AUD-${id}-${Date.now()}`,
        dealId: id,
        timestamp: now,
        previousStatus: existing.status,
        newStatus,
        actor,
        actorRole: role,
        note: note || `Transitioned to ${newStatus}`,
      };

      existing.status = newStatus;
      existing.updatedAt = now;
      existing.auditTrail.push(auditEntry);
      this.saveLocalDeals(deals);

      return { success: true, deal: existing, isFallback: true };
    }
  }

  public async getDealAudit(
    id: string
  ): Promise<{ success: boolean; audit: DealAuditEntry[]; isFallback?: boolean }> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/deals/${encodeURIComponent(id)}/audit`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, audit: data.audit, isFallback: false };
    } catch {
      if (typeof localStorage === 'undefined') {
        const audit = dealLedger.getDealAudit(id);
        return { success: true, audit, isFallback: true };
      }
      const deals = this.getLocalDeals();
      const deal = deals.find(d => d.id === id);
      return { success: true, audit: deal ? deal.auditTrail : [], isFallback: true };
    }
  }

  // ----------------------------------------------------------------------
  // MARKS API
  // ----------------------------------------------------------------------

  public async getMarks(): Promise<MarksResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/marks`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, marks: data.marks, isFallback: false };
    } catch {
      return { success: true, isFallback: true };
    }
  }

  public async saveMarks(marks: Partial<MarksState>): Promise<MarksResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/marks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marks }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, marks: data.marks, isFallback: false };
    } catch {
      return { success: true, isFallback: true };
    }
  }

  public async getMarksAudit(): Promise<MarksAuditResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/marks/audit`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, count: data.count, history: data.history, isFallback: false };
    } catch {
      const history = getMarksAuditHistory();
      return { success: true, count: history.length, history, isFallback: true };
    }
  }

  public async appendMarksAudit(record: MarksAuditRecord): Promise<ApiResponse<void>> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/marks/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { success: true, isFallback: false };
    } catch {
      saveMarksAuditRecord(record, true);
      return { success: true, isFallback: true };
    }
  }

  // ----------------------------------------------------------------------
  // AUTH API
  // ----------------------------------------------------------------------

  public async getSession(): Promise<SessionResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/session`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, session: data.session, isFallback: false };
    } catch {
      return { success: true, session: getSessionState(), isFallback: true };
    }
  }

  public async switchRole(role: Role): Promise<SessionResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setActiveRole(role);
      return { success: true, session: data.session, isFallback: false };
    } catch {
      setActiveRole(role);
      return { success: true, session: getSessionState(), isFallback: true };
    }
  }

  public async getRoles(): Promise<RolesResponse> {
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/auth/roles`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { success: true, roles: data.roles, isFallback: false };
    } catch {
      return { success: true, roles: Object.values(ROLE_DEFINITIONS), isFallback: true };
    }
  }
}

export const apiClient = new ApiClient();

// Wire automatic background sync between marksStore and API client
registerMarksAuditSyncHandler(record => apiClient.appendMarksAudit(record));

