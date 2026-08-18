import {
  RegistryId,
  RegistryMetadata,
  InjectionBatch,
  RegistryAccount,
  CrossBorderTransferRequest,
  RegistryTransferVerification,
  BalanceOfTradeSummary,
  RegistryCancellationResult,
  CertificateTransferProtocol,
  BatchStatus,
  BatchAnnexClassification,
} from './types';
import {
  REGISTRY_METADATA_TABLE,
  BASELINE_INJECTION_BATCHES,
  BASELINE_ACCOUNTS,
  BASELINE_BALANCE_OF_TRADE,
} from './baselineData';
import { verifyRegistryTransfer } from './udbVerification';

export interface IRegistryConnector {
  readonly registryId: RegistryId;
  readonly registryName: string;
  readonly countryCode: string;
  readonly operatorName: string;
  readonly supportedProtocols: CertificateTransferProtocol[];
  readonly isEUSingleArea: boolean;

  getMetadata(): RegistryMetadata;
  getAccount(accountId: string): RegistryAccount | null;
  listAccounts(): RegistryAccount[];
  listInjectionBatches(filters?: {
    plantId?: string;
    status?: BatchStatus;
    annexClassification?: BatchAnnexClassification;
    udbStatus?: 'RECORDED' | 'NOT_RECORDED';
  }): InjectionBatch[];
  getBatchById(batchId: string): InjectionBatch | null;
  verifyTransfer(req: CrossBorderTransferRequest): RegistryTransferVerification;
  executeTransfer(req: CrossBorderTransferRequest): {
    success: boolean;
    verification: RegistryTransferVerification;
    transferId: string;
    transferredVolumeMWh: number;
  };
  cancelCertificates(batchIds: string[], reason: string): RegistryCancellationResult;
  getBalanceOfTrade(): BalanceOfTradeSummary;
}

export class BaseRegistryConnectorAdapter implements IRegistryConnector {
  readonly registryId: RegistryId;
  readonly registryName: string;
  readonly countryCode: string;
  readonly operatorName: string;
  readonly supportedProtocols: CertificateTransferProtocol[];
  readonly isEUSingleArea: boolean;

  protected batches: InjectionBatch[];
  protected accounts: RegistryAccount[];
  protected tradeSummary: BalanceOfTradeSummary;

