/**
 * Pure domain definitions for a European Biomethane registry cross-border TRADE SIMULATOR
 * (synthetic batches/accounts for desk training/testing — not live registry data).
 * For real, sourced facts about each national registry see `registryDirectory.ts`.
 *
 * Statutory References:
 * - Directive (EU) 2023/2413 (RED III) Article 30 & 31a
 * - Directive (EU) 2018/2001 (RED II) Article 28(2)&(4)
 * - Commission Implementing Regulation (EU) 2022/996 Article 18 (Union Database data rules)
 * - The UDB gas module is NOT YET LIVE: launch postponed to end of 2026 (European Biogas Association).
 *   There is no "escrow" mechanism in any sourced UDB documentation — the real UDB feature is a
 *   self-declared, monthly-batch "Transfer Gas PoS" reallocation, once the module launches.
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
  | 'GGCS_UK'
  | 'BRUGEL_BE'
  | 'ENERGISVERIGE_SE'
  | 'PRONOVO_CH'
  | 'GASGRID_FI'
  | 'GASSCO_NO'
  | 'URE_PL'
  | 'OTE_CZ'
  | 'REN_PT'
  | 'GNI_IE'
  | 'MEKH_HU'
  | 'ELERING_EE'
  | 'CONEXUS_LV'
  | 'AMBERGRID_LT'
  | 'OKTE_SK';

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
  | 'PENDING_UDB_LAUNCH' // boundary/protocol checks pass, but the UDB gas module itself is not yet live (see header note)
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
  /** Always false today: the UDB gas module is not live for any registry (launch postponed to end-2026, per EBA). */
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

export type TsoDataSource = 'ENERGINET_API' | 'ODRE_API' | 'ENTSOG_API' | 'TSO_SCADA_FEED' | 'MODELLED_REALTIME';

export interface TsoTelemetryPoint {
  id: string;
  tsoCode: string;
  tsoName: string;
  countryCode: string;
  nodeName: string;
  gridType: 'TSO_TRANSMISSION' | 'DSO_DISTRIBUTION' | 'CROSS_BORDER_IP';
  flowRateMWhPerHour: number;
  flowRateNm3PerHour: number;
  grossCalorificValueKwhNm3: number;
  feedstockCategory: string;
  verifiedCI: number;
  annexClassification: BatchAnnexClassification;
  timestamp: string;
  source: TsoDataSource;
  isLive: boolean;
  interconnectorPartner?: string;
  coordinates?: [number, number]; // [lon, lat]
}

export interface TsoNetworkMetrics {
  timestamp: string;
  totalDailyFlowMWh: number;
  currentFlowVelocityMWhHour: number;
  currentFlowVelocityNm3Hour: number;
  activeInjectionPoints: number;
  connectedTsoCount: number;
  averageLatencyMs: number;
  isLiveAggregate: boolean;
  feeds: {
    tsoCode: string;
    countryCode: string;
    tsoName: string;
    source: TsoDataSource;
    status: 'ONLINE' | 'FALLBACK_SYNCHRONISED' | 'CONNECTING';
    latencyMs: number;
    activeNodes: number;
    hourlyFlowMWh: number;
  }[];
  points: TsoTelemetryPoint[];
}

