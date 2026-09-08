export type AnnexClassification = 'IX_A' | 'IX_B' | 'CROP' | 'OTHER';
export type CertificationScheme = 'ISCC_EU' | 'ISCC_PLUS' | 'REDCERT_EU' | 'REDCERT2' | '2BSVS' | 'KZR_INIG';
export type ChainOfCustody = 'MASS_BALANCE' | 'BOOK_AND_CLAIM' | 'SEGREGATION';
export type UDBStatus = 'RECORDED' | 'PENDING' | 'NOT_RECORDED';
export type PoSStatus = 'ISSUED' | 'PENDING' | 'NOT_AVAILABLE';

export type DeliveryProfile = 'FLAT_MONTHLY' | 'FLAT_DAILY' | 'BULLET';

export interface DeliveryPeriod {
  type: 'MONTH' | 'QUARTER' | 'CALENDAR' | 'CUSTOM' | null;
  startDate: string | null;      // ISO delivery start
  endDate: string | null;        // ISO delivery end
  complianceYear: number | null; // the year the certificate is surrendered against
  productionStartDate?: string | null; // ISO vintage injection start
  productionEndDate?: string | null;   // ISO vintage injection end
  deliveryProfile?: DeliveryProfile | null;
  deliveryPointVtp?: string | null;    // e.g. "THE (Trading Hub Europe)", "TTF"
  statutorySurrenderDeadline?: string | null; // e.g. "2027-02-28"
  plantTotalCapacityMWh?: number | null; // Nameplate facility capacity
  plantCommittedVolumeMWh?: number | null; // Pre-committed volume sold to other offtakers
}

export interface Consignment {
  id: string;
  name: string;  // user-given label
  originCountry: string;  // ISO alpha-2
  originCountryName: string;
  feedstock: string;  // key into FEEDSTOCK_REGISTRY
  feedstockName: string;
  annexClassification: AnnexClassification;
  carbonIntensity: number;  // gCO2e/MJ, can be negative
  commissioningDateRange: 'PRE_OCT_2015' | 'OCT_2015_TO_2020' | 'POST_2021_TO_2025' | 'POST_2026';
  certificationScheme: CertificationScheme;
  chainOfCustody: ChainOfCustody;
  injectionCountry: string;  // ISO alpha-2
  injectionIsEU: boolean;
  udbStatus: UDBStatus;
  posStatus: PoSStatus;
  volumeMWh: number | null;  // optional, for P&L calc
  deliveryPeriod?: DeliveryPeriod | null;
  counterparty?: string | null; // optional counterparty label, e.g. "Shell Energy Europe"
  observedBundlePriceEurPerMwh?: number | null; // observed all-in clearing bundle price (€/MWh) for reality check
}
