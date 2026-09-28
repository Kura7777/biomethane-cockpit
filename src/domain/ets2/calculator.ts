import { getMarketById } from '../markets/registry';
import { MarksState } from '../netback/types';
import { Consignment } from '../consignment/types';
import { computeCertificateValue, ETS_NATURAL_GAS_TCO2_PER_MWH } from '../netback/engine';
import { HHV_TO_LHV_FACTOR } from '../offtake/engine';

/**
 * EU ETS2 exposure calculator (Directive (EU) 2023/959, Chapter IVa).
 *
 * ETS2 puts a carbon price on fuel released for consumption in buildings, road transport and
 * small industry. The regulated entity is the fuel supplier, which surrenders allowances and
 * passes the cost to its customers. Sustainable biomethane is zero-rated, so every MWh a
 * customer switches removes the allowances that MWh of fossil gas would have needed.
 *
 * Start date: 1 January 2028 (postponed one year with the 2040 climate target).
 * Price control: extra allowances are released when the price exceeds €45/t in 2020 prices
 * (Art. 30h) — a soft trigger, not a cap.
 *
 * Every price here is entered by the user or read from a desk mark. Nothing is defaulted.
 */

export type GasVolumeBasis = 'GCV' | 'NCV';

export interface Ets2ExposureInputs {
  /** Annual natural gas use in MWh, as the client's invoices state it. */
  annualGasMWh: number | null;
  /**
   * Invoices usually state gross calorific value (GCV). The MRR emission factor is per net
   * calorific value (NCV), so GCV volumes are converted before computing emissions.
   */
  volumeBasis: GasVolumeBasis;
  /** ETS2 allowance price scenario, €/tCO₂. */
  ets2PriceEurPerT: number | null;
  /** Carbon price the client already pays on the same gas (e.g. German BEHG), €/tCO₂. Null = none. */
  existingCarbonPriceEurPerT: number | null;
  /** Share of the supplier's allowance cost passed through to this client, 0–1. */
  passThroughShare: number | null;
  /** Share of annual gas use switched to biomethane, 0–1. */
  biomethaneShare: number | null;
  /** Quoted premium of RED-compliant, mass-balanced biomethane over the fossil gas it replaces, €/MWh. */
  biomethanePremiumEurPerMWh: number | null;
}

export interface Ets2ExposureResult {
  /** Gas use on the NCV basis the emission factor applies to. */
  ncvMWh: number | null;
  emissionsTco2: number | null;
  /** Allowances the supplier must buy for this client's gas, at the scenario price. */
  supplierAllowanceCostEur: number | null;
  /** Share of that cost the client bears at the stated pass-through. */
  clientEts2CostEur: number | null;
  /** What the client already pays under an existing national carbon price. */
  existingCarbonCostEur: number | null;
  /** Change in the client's carbon cost versus today (can be negative where the national price is higher). */
  incrementalCostEur: number | null;
  /** Avoided allowance value per MWh of biomethane, on the same basis as the entered volume. */
  avoidedValueEurPerMWh: number | null;
  biomethaneMWh: number | null;
  /** ETS2 cost the client avoids by switching, at the stated pass-through. */
  avoidedCostEur: number | null;
  /** Premium paid for the switched volume. */
  biomethanePremiumCostEur: number | null;
  /** Avoided cost minus premium. Positive = the switch pays for itself on ETS2 alone. */
  netSavingEur: number | null;
  /** Premium at which the switch breaks even on ETS2 alone, €/MWh. */
  breakevenPremiumEurPerMWh: number | null;
  /** Inputs that must be set before the figure can be shown. */
  missingInputs: string[];
  /** Workings for the side panel. */
  workings: string[];
}

const EU_ETS2_MARKET_ID = 'EU_ETS2';

/** Converts an entered gas volume to NCV MWh (the basis of the MRR emission factor). */
export function toNcvMWh(mwh: number, basis: GasVolumeBasis): number {
  return basis === 'GCV' ? mwh * HHV_TO_LHV_FACTOR : mwh;
}

/**
 * Value of one NCV MWh of zero-rated biomethane at a given ETS2 price. Priced through
 * computeCertificateValue, the desk's single pricing authority, against the EU_ETS2 market.
 */
export function ets2AvoidedValuePerNcvMWh(ets2PriceEurPerT: number): number | null {
  const market = getMarketById(EU_ETS2_MARKET_ID);
  if (!market) return null;
  const now = new Date().toISOString();
  const marks: MarksState = {
    marks: {
      [EU_ETS2_MARKET_ID]: {
        marketId: EU_ETS2_MARKET_ID,
        bid: ets2PriceEurPerT,
        offer: ets2PriceEurPerT,
        mid: ets2PriceEurPerT,
        updatedAt: now,
        source: 'ETS2 calculator scenario',
      },
    },
    gasIndex: { bid: null, offer: null, mid: null, updatedAt: null },
    fx: { gbpEur: null, chfEur: null, updatedAt: null },
    pricingSides: { certificateSide: 'mid', moleculeSide: 'mid' },
  };
  // ETS zero-rating does not depend on the consignment's CI; a neutral sustainable consignment is used.
  const consignment: Consignment = {
    id: 'ets2-calculator',
    name: 'ETS2 calculator',
    originCountry: 'EU',
    originCountryName: 'European Union',
    feedstock: 'manure',
    feedstockName: 'Manure',
    annexClassification: 'IX_A',
    carbonIntensity: 0,
    commissioningDateRange: 'POST_2021_TO_2025',
    certificationScheme: 'ISCC_EU',
    chainOfCustody: 'MASS_BALANCE',
    injectionCountry: 'EU',
    injectionIsEU: true,
    udbStatus: 'RECORDED',
    posStatus: 'ISSUED',
    volumeMWh: null,
  };
  return computeCertificateValue(market, consignment, marks, 'mid')?.valueEurPerMWh ?? null;
}

