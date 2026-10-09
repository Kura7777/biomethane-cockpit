import { Consignment } from '../consignment/types';
import { Market } from '../markets/types';
import { MJ_PER_MWH } from '../markets/constants';
import { NL_GGE_BUYOUT_EUR_PER_TCO2E } from '../regulatory/constants';
import { getLhvFactorForOrigin, isAssumptionOpen } from '../assumptions/registry';

/**
 * The numbers behind an NL green-gas (GGE) valuation, in one place so the netback engine's working
 * text and the Trade Builder's GGE value line read the same figures.
 *
 * 1 GGE = 1 kg CO2e reduction. GGE per GO MWh = (comparator − PoS CI) × 3.6 GJ/MWh × LHV factor of the
 * GO's energy basis (spec R3, R4, O1).
 */
export interface GgeBreakdown {
  comparator: number;
  /** CI the GGE count uses: the PoS total when entered, else the consignment CI. */
  ciUsed: number;
  ciFromPos: boolean;
  goCountry: string;
  goOnLhv: boolean;
  lhvFactor: number;
  /** The LHV factor is an unconfirmed desk input (Spanish GO basis to confirm). */
  lhvOpen: boolean;
  ggePerGoMwh: number;
  markEurPerGge: number;
  complianceYear: number | null;
  /** That compliance year's buy-out ceiling in €/t CO2e (= €/1000 GGE), or null when none is on file. */
  buyoutEurPerTonne: number | null;
  /** The same ceiling in €/GGE. */
  buyoutEurPerGge: number | null;
  aboveBuyout: boolean;
}

export function computeGgeBreakdown(market: Market, consignment: Consignment, markEurPerGge: number): GgeBreakdown {
  const comparator = market.fossilComparatorGCo2eMj ?? 0;
  const go = consignment.custody?.go ?? null;
  const goCountry = go?.issuingCountry || consignment.injectionCountry || consignment.originCountry;
  const goOnLhv = go?.energyBasis === 'LHV';
  const lhvFactor = goOnLhv ? 1 : getLhvFactorForOrigin(goCountry);
  const posCi = consignment.custody?.pos?.ciTotal ?? null;
  const ciUsed = posCi ?? consignment.carbonIntensity;
  const ggePerGoMwh = ((comparator - ciUsed) * MJ_PER_MWH / 1000) * lhvFactor;

  const complianceYear = consignment.deliveryPeriod?.complianceYear ?? null;
  const buyoutEurPerT = complianceYear !== null ? NL_GGE_BUYOUT_EUR_PER_TCO2E[complianceYear] : undefined;
  const buyoutEurPerGge = buyoutEurPerT !== undefined ? buyoutEurPerT / 1000 : null;

  return {
    comparator,
    ciUsed,
    ciFromPos: posCi !== null,
    goCountry,
    goOnLhv,
    lhvFactor,
    lhvOpen: !goOnLhv && isAssumptionOpen((goCountry || '').toUpperCase() === 'ES' ? 'market.nl_gge.lhvFactor.ES' : 'market.nl_gge.lhvFactor.default'),
    ggePerGoMwh,
    markEurPerGge,
    complianceYear,
    buyoutEurPerTonne: buyoutEurPerT ?? null,
    buyoutEurPerGge,
    aboveBuyout: buyoutEurPerGge !== null && markEurPerGge > buyoutEurPerGge,
  };
}
