import { describe, it, expect, beforeEach } from 'vitest';
import {
  REGISTRY_METADATA_TABLE,
  BASELINE_INJECTION_BATCHES,
  BASELINE_ACCOUNTS,
  BASELINE_BALANCE_OF_TRADE,
  PROTOCOL_INTEROPERABILITY_MATRIX,
  EU_REGISTRY_SET,
  verifyRegistryTransfer,
  advanceTitleTransferStatus,
  REGISTRY_CONNECTORS,
  getRegistryConnector,
  EnerginetConnectorAdapter,
  DenaConnectorAdapter,
  GgcsUkConnectorAdapter,
  CrossBorderTransferRequest,
  InjectionBatch,
  parseRegistryFile,
  fetchEnerginetBiomethaneInjections,
} from '../registries';

describe('European Registry Domain & Baseline Datasets', () => {
  it('defines comprehensive metadata for all 8 supported registries', () => {
    const registryIds = [
      'DENA',
      'VERTICER',
      'ENERGINET',
      'ENAGAS',
      'GSE',
      'EEX',
      'AGCS',
      'GGCS_UK',
    ] as const;

    for (const id of registryIds) {
      const meta = REGISTRY_METADATA_TABLE[id];
      expect(meta).toBeDefined();
      expect(meta.id).toBe(id);
      expect(meta.name.length).toBeGreaterThan(3);
      expect(meta.countryCode).toBeDefined();
      expect(meta.primaryProtocols.length).toBeGreaterThan(0);
      expect(meta.statutoryLegalBasis.length).toBeGreaterThan(5);
    }
  });

  it('correctly partitions EU Single Area registries vs Non-EU third countries', () => {
    expect(EU_REGISTRY_SET.has('DENA')).toBe(true);
    expect(EU_REGISTRY_SET.has('VERTICER')).toBe(true);
    expect(EU_REGISTRY_SET.has('ENERGINET')).toBe(true);
    expect(EU_REGISTRY_SET.has('ENAGAS')).toBe(true);
    expect(EU_REGISTRY_SET.has('GSE')).toBe(true);
    expect(EU_REGISTRY_SET.has('EEX')).toBe(true);
    expect(EU_REGISTRY_SET.has('AGCS')).toBe(true);
    expect(EU_REGISTRY_SET.has('GGCS_UK')).toBe(false);
  });

  it('provides a high-density baseline dataset of verified European injection batches', () => {
    expect(BASELINE_INJECTION_BATCHES.length).toBeGreaterThanOrEqual(12);

    // Verify key fields on every batch
    for (const batch of BASELINE_INJECTION_BATCHES) {
      expect(batch.id).toMatch(/^BATCH-[A-Z]{2}-2026-\d{3}$/);
      expect(batch.volumeMWh).toBeGreaterThan(0);
      expect(batch.volumeNm3).toBeGreaterThan(0);
      expect(batch.grossCalorificValueKwhNm3).toBeGreaterThanOrEqual(9.5);
      expect(batch.grossCalorificValueKwhNm3).toBeLessThanOrEqual(12.0);
      expect(batch.sustainabilityProofId).toBeDefined();
      expect(batch.status).toBe('ISSUED');
    }

    // Verify deep negative CI batches exist for manure
    const negativeCiBatches = BASELINE_INJECTION_BATCHES.filter(b => b.verifiedCI < -80);
    expect(negativeCiBatches.length).toBeGreaterThanOrEqual(3);
  });

  it('accurately models European Balance of Trade macro positions', () => {
    const dkTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'ENERGINET');
    expect(dkTrade).toBeDefined();
    expect(dkTrade?.tradeRole).toBe('NET_EXPORTER');
    expect(dkTrade?.netTradeBalanceMWh).toBeGreaterThan(0);
    expect(dkTrade?.exportSharePercent).toBeGreaterThan(70);

    const deTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'DENA');
    expect(deTrade).toBeDefined();
    expect(deTrade?.tradeRole).toBe('NET_IMPORTER');
    expect(deTrade?.netTradeBalanceMWh).toBeLessThan(0);

    const nlTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'VERTICER');
    expect(nlTrade).toBeDefined();
    expect(nlTrade?.tradeRole).toBe('NET_IMPORTER');
    expect(nlTrade?.netTradeBalanceMWh).toBeLessThan(0);

    const esTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'ENAGAS');
    expect(esTrade).toBeDefined();
    expect(esTrade?.tradeRole).toBe('NET_EXPORTER');
    expect(esTrade?.netTradeBalanceMWh).toBeGreaterThan(0);
  });
});

