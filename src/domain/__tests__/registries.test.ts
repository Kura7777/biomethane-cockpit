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
  RegistryId,
  parseRegistryFile,
  fetchEnerginetBiomethaneInjections,
  fetchOdreBiomethaneInjections,
  fetchEntsogCrossBorderFlows,
  fetchPanEuropeanTsoTelemetry,
} from '../registries';

describe('European Registry Domain & Pan-European 22-Country Baseline Datasets', () => {
  const all22RegistryIds: RegistryId[] = [
    'DENA',
    'VERTICER',
    'ENERGINET',
    'ENAGAS',
    'GSE',
    'EEX',
    'AGCS',
    'GGCS_UK',
    'BRUGEL_BE',
    'ENERGISVERIGE_SE',
    'PRONOVO_CH',
    'GASGRID_FI',
    'GASSCO_NO',
    'URE_PL',
    'OTE_CZ',
    'REN_PT',
    'GNI_IE',
    'MEKH_HU',
    'ELERING_EE',
    'CONEXUS_LV',
    'AMBERGRID_LT',
    'OKTE_SK',
  ];

  it('defines comprehensive metadata for all 22 European registries', () => {
    expect(Object.keys(REGISTRY_METADATA_TABLE).length).toBe(22);

    for (const id of all22RegistryIds) {
      const meta = REGISTRY_METADATA_TABLE[id];
      expect(meta).toBeDefined();
      expect(meta.id).toBe(id);
      expect(meta.name.length).toBeGreaterThan(3);
      expect(meta.countryCode.length).toBe(2);
      expect(meta.countryName.length).toBeGreaterThan(2);
      expect(meta.operator.length).toBeGreaterThan(3);
      expect(meta.hubConnection.length).toBeGreaterThan(3);
      expect(meta.primaryProtocols.length).toBeGreaterThan(0);
      expect(meta.statutoryLegalBasis.length).toBeGreaterThan(5);
    }
  });

  it('correctly partitions EU Single Area registries (19) vs Non-EU third countries (3)', () => {
    // 19 EU Member States
    const expectedEURegistries: RegistryId[] = [
      'DENA', 'VERTICER', 'ENERGINET', 'ENAGAS', 'GSE', 'EEX', 'AGCS',
      'BRUGEL_BE', 'ENERGISVERIGE_SE', 'GASGRID_FI', 'URE_PL', 'OTE_CZ',
      'REN_PT', 'GNI_IE', 'MEKH_HU', 'ELERING_EE', 'CONEXUS_LV', 'AMBERGRID_LT', 'OKTE_SK'
    ];

    expect(EU_REGISTRY_SET.size).toBe(19);
    for (const id of expectedEURegistries) {
      expect(EU_REGISTRY_SET.has(id)).toBe(true);
      expect(REGISTRY_METADATA_TABLE[id].isEUSingleArea).toBe(true);
      expect(REGISTRY_METADATA_TABLE[id].udbDirectIntegration).toBe(true);
    }

    // 3 Non-EU / Third-country Registries
    const nonEURegistries: RegistryId[] = ['GGCS_UK', 'PRONOVO_CH', 'GASSCO_NO'];
    for (const id of nonEURegistries) {
      expect(EU_REGISTRY_SET.has(id)).toBe(false);
      expect(REGISTRY_METADATA_TABLE[id].isEUSingleArea).toBe(false);
      expect(REGISTRY_METADATA_TABLE[id].udbDirectIntegration).toBe(false);
    }
  });

  it('provides verified European injection batches with deep negative CI batches', () => {
    expect(BASELINE_INJECTION_BATCHES.length).toBeGreaterThanOrEqual(20);

    for (const batch of BASELINE_INJECTION_BATCHES) {
      expect(batch.id).toMatch(/^BATCH-[A-Z]{2}-2026-\d{3}$/);
      expect(batch.volumeMWh).toBeGreaterThan(0);
      expect(batch.volumeNm3).toBeGreaterThan(0);
      expect(batch.grossCalorificValueKwhNm3).toBeGreaterThanOrEqual(9.5);
      expect(batch.grossCalorificValueKwhNm3).toBeLessThanOrEqual(12.0);
      expect(batch.sustainabilityProofId).toBeDefined();
      expect(batch.status).toBe('ISSUED');
    }

    const negativeCiBatches = BASELINE_INJECTION_BATCHES.filter(b => b.verifiedCI < -50);
    expect(negativeCiBatches.length).toBeGreaterThanOrEqual(10);
  });

  it('provides baseline accounts for all 22 registries', () => {
    expect(BASELINE_ACCOUNTS.length).toBe(22);
    for (const id of all22RegistryIds) {
      const account = BASELINE_ACCOUNTS.find(a => a.registryId === id);
      expect(account).toBeDefined();
      expect(account?.currentBalanceMWh).toBeGreaterThan(0);
      expect(account?.accountHolderName).toBeDefined();
    }
  });

  it('accurately models European Balance of Trade macro positions across all 22 countries', () => {
    expect(BASELINE_BALANCE_OF_TRADE.length).toBe(22);

    for (const id of all22RegistryIds) {
      const bot = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === id);
      expect(bot).toBeDefined();
      expect(bot?.totalIssuanceMWh).toBeGreaterThan(0);
      expect(bot?.domesticConsumptionMWh).toBeGreaterThan(0);
      expect(['NET_EXPORTER', 'NET_IMPORTER', 'BALANCED_DOMESTIC']).toContain(bot?.tradeRole);
    }

    const dkTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'ENERGINET');
    expect(dkTrade?.tradeRole).toBe('NET_EXPORTER');
    expect(dkTrade?.exportSharePercent).toBeGreaterThan(70);

    const deTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'DENA');
    expect(deTrade?.tradeRole).toBe('NET_IMPORTER');
    expect(deTrade?.netTradeBalanceMWh).toBeLessThan(0);

    const esTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === 'ENAGAS');
    expect(esTrade?.tradeRole).toBe('NET_EXPORTER');
    expect(esTrade?.netTradeBalanceMWh).toBeGreaterThan(0);
  });
});

