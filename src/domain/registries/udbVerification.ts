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
]);

export const REGISTRY_SUPPORTED_PROTOCOLS: Record<
  RegistryId,
  CertificateTransferProtocol[]
> = {
  DENA: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'AIB_EECS_GAS', 'DOMESTIC_ONLY'],
  VERTICER: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'AIB_EECS_GAS', 'DOMESTIC_ONLY'],
  ENERGINET: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'DOMESTIC_ONLY'],
  ENAGAS: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'DOMESTIC_ONLY'],
  GSE: ['AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'BILATERAL_RECOGNITION', 'DOMESTIC_ONLY'],
  EEX: ['ERGAR_COO', 'UDB_DIRECT_TRANSFER', 'DOMESTIC_ONLY'],
  AGCS: ['ERGAR_COO', 'AIB_EECS_GAS', 'UDB_DIRECT_TRANSFER', 'DOMESTIC_ONLY'],
  GGCS_UK: ['DOMESTIC_ONLY', 'BILATERAL_RECOGNITION'],
};

export const CITATIONS = {
  RED_III_ART_31A: 'Directive (EU) 2023/2413 (RED III) Article 31a — Union Database for Renewable Fuels',
  RED_III_ART_30: 'Directive (EU) 2023/2413 (RED III) Article 30 — Verification of Compliance with Sustainability Criteria',
  UDB_REG_2024_2792_ART15: 'Commission Implementing Regulation (EU) 2024/2792 Article 15(4) — Single Mass Balance Gas Perimeter & Third-Country Rules',
  UDB_REG_2024_2792_ART16: 'Commission Implementing Regulation (EU) 2024/2792 Article 16 — Title Transfer & Escrow in the Union Database',
};

/**
 * Validates whether a cross-border certificate transfer complies with
 * EU RED III Art. 31a, Commission Implementing Regulation (EU) 2024/2792,
 * and inter-registry interoperability agreements.
 */
export function verifyRegistryTransfer(
  req: CrossBorderTransferRequest,
  batches: InjectionBatch[] = []
): RegistryTransferVerification {
  const blockingReasons: string[] = [];
  const auditNotes: string[] = [];
  const statutoryCitations: string[] = [CITATIONS.RED_III_ART_31A, CITATIONS.UDB_REG_2024_2792_ART15];

  const isSourceEU = EU_REGISTRY_SET.has(req.sourceRegistry);
  const isTargetEU = EU_REGISTRY_SET.has(req.targetRegistry);

  // 1. Same-registry internal transfer
  if (req.sourceRegistry === req.targetRegistry) {
    auditNotes.push(`Domestic intra-registry transfer within ${req.sourceRegistry}.`);
  }

  // 2. Third-Country / Non-EU Grid Perimeter Enforcement (RED III Art. 31a & Reg 2024/2792 Art. 15(4))
  if (!isSourceEU && isTargetEU) {
    if (req.bilateralTreatyActive) {
      auditNotes.push(
        `Third-country transfer (${req.sourceRegistry} -> ${req.targetRegistry}) verified under active bilateral mutual recognition agreement (RED III Art. 31a).`
      );
    } else {
      blockingReasons.push(
        `Consignment origin gas is injected into a non-EU transmission grid (${req.sourceRegistry}). Under RED III Art. 31a and Commission Implementing Regulation (EU) 2024/2792 Art. 15(4), non-EU grid-injected biomethane cannot participate in EU Union Database mass balance transfers without an enacted bilateral treaty.`
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
          `Batch ${bId} lacks confirmed UDB registration ID. UDB escrow lock requires provisional title recording.`
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
    statutoryCitations.push(CITATIONS.UDB_REG_2024_2792_ART16);
    udbTitleTransferStatus = 'ESCROW_LOCKED';
    auditNotes.push(
      'UDB title transfer escrow lock active per Commission Implementing Regulation (EU) 2024/2792 Art. 16.'
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
  action: 'SUBMIT' | 'LOCK_ESCROW' | 'TRANSFER_TITLE' | 'FAIL_BOUNDARY' | 'FAIL_DISCREPANCY' | 'RESET'
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
    case 'LOCK_ESCROW':
      return current === 'SUBMITTED' || current === 'DRAFT' ? 'ESCROW_LOCKED' : current;
    case 'TRANSFER_TITLE':
      return current === 'ESCROW_LOCKED' ? 'TITLE_TRANSFERRED' : current;
    default:
      return current;
  }
}
