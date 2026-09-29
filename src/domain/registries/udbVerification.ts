import {
  CrossBorderTransferRequest,
  RegistryTransferVerification,
  UDBTitleTransferStatus,
  InjectionBatch,
  CertificateTransferProtocol,
  RegistryId,
} from './types';

export const EU_REGISTRY_SET: ReadonlySet<RegistryId> = new Set([
  'DENA',
  'VERTICER',
  'ENERGINET',
  'ENAGAS',
  'GSE',
  'EEX',
  'AGCS',
  'BRUGEL_BE',
  'ENERGISVERIGE_SE',
  'GASGRID_FI',
  'URE_PL',
  'OTE_CZ',
  'REN_PT',
  'GNI_IE',
  'MEKH_HU',
  'ELERING_EE',
  'CONEXUS_LV',
  'AMBERGRID_LT',
  'OKTE_SK',
]);

export const REGISTRY_SUPPORTED_PROTOCOLS: Record<
  RegistryId,
  CertificateTransferProtocol[]
> = {
  DENA: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'AIB_EECS_GAS', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  VERTICER: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'AIB_EECS_GAS', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  ENERGINET: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  ENAGAS: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  GSE: ['AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  EEX: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  AGCS: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  GGCS_UK: ['DOMESTIC_ONLY', 'BILATERAL_RECOGNITION'],
  BRUGEL_BE: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  ENERGISVERIGE_SE: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  PRONOVO_CH: ['DOMESTIC_ONLY', 'BILATERAL_RECOGNITION'],
  GASGRID_FI: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  GASSCO_NO: ['DOMESTIC_ONLY', 'BILATERAL_RECOGNITION'],
  URE_PL: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  OTE_CZ: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  REN_PT: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  GNI_IE: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  MEKH_HU: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  ELERING_EE: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  CONEXUS_LV: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  AMBERGRID_LT: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  OKTE_SK: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
};

export const CITATIONS = {
  RED_III_ART_31A: 'Directive (EU) 2023/2413 (RED III) Article 31a — Union Database for Renewable Fuels (gas module not yet live; launch postponed to end-2026 per EBA)',
  RED_III_ART_30: 'Directive (EU) 2023/2413 (RED III) Article 30 — Verification of Compliance with Sustainability Criteria',
  UDB_IMPL_REG_2022_996: 'Commission Implementing Regulation (EU) 2022/996 Article 18 — Union Database data rules, alongside RED II Art. 28(2)&(4) and RED III Art. 31a',
  UDB_NOT_LIVE: 'European Biogas Association, "Your short guide to the Union Database" — UDB gas module launch postponed to end of 2026; not live for economic operators as of this research',
};

/**
 * Validates whether a cross-border certificate transfer complies with
 * EU RED III Art. 31a / RED II Art. 28(2)&(4) / Implementing Regulation (EU) 2022/996,
 * and inter-registry interoperability agreements. NOTE: the UDB gas module is not yet live
 * (launch postponed to end-2026 per EBA) — this is a desk trade-simulation sandbox, not a
 * live UDB connection.
 */
export function verifyRegistryTransfer(
  req: CrossBorderTransferRequest,
  batches: InjectionBatch[] = []
): RegistryTransferVerification {
  const blockingReasons: string[] = [];
  const auditNotes: string[] = [];
  const statutoryCitations: string[] = [CITATIONS.RED_III_ART_31A, CITATIONS.UDB_NOT_LIVE];

  const isSourceEU = EU_REGISTRY_SET.has(req.sourceRegistry);
  const isTargetEU = EU_REGISTRY_SET.has(req.targetRegistry);

  // 1. Same-registry internal transfer
  if (req.sourceRegistry === req.targetRegistry) {
    auditNotes.push(`Domestic intra-registry transfer within ${req.sourceRegistry}.`);
  }

  // 2. Third-Country / Non-EU Grid Perimeter Enforcement (RED III Art. 31a)
  if (!isSourceEU && isTargetEU) {
    if (req.bilateralTreatyActive) {
      auditNotes.push(
        `Third-country transfer (${req.sourceRegistry} -> ${req.targetRegistry}) verified under active bilateral mutual recognition agreement (RED III Art. 31a).`
      );
    } else {
      blockingReasons.push(
        `Consignment origin gas is injected into a non-EU transmission grid (${req.sourceRegistry}). Under RED III Art. 31a, non-EU grid-injected biomethane cannot participate in EU Union Database mass balance transfers without an enacted bilateral treaty.`
      );
    }
  }

  // 3. Protocol support validation
  const sourceSupported = REGISTRY_SUPPORTED_PROTOCOLS[req.sourceRegistry] || [];
  const targetSupported = REGISTRY_SUPPORTED_PROTOCOLS[req.targetRegistry] || [];

  if (!sourceSupported.includes(req.transferProtocol)) {
    blockingReasons.push(
      `Source registry ${req.sourceRegistry} does not support transfer protocol ${req.transferProtocol}.`
    );
  }

  if (req.sourceRegistry !== req.targetRegistry && !targetSupported.includes(req.transferProtocol)) {
    blockingReasons.push(
      `Target registry ${req.targetRegistry} does not support transfer protocol ${req.transferProtocol}.`
    );
  }

  if (req.transferProtocol === 'DOMESTIC_ONLY' && req.sourceRegistry !== req.targetRegistry) {
    blockingReasons.push(
      `Protocol DOMESTIC_ONLY cannot be used for cross-border transfer between ${req.sourceRegistry} and ${req.targetRegistry}.`
    );
  }

  // 4. Batch Inspection & Discrepancy Verification
  let verifiedBatchesCount = 0;
  let verifiedVolumeMWh = 0;

  if (batches && batches.length > 0) {
    const batchMap = new Map<string, InjectionBatch>(batches.map(b => [b.id, b]));

    for (const bId of req.batchIds) {
      const batch = batchMap.get(bId);
      if (!batch) {
        blockingReasons.push(`Batch ${bId} referenced in transfer request not found in registry inventory.`);
        continue;
      }

      if (batch.status === 'CANCELLED_RETIRED' || batch.status === 'SURRENDERED_COMPLIANCE') {
        blockingReasons.push(
          `Batch ${bId} is in status ${batch.status} and cannot be transferred.`
        );
      }

      // Check physical off-grid constraint
      if (batch.gridInterconnectionStatus === 'OFF_GRID_SEGREGATED' && req.transferProtocol !== 'DOMESTIC_ONLY') {
        blockingReasons.push(
          `Batch ${bId} from plant ${batch.plantName} is off-grid / segregated. Grid-based mass balance protocol ${req.transferProtocol} is prohibited without physical Bio-LNG logistics proof.`
        );
      }

      // Check UDB registration
      if (req.udbTitleTransferRequired && !batch.udbRegistrationId && isSourceEU) {
        auditNotes.push(
          `Batch ${bId} lacks a UDB registration ID. The UDB gas module is not yet live (launch postponed to end-2026 per EBA), so no batch can be formally recorded yet in any case.`
        );
      }

      verifiedBatchesCount += 1;
      verifiedVolumeMWh += batch.volumeMWh;
    }

    if (req.totalVolumeMWh > verifiedVolumeMWh) {
      blockingReasons.push(
        `Requested transfer volume (${req.totalVolumeMWh} MWh) exceeds verified available batch sum (${verifiedVolumeMWh} MWh).`
      );
    }
  } else if (req.batchIds.length > 0) {
    // Batches requested but list not provided for verification
    verifiedBatchesCount = req.batchIds.length;
    verifiedVolumeMWh = req.totalVolumeMWh;
    auditNotes.push('Batch-level verification skipped; volume verified against account balance.');
  }

  // 5. Determine UDB Title Transfer Status and Compatibility
  let udbTitleTransferStatus: UDBTitleTransferStatus = 'DRAFT';

  if (blockingReasons.some(r => r.includes('non-EU transmission grid') || r.includes('off-grid / segregated'))) {
    udbTitleTransferStatus = 'REJECTED_BOUNDARY_VIOLATION';
  } else if (blockingReasons.length > 0) {
    udbTitleTransferStatus = 'REJECTED_DISCREPANCY';
  } else if (req.udbTitleTransferRequired) {
    statutoryCitations.push(CITATIONS.UDB_IMPL_REG_2022_996);
    udbTitleTransferStatus = 'PENDING_UDB_LAUNCH';
    auditNotes.push(
      'Boundary and protocol checks pass. The UDB gas module is not yet live (launch postponed to end-2026 per EBA) so this batch cannot be formally recorded in the UDB yet; in the meantime, cross-border compliance relies on national registries and ERGaR/AIB routes.'
    );
  } else {
    udbTitleTransferStatus = 'NOT_APPLICABLE';
  }

  const isCompatible = blockingReasons.length === 0;

  return {
    isCompatible,
    protocol: req.transferProtocol,
    udbTitleTransferStatus,
    blockingReasons,
    auditNotes,
    verifiedBatchesCount,
    verifiedVolumeMWh,
    statutoryCitations,
  };
}

/**
 * State machine transition evaluator for UDB Title Transfer lifecycle.
 */
export function advanceTitleTransferStatus(
  current: UDBTitleTransferStatus,
  action: 'SUBMIT' | 'MARK_PENDING_LAUNCH' | 'TRANSFER_TITLE' | 'FAIL_BOUNDARY' | 'FAIL_DISCREPANCY' | 'RESET'
): UDBTitleTransferStatus {
  switch (action) {
    case 'RESET':
      return 'DRAFT';
    case 'FAIL_BOUNDARY':
      return 'REJECTED_BOUNDARY_VIOLATION';
    case 'FAIL_DISCREPANCY':
      return 'REJECTED_DISCREPANCY';
    case 'SUBMIT':
      return current === 'DRAFT' ? 'SUBMITTED' : current;
    case 'MARK_PENDING_LAUNCH':
      return current === 'SUBMITTED' || current === 'DRAFT' ? 'PENDING_UDB_LAUNCH' : current;
    case 'TRANSFER_TITLE':
      return current === 'PENDING_UDB_LAUNCH' ? 'TITLE_TRANSFERRED' : current;
    default:
      return current;
  }
}
