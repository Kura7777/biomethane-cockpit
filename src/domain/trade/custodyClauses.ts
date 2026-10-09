import { TradeAssessment } from './types';
import { getMarketById } from '../markets/registry';
import { ggeBookingDeadlineFor } from '../eligibility/gates/chain-of-custody';
import { NL_GGE_BUYOUT_EUR_PER_TCO2E, NL_GGE_CLAWBACK_YEARS } from '../regulatory/constants';
import { computeGgeBreakdown } from '../netback/gge';
import { TBA } from './legalPackage';

/**
 * Chain-of-custody undertakings for the legal pack: seller warranties, claw-back indemnity, document
 * retention, deliverables and GO transfer timing.
 *
 * NL GGE (GO + PoS together) gets the full set. DE THG is PoS-only, so it gets the PoS-relevant
 * subset. Every other market is unchanged (null). Rule references (R6, R11 …) point at the NL GGE
 * trade spec; the wording is a drafting point for legal review, not a representation.
 */

export type CustodyClauseVariant = 'PAIRED_GO_POS' | 'POS_ONLY';

export interface CustodyWarranty {
  /** Spec rule reference, e.g. "R6". */
  ref: string;
  text: string;
}

export interface CustodyClauses {
  variant: CustodyClauseVariant;
  heading: string;
  warranties: CustodyWarranty[];
  /** Claw-back indemnity; null for the PoS-only subset (it is a NEa booking mechanism). */
  indemnity: string | null;
  retention: string;
  deliverables: string[];
  /** GO transfer timing; null for the PoS-only subset. */
  timing: string | null;
  /** Risk disclosure for both parties; null for the PoS-only subset. */
  riskDisclosure: string[];
  /** Internal only: the claw-back exposure at the buy-out price. Never printed on counterparty documents. */
  internalExposure: string | null;
}

/** PoS data a booking needs (draft Regeling Art 4(1)(b), R14). */
const POS_DATA =
  'the PoS number (or UDB number), the certification scheme, the feedstock, the country of origin of the feedstock, ' +
  'the GHG emissions in gCO2eq/MJ in total and for each step of the chain, and whether and what support was received';

export function custodyClauseVariantFor(marketId: string): CustodyClauseVariant | null {
  const market = getMarketById(marketId);
  if (market?.requiresGoAndPos) return 'PAIRED_GO_POS';
  if (marketId === 'DE_THG') return 'POS_ONLY';
  return null;
}

