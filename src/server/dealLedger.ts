import { DealRecord, DealStatus, DealAuditEntry, DealFilterCriteria } from '../domain/deals/types';
import { Role } from '../domain/auth/types';

export const INITIAL_LEDGER_DEALS: DealRecord[] = [
  {
    id: 'DOS-2026-0142',
    status: 'EXECUTED',
    createdAt: '2026-08-14T10:15:00.000Z',
    updatedAt: '2026-08-15T14:30:00.000Z',
    tradeTitle: 'Danish manure → NL ERE',
    counterparty: 'Vitol Gas & Power B.V.',
    marketId: 'NL_ERE',
    marketName: 'Netherlands ERE (Transport Quota)',
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstock: 'manure',
    feedstockName: 'Raw Manure / Slurry',
    volumeMWh: 40000,
    carbonIntensity: -100,
    netbackEur: 169.30,
    deskMarginEur: 16.93,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Base placement executed under EFET General Agreement. Mass balance held inside Energinet-Gasunie UDB corridor.',
    auditTrail: [
      {
        id: 'AUD-DOS-0142-1',
        dealId: 'DOS-2026-0142',
        timestamp: '2026-08-14T10:15:00.000Z',
        previousStatus: null,
        newStatus: 'DRAFT',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Initial deal structure originated from Nature Energy Midtfyn sourcing route.',
      },
      {
        id: 'AUD-DOS-0142-2',
        dealId: 'DOS-2026-0142',
        timestamp: '2026-08-14T11:45:00.000Z',
        previousStatus: 'DRAFT',
        newStatus: 'RFQ',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Firm RFQ issued to Vitol Gas & Power desk for 40,000 MWh Cal-2027 delivery.',
      },
      {
        id: 'AUD-DOS-0142-3',
        dealId: 'DOS-2026-0142',
        timestamp: '2026-08-14T15:20:00.000Z',
        previousStatus: 'RFQ',
        newStatus: 'PRICED',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Pricing agreed at €169.30/MWh netback with €16.93 desk margin.',
      },
      {
        id: 'AUD-DOS-0142-4',
        dealId: 'DOS-2026-0142',
        timestamp: '2026-08-15T14:30:00.000Z',
        previousStatus: 'PRICED',
        newStatus: 'EXECUTED',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'EFET confirmation signed and booked into desk trade ledger.',
      },
    ],
  },
  {
    id: 'DOS-2026-0139',
    status: 'PRICED',
    createdAt: '2026-08-12T09:00:00.000Z',
    updatedAt: '2026-08-13T16:00:00.000Z',
    tradeTitle: 'Danish manure → DE THG (2× branch)',
    counterparty: 'Shell Energy Europe',
    marketId: 'DE_THG',
    marketName: 'German THG-Quote (Double-Counted)',
    originCountry: 'DK',
    originCountryName: 'Denmark',
    feedstock: 'manure',
    feedstockName: 'Raw Manure / Slurry',
    volumeMWh: 60000,
    carbonIntensity: -100,
    netbackEur: 177.65,
    deskMarginEur: 17.77,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Upside branch pricing assuming double counting retained for biomethane under BImSchV 38.',
    auditTrail: [
      {
        id: 'AUD-DOS-0139-1',
        dealId: 'DOS-2026-0139',
        timestamp: '2026-08-12T09:00:00.000Z',
        previousStatus: null,
        newStatus: 'DRAFT',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Originated deal consignment for 60,000 MWh.',
      },
      {
        id: 'AUD-DOS-0139-2',
        dealId: 'DOS-2026-0139',
        timestamp: '2026-08-13T16:00:00.000Z',
        previousStatus: 'DRAFT',
        newStatus: 'PRICED',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Priced with risk desk approved €0.85/kg THG quote mark.',
      },
    ],
  },
  {
    id: 'DOS-2026-0118',
    status: 'RFQ',
    createdAt: '2026-07-28T14:10:00.000Z',
    updatedAt: '2026-07-28T15:00:00.000Z',
    tradeTitle: 'Spanish slurry → FR CPB',
    counterparty: 'TotalEnergies Gas & Power',
    marketId: 'FR_CPB',
    marketName: 'France CPB (TIRUERT Biomethane)',
    originCountry: 'ES',
    originCountryName: 'Spain',
    feedstock: 'manure',
    feedstockName: 'Raw Manure / Slurry',
    volumeMWh: 20000,
    carbonIntensity: -80,
    netbackEur: 26.12,
    deskMarginEur: 2.61,
    gasIndexEur: 38.50,
    currency: 'EUR',
    notes: 'Capped by €100/MWh French statutory ceiling. Viable while Spanish spread stays below €58.',
    auditTrail: [
      {
        id: 'AUD-DOS-0118-1',
        dealId: 'DOS-2026-0118',
        timestamp: '2026-07-28T14:10:00.000Z',
        previousStatus: null,
        newStatus: 'DRAFT',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Originated from Campillos slurry plant.',
      },
      {
        id: 'AUD-DOS-0118-2',
        dealId: 'DOS-2026-0118',
        timestamp: '2026-07-28T15:00:00.000Z',
        previousStatus: 'DRAFT',
        newStatus: 'RFQ',
        actor: 'Chris M.',
        actorRole: 'TRADER',
        note: 'Indicative term sheet delivered to TotalEnergies origination desk.',
      },
    ],
  },
];

