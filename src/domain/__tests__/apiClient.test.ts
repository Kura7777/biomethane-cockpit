import { describe, it, expect, beforeEach } from 'vitest';
import { apiClient, LOCAL_DEALS_STORAGE_KEY } from '../api/client';
import { dealLedger } from '../../server/dealLedger';
import { marksLedger } from '../../server/marksLedger';
import { authService } from '../../server/authService';
import { MarksAuditRecord } from '../marks/marksStore';

describe('Client-side API Adapter & Server Ledgers', () => {
  beforeEach(() => {
    dealLedger.reset();
    marksLedger.reset();
    authService.reset();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(LOCAL_DEALS_STORAGE_KEY);
    }
  });

  it('fetches deals list with transparent local fallback', async () => {
    const res = await apiClient.getDeals();
    expect(res.success).toBe(true);
    expect(res.deals.length).toBeGreaterThanOrEqual(3);
    const first = res.deals[0];
    expect(first.id).toMatch(/^DOS-2026-/);
    expect(first.marketId).toBeDefined();
    expect(first.volumeMWh).toBeGreaterThan(0);
  });

  it('filters deals by status, marketId, and text query', async () => {
    const all = await apiClient.getDeals();
    const executedOnly = await apiClient.getDeals({ status: 'EXECUTED' });
    expect(executedOnly.deals.every(d => d.status === 'EXECUTED')).toBe(true);

    const nlOnly = await apiClient.getDeals({ marketId: 'NL_ERE' });
    expect(nlOnly.deals.every(d => d.marketId === 'NL_ERE')).toBe(true);

    const searchRes = await apiClient.getDeals({ searchQuery: 'manure' });
    expect(searchRes.deals.length).toBeGreaterThan(0);
    expect(searchRes.deals.some(d => d.tradeTitle.toLowerCase().includes('manure'))).toBe(true);
  });

  it('creates and appends a new deal into the ledger with initial audit entry', async () => {
    const createRes = await apiClient.createDeal(
      {
        tradeTitle: 'Test Danish Manure → DE THG',
        marketId: 'DE_THG',
        marketName: 'German THG-Quote',
        originCountry: 'DK',
        volumeMWh: 50000,
        netbackEur: 175.50,
      },
      'Trader Chris',
      'TRADER',
      'Test deal creation'
    );

    expect(createRes.success).toBe(true);
    expect(createRes.deal).toBeDefined();
    const deal = createRes.deal!;
    expect(deal.status).toBe('DRAFT');
    expect(deal.volumeMWh).toBe(50000);
    expect(deal.auditTrail.length).toBe(1);
    expect(deal.auditTrail[0].newStatus).toBe('DRAFT');
    expect(deal.auditTrail[0].actor).toBe('Trader Chris');
    expect(deal.auditTrail[0].note).toBe('Test deal creation');

    // Verify it is retrievable by ID
    const fetchRes = await apiClient.getDealById(deal.id);
    expect(fetchRes.success).toBe(true);
    expect(fetchRes.deal?.id).toBe(deal.id);
  });

  it('transitions deal lifecycle status and logs audit entry', async () => {
    const createRes = await apiClient.createDeal({
      tradeTitle: 'Lifecycle Test Deal',
      marketId: 'NL_ERE',
      volumeMWh: 25000,
    });
    const dealId = createRes.deal!.id;

    // Transition DRAFT -> RFQ
    const rfqRes = await apiClient.transitionDeal(dealId, 'RFQ', 'Trader Chris', 'TRADER', 'Issued RFQ');
    expect(rfqRes.success).toBe(true);
    expect(rfqRes.deal?.status).toBe('RFQ');

    // Transition RFQ -> PRICED
    const pricedRes = await apiClient.transitionDeal(dealId, 'PRICED', 'Trader Chris', 'TRADER', 'Priced @ €169');
    expect(pricedRes.success).toBe(true);
    expect(pricedRes.deal?.status).toBe('PRICED');

    // Transition PRICED -> EXECUTED
    const execRes = await apiClient.transitionDeal(dealId, 'EXECUTED', 'Trader Chris', 'TRADER', 'Executed deal');
    expect(execRes.success).toBe(true);
    expect(execRes.deal?.status).toBe('EXECUTED');

    // Check complete audit trail
    const auditRes = await apiClient.getDealAudit(dealId);
    expect(auditRes.success).toBe(true);
    expect(auditRes.audit.length).toBe(4);
    expect(auditRes.audit[3].previousStatus).toBe('PRICED');
    expect(auditRes.audit[3].newStatus).toBe('EXECUTED');
  });

  it('enforces RBAC role constraint when transitioning deal to SETTLED', async () => {
    const createRes = await apiClient.createDeal({
      tradeTitle: 'Settlement Security Test',
      marketId: 'FR_CPB',
      status: 'EXECUTED',
    });
    const dealId = createRes.deal!.id;

    // TRADER role should be blocked from settling
    const traderSettle = await apiClient.transitionDeal(dealId, 'SETTLED', 'Trader Chris', 'TRADER', 'Unauthorized settle');
    expect(traderSettle.success).toBe(false);
    expect(traderSettle.error).toContain('Settlement requires');

    // RISK_MANAGER role should succeed
    const riskSettle = await apiClient.transitionDeal(dealId, 'SETTLED', 'Risk Manager Sarah', 'RISK_MANAGER', 'Validated MtM and settled');
    expect(riskSettle.success).toBe(true);
    expect(riskSettle.deal?.status).toBe('SETTLED');
  });

  it('persists marks and retrieves broker audit records', async () => {
    const auditRes = await apiClient.getMarksAudit();
    expect(auditRes.success).toBe(true);
    expect(auditRes.count).toBeGreaterThanOrEqual(1);

    const testRecord: MarksAuditRecord = {
      id: `AUDIT-TEST-${Date.now()}`,
      timestamp: new Date().toISOString(),
      brokerSource: 'ICIS Daily Assessment',
      assessmentDate: '2026-08-16',
      trader: 'Chris M.',
      recordsCommitted: 1,
      diffSummary: [
        {
          marketId: 'DE_THG',
          marketName: 'German THG-Quote',
          unit: 'EUR/kg',
          oldMid: 0.85,
          newMid: 0.88,
          oldBid: 0.83,
          newBid: 0.86,
          oldOffer: 0.87,
          newOffer: 0.90,
          changePct: 3.53,
        },
      ],
      rawSnippet: 'ICIS assessment DE_THG 0.88',
    };

    const appendRes = await apiClient.appendMarksAudit(testRecord);
    expect(appendRes.success).toBe(true);

    const historyRes = await apiClient.getMarksAudit();
    expect(historyRes.history.some(h => h.id === testRecord.id)).toBe(true);
  });

  it('interacts with auth session and role management', async () => {
    const sessionRes = await apiClient.getSession();
    expect(sessionRes.success).toBe(true);
    expect(sessionRes.session.user).toBeDefined();

    const switchRes = await apiClient.switchRole('RISK_MANAGER');
    expect(switchRes.success).toBe(true);
    expect(switchRes.session.activeRole).toBe('RISK_MANAGER');

    const rolesRes = await apiClient.getRoles();
    expect(rolesRes.success).toBe(true);
    expect(rolesRes.roles.length).toBe(3);
  });
});