describe('Registry Connectors & Adapter Implementations', () => {
  let energinetConn: EnerginetConnectorAdapter;
  let denaConn: DenaConnectorAdapter;
  let ukConn: GgcsUkConnectorAdapter;

  beforeEach(() => {
    energinetConn = new EnerginetConnectorAdapter();
    denaConn = new DenaConnectorAdapter();
    ukConn = new GgcsUkConnectorAdapter();
  });

  it('retrieves registry connectors via registry identifier', () => {
    const conn = getRegistryConnector('DENA');
    expect(conn.registryId).toBe('DENA');
    expect(conn.countryCode).toBe('DE');
    expect(conn.isEUSingleArea).toBe(true);
  });

  it('lists and filters injection batches by criteria', () => {
    const dkBatches = energinetConn.listInjectionBatches();
    expect(dkBatches.length).toBeGreaterThanOrEqual(3);

    const manureBatches = energinetConn.listInjectionBatches({ annexClassification: 'IX_A' });
    expect(manureBatches.length).toBe(dkBatches.length);

    const udbRecorded = energinetConn.listInjectionBatches({ udbStatus: 'RECORDED' });
    expect(udbRecorded.length).toBe(dkBatches.length);
  });

  it('executes certificate cancellation workflow with audit confirmation', () => {
    const batches = energinetConn.listInjectionBatches();
    const targetBatch = batches[0];

    const result = energinetConn.cancelCertificates([targetBatch.id], 'Surrendered for domestic transit loss');
    expect(result.success).toBe(true);
    expect(result.cancelledMWh).toBe(targetBatch.volumeMWh);
    expect(result.confirmationId).toContain('CANCEL-ENERGINET');

    // Batch status should be updated
    const updated = energinetConn.getBatchById(targetBatch.id);
    expect(updated?.status).toBe('CANCELLED_RETIRED');
  });

  it('executes valid transfer updating batch statuses', () => {
    const batches = energinetConn.listInjectionBatches();
    const batch1 = batches[0];

    const req: CrossBorderTransferRequest = {
      id: 'REQ-TRANSFER-001',
      sourceRegistry: 'ENERGINET',
      sourceAccountId: 'ACC-DK-DESK-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-DESK-01',
      targetMarketId: 'DE_THG',
      batchIds: [batch1.id],
      totalVolumeMWh: batch1.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: new Date().toISOString(),
    };

    const res = energinetConn.executeTransfer(req);
    expect(res.success).toBe(true);
    expect(res.verification.isCompatible).toBe(true);
    expect(res.transferredVolumeMWh).toBe(batch1.volumeMWh);

    const updated = energinetConn.getBatchById(batch1.id);
    expect(updated?.status).toBe('TRANSFERRED');
  });
});