class DealLedger {
  private deals: Map<string, DealRecord> = new Map();

  constructor() {
    this.reset();
  }

  public reset(): void {
    this.deals.clear();
    for (const d of INITIAL_LEDGER_DEALS) {
      this.deals.set(d.id, JSON.parse(JSON.stringify(d)));
    }
  }

  public getDeals(filters?: DealFilterCriteria): DealRecord[] {
    let list = Array.from(this.deals.values()).sort(
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

  public getDealById(id: string): DealRecord | null {
    const deal = this.deals.get(id);
    return deal ? JSON.parse(JSON.stringify(deal)) : null;
  }

  public createDeal(
    input: Partial<DealRecord>,
    actor = 'Desk Trader',
    actorRole: Role = 'TRADER',
    note?: string
  ): DealRecord {
    const id = input.id || `DEAL-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();
    const initialStatus: DealStatus = input.status || 'DRAFT';

    const auditEntry: DealAuditEntry = {
      id: `AUD-${id}-${Date.now()}`,
      dealId: id,
      timestamp: now,
      previousStatus: null,
      newStatus: initialStatus,
      actor,
      actorRole,
      note: note || `Deal originated and logged as ${initialStatus}`,
    };

    const record: DealRecord = {
      id,
      status: initialStatus,
      createdAt: input.createdAt || now,
      updatedAt: now,
      tradeTitle: input.tradeTitle || 'New Biomethane Trade',
      counterparty: input.counterparty || 'Bilateral Counterparty',
      marketId: input.marketId || 'DE_THG',
      marketName: input.marketName || 'German THG-Quote',
      originCountry: input.originCountry || 'DE',
      originCountryName: input.originCountryName || 'Germany',
      feedstock: input.feedstock || 'manure',
      feedstockName: input.feedstockName || 'Raw Manure / Slurry',
      volumeMWh: input.volumeMWh || 10000,
      carbonIntensity: input.carbonIntensity ?? -100,
      netbackEur: input.netbackEur ?? 0,
      deskMarginEur: input.deskMarginEur ?? 0,
      gasIndexEur: input.gasIndexEur ?? null,
      currency: input.currency || 'EUR',
      notes: input.notes || '',
      auditTrail: [auditEntry],
      assessment: input.assessment,
    };

    this.deals.set(id, record);
    return JSON.parse(JSON.stringify(record));
  }

  public transitionDeal(
    id: string,
    newStatus: DealStatus,
    actor = 'Desk Trader',
    actorRole: Role = 'TRADER',
    note = ''
  ): { success: boolean; deal?: DealRecord; error?: string } {
    const existing = this.deals.get(id);
    if (!existing) {
      return { success: false, error: `Deal ${id} not found in ledger` };
    }

    if (existing.status === newStatus) {
      return { success: true, deal: JSON.parse(JSON.stringify(existing)) };
    }

    // Role-based validation rules for lifecycle transitions
    if (newStatus === 'SETTLED') {
      if (actorRole !== 'RISK_MANAGER' && actorRole !== 'COMPLIANCE_OFFICER') {
        return {
          success: false,
          error: `Settlement requires RISK_MANAGER or COMPLIANCE_OFFICER authorization (current: ${actorRole})`,
        };
      }
    }

    if (newStatus === 'EXECUTED' && existing.status !== 'PRICED' && existing.status !== 'RFQ') {
      // Direct execution without pricing or RFQ requires risk sign-off
      if (actorRole !== 'RISK_MANAGER' && actorRole !== 'TRADER') {
        return {
          success: false,
          error: `Execution requires TRADER or RISK_MANAGER role (current: ${actorRole})`,
        };
      }
    }

    const now = new Date().toISOString();
    const auditEntry: DealAuditEntry = {
      id: `AUD-${id}-${Date.now()}`,
      dealId: id,
      timestamp: now,
      previousStatus: existing.status,
      newStatus,
      actor,
      actorRole,
      note: note || `Status transitioned from ${existing.status} to ${newStatus}`,
    };

    existing.status = newStatus;
    existing.updatedAt = now;
    existing.auditTrail.push(auditEntry);

    this.deals.set(id, existing);
    return { success: true, deal: JSON.parse(JSON.stringify(existing)) };
  }

  public getDealAudit(id: string): DealAuditEntry[] {
    const deal = this.deals.get(id);
    return deal ? [...deal.auditTrail] : [];
  }
}

export const dealLedger = new DealLedger();