describe('Registry Connectors & Adapter Implementations (22 Registries)', () => {
  let energinetConn: EnerginetConnectorAdapter;
  let denaConn: DenaConnectorAdapter;
  let ukConn: GgcsUkConnectorAdapter;

  beforeEach(() => {
    energinetConn = new EnerginetConnectorAdapter();
    denaConn = new DenaConnectorAdapter();
    ukConn = new GgcsUkConnectorAdapter();
  });

  it('retrieves registry connectors for all 22 registry identifiers', () => {
    const registryIds: RegistryId[] = [
      'DENA', 'VERTICER', 'ENERGINET', 'ENAGAS', 'GSE', 'EEX', 'AGCS', 'GGCS_UK',
      'BRUGEL_BE', 'ENERGISVERIGE_SE', 'PRONOVO_CH', 'GASGRID_FI', 'GASSCO_NO',
      'URE_PL', 'OTE_CZ', 'REN_PT', 'GNI_IE', 'MEKH_HU', 'ELERING_EE', 'CONEXUS_LV',
      'AMBERGRID_LT', 'OKTE_SK'
    ];

    for (const id of registryIds) {
      const conn = getRegistryConnector(id);
      expect(conn).toBeDefined();
      expect(conn.registryId).toBe(id);
      expect(conn.registryName).toBeDefined();
      expect(REGISTRY_CONNECTORS[id]).toBeDefined();
    }
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

    const execResult = energinetConn.executeTransfer(req);
    expect(execResult.success).toBe(true);
    expect(execResult.transferredVolumeMWh).toBe(batch1.volumeMWh);
    expect(execResult.transferId).toContain('TX-ENERGINET-DENA');

    const updated = energinetConn.getBatchById(batch1.id);
    expect(updated?.status).toBe('TRANSFERRED');
  });
});