describe('Deterministic UDB Verification & Cross-Border Rules', () => {
  it('approves compliant cross-border transfer between EU registries (Energinet -> dena)', () => {
    const dkBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'ENERGINET')!;

    const req: CrossBorderTransferRequest = {
      id: 'REQ-DK-DE-01',
      sourceRegistry: 'ENERGINET',
      sourceAccountId: 'ACC-DK-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [dkBatch.id],
      totalVolumeMWh: dkBatch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verification = verifyRegistryTransfer(req, [dkBatch]);
    expect(verification.isCompatible).toBe(true);
    expect(verification.blockingReasons.length).toBe(0);
    expect(verification.udbTitleTransferStatus).toBe('ESCROW_LOCKED');
    expect(verification.verifiedVolumeMWh).toBe(dkBatch.volumeMWh);
    expect(verification.statutoryCitations).toContain(
      'Directive (EU) 2023/2413 (RED III) Article 31a — Union Database for Renewable Fuels'
    );
  });

  it('strictly blocks non-EU grid injection from EU UDB transfer (GGCS_UK -> DENA)', () => {
    const ukBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'GGCS_UK')!;

    const req: CrossBorderTransferRequest = {
      id: 'REQ-UK-DE-BLOCKED',
      sourceRegistry: 'GGCS_UK',
      sourceAccountId: 'ACC-GB-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [ukBatch.id],
      totalVolumeMWh: ukBatch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verification = verifyRegistryTransfer(req, [ukBatch]);
    expect(verification.isCompatible).toBe(false);
    expect(verification.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');
    expect(verification.blockingReasons.some(r => r.includes('non-EU transmission grid'))).toBe(true);
  });

  it('permits UK transfer when bilateral mutual recognition treaty is simulated active', () => {
    const ukBatch = BASELINE_INJECTION_BATCHES.find(b => b.registryId === 'GGCS_UK')!;

    const req: CrossBorderTransferRequest = {
      id: 'REQ-UK-DE-TREATY',
      sourceRegistry: 'GGCS_UK',
      sourceAccountId: 'ACC-GB-01',
      targetRegistry: 'GSE',
      targetAccountId: 'ACC-IT-01',
      targetMarketId: 'IT_CIC',
      batchIds: [ukBatch.id],
      totalVolumeMWh: ukBatch.volumeMWh,
      transferProtocol: 'BILATERAL_RECOGNITION',
      udbTitleTransferRequired: true,
      bilateralTreatyActive: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verification = verifyRegistryTransfer(req, [ukBatch]);
    expect(verification.isCompatible).toBe(true);
    expect(verification.udbTitleTransferStatus).toBe('ESCROW_LOCKED');
    expect(verification.auditNotes.some(n => n.includes('bilateral mutual recognition'))).toBe(true);
  });

  it('blocks off-grid segregated batch from grid mass balance transfer', () => {
    const offGridBatch = BASELINE_INJECTION_BATCHES.find(b => b.gridInterconnectionStatus === 'OFF_GRID_SEGREGATED')!;

    const req: CrossBorderTransferRequest = {
      id: 'REQ-OFFGRID-01',
      sourceRegistry: 'AGCS',
      sourceAccountId: 'ACC-AT-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [offGridBatch.id],
      totalVolumeMWh: offGridBatch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verification = verifyRegistryTransfer(req, [offGridBatch]);
    expect(verification.isCompatible).toBe(false);
    expect(verification.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');
    expect(verification.blockingReasons.some(r => r.includes('off-grid / segregated'))).toBe(true);
  });

  it('detects volume discrepancy and retired batch transfers', () => {
    const validBatch = BASELINE_INJECTION_BATCHES[0];

    const reqOverVolume: CrossBorderTransferRequest = {
      id: 'REQ-DISC-01',
      sourceRegistry: 'ENERGINET',
      sourceAccountId: 'ACC-DK-01',
      targetRegistry: 'VERTICER',
      targetAccountId: 'ACC-NL-01',
      targetMarketId: 'NL_ERE',
      batchIds: [validBatch.id],
      totalVolumeMWh: validBatch.volumeMWh + 50000, // exceeds batch
      transferProtocol: 'UDB_DIRECT_TRANSFER',
      udbTitleTransferRequired: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verOver = verifyRegistryTransfer(reqOverVolume, [validBatch]);
    expect(verOver.isCompatible).toBe(false);
    expect(verOver.udbTitleTransferStatus).toBe('REJECTED_DISCREPANCY');
    expect(verOver.blockingReasons.some(r => r.includes('exceeds verified available batch sum'))).toBe(true);

    const retiredBatch: InjectionBatch = {
      ...validBatch,
      id: 'BATCH-RETIRED-TEST',
      status: 'CANCELLED_RETIRED',
    };

    const reqRetired: CrossBorderTransferRequest = {
      id: 'REQ-DISC-02',
      sourceRegistry: 'ENERGINET',
      sourceAccountId: 'ACC-DK-01',
      targetRegistry: 'VERTICER',
      targetAccountId: 'ACC-NL-01',
      targetMarketId: 'NL_ERE',
      batchIds: [retiredBatch.id],
      totalVolumeMWh: retiredBatch.volumeMWh,
      transferProtocol: 'UDB_DIRECT_TRANSFER',
      udbTitleTransferRequired: true,
      requestedAt: '2026-02-10T10:00:00Z',
    };

    const verRetired = verifyRegistryTransfer(reqRetired, [retiredBatch]);
    expect(verRetired.isCompatible).toBe(false);
    expect(verRetired.udbTitleTransferStatus).toBe('REJECTED_DISCREPANCY');
  });

  it('transitions UDB Title Transfer state machine correctly', () => {
    let status = advanceTitleTransferStatus('DRAFT', 'SUBMIT');
    expect(status).toBe('SUBMITTED');

    status = advanceTitleTransferStatus(status, 'LOCK_ESCROW');
    expect(status).toBe('ESCROW_LOCKED');

    status = advanceTitleTransferStatus(status, 'TRANSFER_TITLE');
    expect(status).toBe('TITLE_TRANSFERRED');

    status = advanceTitleTransferStatus(status, 'FAIL_BOUNDARY');
    expect(status).toBe('REJECTED_BOUNDARY_VIOLATION');

    status = advanceTitleTransferStatus(status, 'RESET');
    expect(status).toBe('DRAFT');
  });

  it('parses dena CSV statements and calculates Annex IX-A volume correctly', () => {
    const csvContent = `batchId;plantName;country;volumeMWh;feedstock;ci;scheme\n` +
      `DE-DENA-2026-881;Bioenergie Güstrow;DE;25000;Agricultural Manure;-98.5;ISCC EU\n` +
      `DE-DENA-2026-882;Könnern Biomethane Hub;DE;15000;Organic Waste Slurry;18.2;REDcert EU\n` +
      `DE-DENA-2026-883;Energy Crop Plant;DE;10000;Maize Silage;45.0;REDcert EU`;

    const result = parseRegistryFile(csvContent, 'dena_export_test.csv', 'DENA');
    expect(result.success).toBe(true);
    expect(result.registryId).toBe('DENA');
    expect(result.importedCount).toBe(3);
    expect(result.totalVolumeMWh).toBe(50000);
    expect(result.summary.annexIxAVolumeMWh).toBe(40000);
    expect(result.summary.cropVolumeMWh).toBe(10000);
  });

  it('parses JSON format registry exports correctly', () => {
    const jsonContent = JSON.stringify([
      { id: 'NL-V-01', plantName: 'Attero Wijster', volumeMWh: 20000, feedstock: 'Organic Waste', ci: 15.0 },
      { id: 'NL-V-02', plantName: 'Groningen Upgrader', volumeMWh: 30000, feedstock: 'Swine Manure', ci: -102.0 }
    ]);

    const result = parseRegistryFile(jsonContent, 'verticer_batches.json', 'VERTICER');
    expect(result.success).toBe(true);
    expect(result.registryId).toBe('VERTICER');
    expect(result.importedCount).toBe(2);
    expect(result.totalVolumeMWh).toBe(50000);
    expect(result.summary.annexIxAVolumeMWh).toBe(50000);
  });

  it('fetches Energinet biomethane injection telemetry with fallback', async () => {
    const data = await fetchEnerginetBiomethaneInjections();
    expect(data).toBeDefined();
    expect(data.totalDailyInjectionMWh).toBeGreaterThan(0);
    expect(data.activeInjectionPoints).toBeGreaterThan(0);
    expect(data.batches.length).toBeGreaterThan(0);
  });
});