export function buildCustodyClauses(assessment: TradeAssessment): CustodyClauses | null {
  const variant = custodyClauseVariantFor(assessment.targetMarketId);
  if (!variant) return null;
  const c = assessment.consignment;
  const origin = (c.injectionCountry || c.originCountry || '').toUpperCase();

  if (variant === 'POS_ONLY') {
    return {
      variant,
      heading: 'PoS & chain-of-custody undertakings',
      warranties: [
        { ref: 'PoS', text: `Seller warrants that the Proof of Sustainability carries ${POS_DATA}.` },
        { ref: 'Claims', text: 'Seller warrants that the delivered volume and its sustainability evidence have not been, and will not be, redeemed, cancelled or claimed under any other scheme (Spanish transport or quota, Dutch ERE, EU ETS 1 or any other obligation).' },
      ],
      indemnity: null,
      retention: `Seller keeps the PoS, the mass-balance records and the scheme certificates for at least ${NL_GGE_CLAWBACK_YEARS} years and provides them to Buyer and the competent authority on request.`,
      deliverables: [
        'Proof of Sustainability for the delivered volume',
        'Scheme certificates of the producer and of each trader in the chain',
        'Mass-balance statement for the delivery period',
        'Declarations: no other claim on the volume',
      ],
      timing: null,
      riskDisclosure: [],
      internalExposure: null,
    };
  }

  // Paired GO + PoS (NL GGE)
  const claims = c.custody?.claims;
  const warranties: CustodyWarranty[] = [
    { ref: 'R6', text: 'Seller warrants that the GO and the PoS relate to the same MWh of the same physical delivery, are delivered together and will not be traded separately from each other.' },
    { ref: 'R11', text: 'Seller warrants that no operating aid (exploitatiesubsidie) has been or will be granted for the production delivered; any investment aid is disclosed to Buyer.' },
  ];
  if (origin === 'ES' && claims?.prtrGrant !== 'NONE') {
    warranties.push({
      ref: 'S3',
      text: claims?.prtrGrant === 'YES'
        ? 'Seller warrants that the terms of the PRTR biogas grant the plant received (Orden TED/706/2022, Art. 5.3) permit the sale of the GO and PoS under this Transaction.'
        : 'If the plant received a PRTR biogas grant: Seller warrants that the terms of that grant (Orden TED/706/2022, Art. 5.3) permit the sale of the GO and PoS under this Transaction. [Seller to confirm whether a grant was received.]',
    });
  }
  warranties.push(
    { ref: 'R25', text: 'Seller warrants that the GO and the PoS have not been, and will not be, redeemed, cancelled or claimed elsewhere: not as Spanish transport or quota volume, not under the Dutch ERE, not under the German THG and not under EU ETS 1.' },
    { ref: 'R14', text: `Seller warrants that the PoS carries ${POS_DATA}.` },
  );

  const year = c.deliveryPeriod?.complianceYear ?? null;
  const buyoutPerTonne = year !== null ? NL_GGE_BUYOUT_EUR_PER_TCO2E[year] : undefined;
  const buyoutText = buyoutPerTonne !== undefined
    ? `the buy-out price for compliance year ${year} (€${buyoutPerTonne} per tonne CO2e, €${(buyoutPerTonne / 1000).toFixed(3)} per GGE)`
    : `the buy-out price for the compliance year ${TBA}`;
  const indemnity =
    `Seller indemnifies Buyer if the NEa re-determines (herziet) the gas booked on the basis of the GO and PoS delivered under this Transaction, ` +
    `within ${NL_GGE_CLAWBACK_YEARS} years of booking, and Buyer has to refill the shortfall or is charged back. ` +
    `The indemnity is for the shortfall in GGE at ${buyoutText}.`;

  const deadline = ggeBookingDeadlineFor(c);
  const timing =
    `Seller transfers the GO to Buyer's VertiCer account before the effective booking deadline, ${deadline ?? `${TBA} (the earlier of GO expiry and 1 May of the year after delivery)`}. ` +
    'The PoS is delivered together with the GO.';

  let internalExposure: string | null = null;
  const volume = c.volumeMWh;
  if (volume != null && buyoutPerTonne !== undefined) {
    const market = getMarketById(assessment.targetMarketId);
    if (market) {
      const gge = computeGgeBreakdown(market, c, 0).ggePerGoMwh * (c.custody?.go?.energyMWh ?? volume);
      internalExposure = `${Math.round(gge).toLocaleString()} GGE at the ${year} buy-out about €${Math.round(gge * buyoutPerTonne / 1000).toLocaleString()} if the NEa re-determines the whole delivery.`;
    }
  }

  return {
    variant,
    heading: 'GO + PoS chain-of-custody undertakings (Dutch green-gas obligation)',
    warranties,
    indemnity,
    retention: `Seller keeps the GO, the PoS, the mass-balance records and the scheme certificates for at least ${NL_GGE_CLAWBACK_YEARS} years after booking and provides them to Buyer and the NEa on request.`,
    deliverables: [
      'EECS Guarantee of Origin, showing the support and grid-injection attributes',
      'Proof of Sustainability carrying the data above',
      'Scheme certificates of the producer and of each trader in the chain',
      'Mass-balance statement for the delivery period',
      'Declarations: no operating aid; not redeemed or claimed elsewhere; PRTR grant terms where applicable',
    ],
    timing,
    riskDisclosure: [
      'The Dutch green-gas obligation (Wm title 9.9, Kamerstuk 36947) has passed the Tweede Kamer; the Senate vote is pending. The draft Besluit and Regeling may change before they enter into force.',
      'NEa counts GGE on the lower heating value of the gas. Parties note that the energy basis of the GO (HHV or LHV) and the conversion to LHV are not yet confirmed by the NEa.',
      `The NEa may re-determine booked gas up to ${NL_GGE_CLAWBACK_YEARS} years after booking and may suspend crediting while it investigates.`,
    ],
    internalExposure,
  };
}