describe('Live Flow Monitoring & Multi-TSO API Telemetry', () => {
  it('fetches Energinet biomethane injection telemetry with fallback', async () => {
    const result = await fetchEnerginetBiomethaneInjections();
    expect(result).toBeDefined();
    expect(result.totalDailyInjectionMWh).toBeGreaterThan(0);
    expect(result.activeInjectionPoints).toBeGreaterThan(0);
    expect(result.batches.length).toBeGreaterThan(0);
    expect(typeof result.isLiveFeed).toBe('boolean');
  });

  it('fetches ODRE France biomethane injection telemetry with fallback', async () => {
    const result = await fetchOdreBiomethaneInjections();
    expect(result).toBeDefined();
    expect(result.totalCapacityNm3h).toBeGreaterThan(0);
    expect(result.totalCapacityMWhDay).toBeGreaterThan(0);
    expect(result.points.length).toBeGreaterThan(0);
    expect(result.points[0].countryCode).toBe('FR');
  });

  it('fetches ENTSOG cross-border interconnection physical flows', async () => {
    const points = await fetchEntsogCrossBorderFlows();
    expect(points.length).toBeGreaterThanOrEqual(5);

    const ellund = points.find(p => p.nodeName.includes('Ellund'));
    expect(ellund).toBeDefined();
    expect(ellund?.gridType).toBe('CROSS_BORDER_IP');
    expect(ellund?.flowRateMWhPerHour).toBeGreaterThan(0);
  });

  it('aggregates Pan-European Multi-TSO telemetry into unified metrics bundle', async () => {
    const telemetry = await fetchPanEuropeanTsoTelemetry();
    expect(telemetry).toBeDefined();
    expect(telemetry.totalDailyFlowMWh).toBeGreaterThan(10000);
    expect(telemetry.currentFlowVelocityMWhHour).toBeGreaterThan(1000);
    expect(telemetry.currentFlowVelocityNm3Hour).toBeGreaterThan(50000);
    expect(telemetry.connectedTsoCount).toBeGreaterThanOrEqual(6);
    expect(telemetry.feeds.length).toBeGreaterThanOrEqual(6);
    expect(telemetry.points.length).toBeGreaterThanOrEqual(10);
    expect(telemetry.averageLatencyMs).toBeGreaterThan(0);
  });
});

describe('Deterministic UDB Verification & Cross-Border Rules', () => {
  it('approves compliant intra-EU transfer (DK -> DE via ERGaR CoO / UDB)', () => {
    const sourceBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === 'ENERGINET');
    const batch = sourceBatches[0];

    const req: CrossBorderTransferRequest = {
      id: 'REQ-DK-DE-01',
      sourceRegistry: 'ENERGINET',
      sourceAccountId: 'ACC-DK-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [batch.id],
      totalVolumeMWh: batch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: new Date().toISOString(),
    };

    const verification = verifyRegistryTransfer(req, sourceBatches);
    expect(verification.isCompatible).toBe(true);
    expect(verification.blockingReasons).toHaveLength(0);
    expect(verification.udbTitleTransferStatus).toBe('ESCROW_LOCKED');
    expect(verification.statutoryCitations.length).toBeGreaterThan(0);
  });

  it('approves compliant inter-EU transfers across multiple European hubs', () => {
    // ES -> DE
    const esBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === 'ENAGAS');
    const esBatch = esBatches[0];
    const esReq: CrossBorderTransferRequest = {
      id: 'REQ-ES-DE-01',
      sourceRegistry: 'ENAGAS',
      sourceAccountId: 'ACC-ES-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [esBatch.id],
      totalVolumeMWh: esBatch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: new Date().toISOString(),
    };
    const esVerification = verifyRegistryTransfer(esReq, esBatches);
    expect(esVerification.isCompatible).toBe(true);

    // PL -> DE
    const plBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === 'URE_PL');
    const plBatch = plBatches[0];
    const plReq: CrossBorderTransferRequest = {
      id: 'REQ-PL-DE-01',
      sourceRegistry: 'URE_PL',
      sourceAccountId: 'ACC-PL-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [plBatch.id],
      totalVolumeMWh: plBatch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      requestedAt: new Date().toISOString(),
    };
    const plVerification = verifyRegistryTransfer(plReq, plBatches);
    expect(plVerification.isCompatible).toBe(true);
  });

  it('strictly blocks non-EU third country injection (GB -> DE) without bilateral treaty per RED III Art. 31a', () => {
    const ukBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === 'GGCS_UK');
    const batch = ukBatches[0];

    const req: CrossBorderTransferRequest = {
      id: 'REQ-GB-DE-01',
      sourceRegistry: 'GGCS_UK',
      sourceAccountId: 'ACC-GB-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [batch.id],
      totalVolumeMWh: batch.volumeMWh,
      transferProtocol: 'ERGAR_COO',
      udbTitleTransferRequired: true,
      bilateralTreatyActive: false,
      requestedAt: new Date().toISOString(),
    };

    const verification = verifyRegistryTransfer(req, ukBatches);
    expect(verification.isCompatible).toBe(false);
    expect(verification.udbTitleTransferStatus).toBe('REJECTED_BOUNDARY_VIOLATION');
    expect(verification.blockingReasons.some(r => r.includes('non-EU transmission grid'))).toBe(true);
  });

  it('allows non-EU transfer (GB -> DE) when bilateral treaty is active', () => {
    const ukBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === 'GGCS_UK');
    const batch = ukBatches[0];

    const req: CrossBorderTransferRequest = {
      id: 'REQ-GB-DE-02',
      sourceRegistry: 'GGCS_UK',
      sourceAccountId: 'ACC-GB-01',
      targetRegistry: 'DENA',
      targetAccountId: 'ACC-DE-01',
      targetMarketId: 'DE_THG',
      batchIds: [batch.id],
      totalVolumeMWh: batch.volumeMWh,
      transferProtocol: 'BILATERAL_RECOGNITION',
      udbTitleTransferRequired: true,
      bilateralTreatyActive: true,
      requestedAt: new Date().toISOString(),
    };

    const verification = verifyRegistryTransfer(req, ukBatches);
    expect(verification.isCompatible).toBe(true);
    expect(verification.blockingReasons).toHaveLength(0);
  });

  it('evaluates state transitions in the UDB Title Transfer lifecycle', () => {
    let state = advanceTitleTransferStatus('DRAFT', 'SUBMIT');
    expect(state).toBe('SUBMITTED');

    state = advanceTitleTransferStatus(state, 'LOCK_ESCROW');
    expect(state).toBe('ESCROW_LOCKED');

    state = advanceTitleTransferStatus(state, 'TRANSFER_TITLE');
    expect(state).toBe('TITLE_TRANSFERRED');

    state = advanceTitleTransferStatus(state, 'RESET');
    expect(state).toBe('DRAFT');
  });
});

