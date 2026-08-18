/**
 * Pure domain definitions for European Biomethane Registries, Inter-Registry Transfer Protocols,
 * and Union Database (UDB) Title Transfer Mechanics.
 *
 * Statutory References:
 * - Directive (EU) 2023/2413 (RED III) Article 30 & 31a
 * - Commission Implementing Regulation (EU) 2024/2792 (Union Database Rules)
 * - German §37a BImSchG / 38. BImSchV (dena Biogasregister)
 * - Dutch Wet milieubeheer / Regeling energie vervoer (VertiCer / NEa REV)
 * - Spanish Real Decreto 376/2022 (Enagás GTS)
 * - Italian D.M. 02/03/2018 & D.M. 15/09/2022 (GSE Platform)
 * - Danish Natural Gas Supply Act (Energinet)
 */

export type RegistryId =
  | 'DENA'
  | 'VERTICER'
  | 'ENERGINET'
  | 'ENAGAS'
  | 'GSE'
  | 'EEX'
  | 'AGCS'
  | 'GGCS_UK';

export type CertificateTransferProtocol =
  | 'ERGAR_COO'           // European Renewable Gas Registry Scheme (Certificate of Origin)
  | 'AIB_EECS_GAS'        // Association of Issuing Bodies - European Energy Certificate System (Gas)
  | 'UDB_DIRECT_TRANSFER' // Union Database mass balance single interconnected gas network transfer
  | 'BILATERAL_RECOGNITION' // Bilateral Treaty under RED III Art. 31a
  | 'DOMESTIC_ONLY';      // Non-exportable or ring-fenced domestic scheme

export type UDBTitleTransferStatus =
  | 'NOT_APPLICABLE'
  | 'DRAFT'
  | 'SUBMITTED'
  | 'ESCROW_LOCKED'
  | 'TITLE_TRANSFERRED'
  | 'REJECTED_BOUNDARY_VIOLATION'
  | 'REJECTED_DISCREPANCY';

export type GridInterconnectionStatus =
  | 'TSO_HIGH_PRESSURE'
  | 'DSO_DISTRIBUTION'
  | 'OFF_GRID_SEGREGATED';

export type BatchAnnexClassification =
  | 'IX_A'   // RED Annex IX Part A (advanced: manure, biowaste, straw, sludge)
  | 'IX_B'   // RED Annex IX Part B (used cooking oil, animal fats Cat 1&2)
  | 'CROP'   // Food & feed crops / energy crops
  | 'OTHER'; // Industrial non-biological / transitional

export type BatchStatus =
  | 'ISSUED'
  | 'TRANSFERRED'
  | 'CANCELLED_RETIRED'
  | 'SURRENDERED_COMPLIANCE';

export type TradeRole =
  | 'NET_EXPORTER'
  | 'NET_IMPORTER'
  | 'BALANCED_DOMESTIC';

export interface RegistryMetadata {
  id: RegistryId;
  name: string;
  operator: string;
  countryCode: string;
  countryName: string;
  isEUSingleArea: boolean;
  primaryProtocols: CertificateTransferProtocol[];
  hubConnection: string;
  statutoryLegalBasis: string;
  udbDirectIntegration: boolean;
}

export interface InjectionBatch {
  id: string;
  plantId: string;
  plantName: string;
  originCountry: string;
  registryId: RegistryId;
  injectionPointId: string;
  meteringPeriod: {
    startDate: string;
    endDate: string;
  };
  volumeMWh: number;
  volumeNm3: number;
  grossCalorificValueKwhNm3: number;
  feedstockCategory: string;
  feedstockDetails: string;
  annexClassification: BatchAnnexClassification;
  verifiedCI: number; // gCO2e/MJ
  sustainabilityProofId: string;
  certificationScheme: string; // e.g. 'ISCC EU', 'REDcert EU', '2BSvs'
  udbRegistrationId: string | null;
  gridInterconnectionStatus: GridInterconnectionStatus;
  issuedAt: string;
  status: BatchStatus;
}

export interface RegistryAccount {
  registryId: RegistryId;
  registryName: string;
  countryCode: string;
  accountHolderId: string;
  accountHolderName: string;
  currentBalanceMWh: number;
  availableForExportMWh: number;
  reservedEscrowMWh: number;
  activeBatchesCount: number;
}

export interface CrossBorderTransferRequest {
  id: string;
  sourceRegistry: RegistryId;
  sourceAccountId: string;
  targetRegistry: RegistryId;
  targetAccountId: string;
  targetMarketId: string;
  batchIds: string[];
  totalVolumeMWh: number;
  transferProtocol: CertificateTransferProtocol;
  udbTitleTransferRequired: boolean;
  bilateralTreatyActive?: boolean;
  requestedAt: string;
}

export interface RegistryTransferVerification {
  isCompatible: boolean;
  protocol: CertificateTransferProtocol;
  udbTitleTransferStatus: UDBTitleTransferStatus;
  blockingReasons: string[];
  auditNotes: string[];
  verifiedBatchesCount: number;
  verifiedVolumeMWh: number;
  statutoryCitations: string[];
}

export interface BalanceOfTradeSummary {
  registryId: RegistryId;
  countryCode: string;
  registryName: string;
  totalIssuanceMWh: number;
  domesticConsumptionMWh: number;
  grossExportMWh: number;
  grossImportMWh: number;
  netTradeBalanceMWh: number; // positive = net exporter, negative = net importer
  activeEscrowMWh: number;
  totalCancellationsMWh: number;
  tradeRole: TradeRole;
  exportSharePercent: number; // percentage of issuance exported
}

export interface RegistryCancellationResult {
  success: boolean;
  cancelledMWh: number;
  confirmationId: string;
  timestamp: string;
  auditTrail: string;
}

export interface ProtocolInteroperability {
  sourceRegistry: RegistryId;
  targetRegistry: RegistryId;
  supportedProtocols: CertificateTransferProtocol[];
  isDirectUdbEligible: boolean;
  notes: string;
}