  constructor(registryId: RegistryId) {
    this.registryId = registryId;
    const meta = REGISTRY_METADATA_TABLE[registryId];
    this.registryName = meta.name;
    this.countryCode = meta.countryCode;
    this.operatorName = meta.operator;
    this.supportedProtocols = meta.primaryProtocols;
    this.isEUSingleArea = meta.isEUSingleArea;

    // Clone initial baseline data for this connector instance
    this.batches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === registryId).map(b => ({ ...b }));
    this.accounts = BASELINE_ACCOUNTS.filter(a => a.registryId === registryId).map(a => ({ ...a }));
    const defaultTrade = BASELINE_BALANCE_OF_TRADE.find(t => t.registryId === registryId);
    this.tradeSummary = defaultTrade
      ? { ...defaultTrade }
      : {
          registryId,
          countryCode: meta.countryCode,
          registryName: meta.name,
          totalIssuanceMWh: 0,
          domesticConsumptionMWh: 0,
          grossExportMWh: 0,
          grossImportMWh: 0,
          netTradeBalanceMWh: 0,
          activeEscrowMWh: 0,
          totalCancellationsMWh: 0,
          tradeRole: 'BALANCED_DOMESTIC',
          exportSharePercent: 0,
        };
  }

  getMetadata(): RegistryMetadata {
    return REGISTRY_METADATA_TABLE[this.registryId];
  }

  getAccount(accountId: string): RegistryAccount | null {
    return this.accounts.find(a => a.accountHolderId === accountId) || null;
  }

  listAccounts(): RegistryAccount[] {
    return [...this.accounts];
  }

  listInjectionBatches(filters?: {
    plantId?: string;
    status?: BatchStatus;
    annexClassification?: BatchAnnexClassification;
    udbStatus?: 'RECORDED' | 'NOT_RECORDED';
  }): InjectionBatch[] {
    return this.batches.filter(b => {
      if (filters?.plantId && b.plantId !== filters.plantId) return false;
      if (filters?.status && b.status !== filters.status) return false;
      if (filters?.annexClassification && b.annexClassification !== filters.annexClassification) return false;
      if (filters?.udbStatus) {
        const isRecorded = Boolean(b.udbRegistrationId);
        if (filters.udbStatus === 'RECORDED' && !isRecorded) return false;
        if (filters.udbStatus === 'NOT_RECORDED' && isRecorded) return false;
      }
      return true;
    });
  }

  getBatchById(batchId: string): InjectionBatch | null {
    return this.batches.find(b => b.id === batchId) || null;
  }

  verifyTransfer(req: CrossBorderTransferRequest): RegistryTransferVerification {
    return verifyRegistryTransfer(req, this.batches);
  }

  executeTransfer(req: CrossBorderTransferRequest): {
    success: boolean;
    verification: RegistryTransferVerification;
    transferId: string;
    transferredVolumeMWh: number;
  } {
    const verification = this.verifyTransfer(req);
    if (!verification.isCompatible) {
      return {
        success: false,
        verification,
        transferId: `FAILED-${Date.now()}`,
        transferredVolumeMWh: 0,
      };
    }

    // Mutate batch statuses for transferred batches
    for (const bId of req.batchIds) {
      const batch = this.batches.find(b => b.id === bId);
      if (batch) {
        batch.status = 'TRANSFERRED';
      }
    }

    const transferId = `TX-${this.registryId}-${req.targetRegistry}-${Date.now()}`;
    return {
      success: true,
      verification,
      transferId,
      transferredVolumeMWh: req.totalVolumeMWh,
    };
  }

  cancelCertificates(batchIds: string[], reason: string): RegistryCancellationResult {
    let cancelledVolume = 0;
    for (const bId of batchIds) {
      const batch = this.batches.find(b => b.id === bId);
      if (batch && batch.status === 'ISSUED') {
        batch.status = 'CANCELLED_RETIRED';
        cancelledVolume += batch.volumeMWh;
      }
    }

    const confirmationId = `CANCEL-${this.registryId}-${Date.now()}`;
    return {
      success: cancelledVolume > 0,
      cancelledMWh: cancelledVolume,
      confirmationId,
      timestamp: new Date().toISOString(),
      auditTrail: `Cancelled ${cancelledVolume} MWh across ${batchIds.length} batches in ${this.registryName}. Reason: ${reason}`,
    };
  }

  getBalanceOfTrade(): BalanceOfTradeSummary {
    return { ...this.tradeSummary };
  }
}

export class DenaConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('DENA');
  }
}

export class VertiCerConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('VERTICER');
  }
}

export class EnerginetConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('ENERGINET');
  }
}

export class EnagasConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('ENAGAS');
  }
}

export class GseConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('GSE');
  }
}

export class EexConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('EEX');
  }
}

export class AgcsConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('AGCS');
  }
}

export class GgcsUkConnectorAdapter extends BaseRegistryConnectorAdapter {
  constructor() {
    super('GGCS_UK');
  }
}

export const REGISTRY_CONNECTORS: Record<RegistryId, IRegistryConnector> = {
  DENA: new DenaConnectorAdapter(),
  VERTICER: new VertiCerConnectorAdapter(),
  ENERGINET: new EnerginetConnectorAdapter(),
  ENAGAS: new EnagasConnectorAdapter(),
  GSE: new GseConnectorAdapter(),
  EEX: new EexConnectorAdapter(),
  AGCS: new AgcsConnectorAdapter(),
  GGCS_UK: new GgcsUkConnectorAdapter(),
};

export function getRegistryConnector(id: RegistryId): IRegistryConnector {
  const conn = REGISTRY_CONNECTORS[id];
  if (!conn) {
    throw new Error(`Unsupported registry identifier: ${id}`);
  }
  return conn;
}