describe('Registry Universal Statement Ingestion', () => {
  it('parses dena CSV statements correctly', () => {
    const csvContent = `batchId;plantName;country;volumeMWh;feedstock;ci;scheme\n` +
      `DE-DENA-881;Güstrow Bioenergy;DE;25000;Manure;-95.0;ISCC EU\n` +
      `DE-DENA-882;Könnern Hub;DE;12000;Silage Maize;25.0;REDcert EU`;

    const result = parseRegistryFile(csvContent, 'dena_Biogasregister_Export.csv');
    expect(result.success).toBe(true);
    expect(result.registryId).toBe('DENA');
    expect(result.importedCount).toBe(2);
    expect(result.totalVolumeMWh).toBe(37000);
    expect(result.summary.annexIxAVolumeMWh).toBe(25000);
    expect(result.summary.cropVolumeMWh).toBe(12000);
  });

  it('parses VertiCer Netherlands statements correctly', () => {
    const csvContent = `batchId,plantName,country,volumeMWh,feedstock,ci,scheme\n` +
      `NL-VERT-01,Wijster Bio,NL,20000,Waste Slurry,15.0,ISCC EU`;

    const result = parseRegistryFile(csvContent, 'verticer_statement_2026.csv');
    expect(result.success).toBe(true);
    expect(result.registryId).toBe('VERTICER');
    expect(result.importedCount).toBe(1);
    expect(result.totalVolumeMWh).toBe(20000);
  });

  it('detects registry from filename across various European countries', () => {
    expect(parseRegistryFile('[]', 'Enagas_GdO_Spain_2026.json').registryId).toBe('ENAGAS');
    expect(parseRegistryFile('[]', 'GSE_Italy_Biometano.json').registryId).toBe('GSE');
    expect(parseRegistryFile('[]', 'ODRE_France_EEX.json').registryId).toBe('EEX');
    expect(parseRegistryFile('[]', 'AGCS_Austria_Export.json').registryId).toBe('AGCS');
    expect(parseRegistryFile('[]', 'GGCS_UK_Declaration.json').registryId).toBe('GGCS_UK');
    expect(parseRegistryFile('[]', 'Brugel_Belgium_ZTP.json').registryId).toBe('BRUGEL_BE');
    expect(parseRegistryFile('[]', 'Energigas_Sweden_GO.json').registryId).toBe('ENERGISVERIGE_SE');
    expect(parseRegistryFile('[]', 'Gasgrid_Finland_Hub.json').registryId).toBe('GASGRID_FI');
    expect(parseRegistryFile('[]', 'URE_Poland_GazSystem.json').registryId).toBe('URE_PL');
    expect(parseRegistryFile('[]', 'OTE_Czechia_Net4Gas.json').registryId).toBe('OTE_CZ');
  });
});