function clampShare(share: number): number {
  return Math.min(1, Math.max(0, share));
}

export function computeEts2Exposure(inputs: Ets2ExposureInputs): Ets2ExposureResult {
  const missingInputs: string[] = [];
  const workings: string[] = [];
  if (inputs.annualGasMWh === null || !(inputs.annualGasMWh >= 0)) missingInputs.push('annual gas use');
  if (inputs.ets2PriceEurPerT === null || !(inputs.ets2PriceEurPerT >= 0)) missingInputs.push('ETS2 price scenario');
  if (inputs.passThroughShare === null || !Number.isFinite(inputs.passThroughShare)) missingInputs.push('supplier pass-through');
  if (inputs.biomethaneShare === null || !Number.isFinite(inputs.biomethaneShare)) missingInputs.push('share switched to biomethane');

  const empty: Ets2ExposureResult = {
    ncvMWh: null,
    emissionsTco2: null,
    supplierAllowanceCostEur: null,
    clientEts2CostEur: null,
    existingCarbonCostEur: null,
    incrementalCostEur: null,
    avoidedValueEurPerMWh: null,
    biomethaneMWh: null,
    avoidedCostEur: null,
    biomethanePremiumCostEur: null,
    netSavingEur: null,
    breakevenPremiumEurPerMWh: null,
    missingInputs,
    workings,
  };
  if (missingInputs.length > 0) return empty;

  const gas = inputs.annualGasMWh as number;
  const price = inputs.ets2PriceEurPerT as number;
  const passThrough = clampShare(inputs.passThroughShare as number);
  const bioShare = clampShare(inputs.biomethaneShare as number);

  const ncvMWh = toNcvMWh(gas, inputs.volumeBasis);
  const emissionsTco2 = ncvMWh * ETS_NATURAL_GAS_TCO2_PER_MWH;
  const supplierAllowanceCostEur = emissionsTco2 * price;
  const clientEts2CostEur = supplierAllowanceCostEur * passThrough;

  workings.push(
    inputs.volumeBasis === 'GCV'
      ? `${gas.toLocaleString('en-GB')} MWh (GCV) × ${HHV_TO_LHV_FACTOR} = ${Math.round(ncvMWh).toLocaleString('en-GB')} MWh (NCV)`
      : `${gas.toLocaleString('en-GB')} MWh (NCV)`,
    `× ${ETS_NATURAL_GAS_TCO2_PER_MWH.toFixed(5)} tCO₂/MWh (MRR 2018/2066 Annex VI: 56.1 tCO₂/TJ) = ${Math.round(emissionsTco2).toLocaleString('en-GB')} tCO₂`,
    `× €${price.toFixed(2)}/t = €${Math.round(supplierAllowanceCostEur).toLocaleString('en-GB')} supplier allowance cost; client bears ${(passThrough * 100).toFixed(0)}%`,
  );

  const existing = inputs.existingCarbonPriceEurPerT;
  const existingCarbonCostEur = existing !== null && existing >= 0 ? emissionsTco2 * existing : null;
  const incrementalCostEur = existingCarbonCostEur !== null ? clientEts2CostEur - existingCarbonCostEur : clientEts2CostEur;
  if (existingCarbonCostEur !== null) {
    workings.push(`Existing carbon price €${(existing as number).toFixed(2)}/t → €${Math.round(existingCarbonCostEur).toLocaleString('en-GB')} paid today`);
  }

  // Value per MWh of the volume as entered: NCV value scaled to the entered basis.
  const perNcv = ets2AvoidedValuePerNcvMWh(price);
  const avoidedValueEurPerMWh = perNcv === null ? null : perNcv * (ncvMWh / (gas || 1));
  const biomethaneMWh = gas * bioShare;
  const avoidedCostEur = avoidedValueEurPerMWh === null ? null : biomethaneMWh * avoidedValueEurPerMWh * passThrough;
  const breakevenPremiumEurPerMWh = avoidedValueEurPerMWh === null ? null : avoidedValueEurPerMWh * passThrough;

  let biomethanePremiumCostEur: number | null = null;
  let netSavingEur: number | null = null;
  if (inputs.biomethanePremiumEurPerMWh === null) {
    missingInputs.push('biomethane premium quote');
  } else {
    biomethanePremiumCostEur = biomethaneMWh * inputs.biomethanePremiumEurPerMWh;
    netSavingEur = avoidedCostEur === null ? null : avoidedCostEur - biomethanePremiumCostEur;
  }
  if (breakevenPremiumEurPerMWh !== null) {
    workings.push(`Break-even biomethane premium: €${breakevenPremiumEurPerMWh.toFixed(2)}/MWh (avoided allowances × pass-through)`);
  }

  return {
    ncvMWh,
    emissionsTco2,
    supplierAllowanceCostEur,
    clientEts2CostEur,
    existingCarbonCostEur,
    incrementalCostEur,
    avoidedValueEurPerMWh,
    biomethaneMWh,
    avoidedCostEur,
    biomethanePremiumCostEur,
    netSavingEur,
    breakevenPremiumEurPerMWh,
    missingInputs,
    workings,
  };
}
