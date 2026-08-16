import { DeliveryMode, LogisticsAssessment, ModeCostBreakdown, InterconnectionPoint } from './types';
import { INTERCONNECTION_POINTS, HUB_BASIS_SPREADS, HUB_DISTANCES_KM } from './corridors';
import { MARKETS } from '../markets/registry';
import { COUNTRY_NAMES } from '../markets/constants';

/**
 * Standard Gas Transmission Network Graph for Europe
 */
const PIPELINE_ADJACENCY: Record<string, string[]> = {
  SE: ['DK'],
  DK: ['SE', 'DE'],
  DE: ['DK', 'NL', 'BE', 'FR', 'AT', 'PL', 'CZ', 'CH'],
  NL: ['DE', 'BE', 'GB'],
  BE: ['NL', 'DE', 'FR', 'GB'],
  FR: ['BE', 'DE', 'CH', 'ES', 'GB'],
  ES: ['FR', 'PT'],
  PT: ['ES'],
  IT: ['CH', 'AT', 'SI', 'GR'],
  AT: ['DE', 'IT', 'CZ', 'SK', 'HU', 'SI'],
  PL: ['DE', 'CZ', 'SK', 'LT', 'UA'],
  CZ: ['DE', 'PL', 'SK', 'AT'],
  SK: ['CZ', 'PL', 'UA', 'HU', 'AT'],
  HU: ['AT', 'SK', 'UA', 'RO', 'HR', 'RS', 'SI'],
  FI: ['EE'],
  EE: ['FI', 'LV'],
  LV: ['EE', 'LT'],
  LT: ['LV', 'PL'],
  GB: ['NL', 'BE', 'FR', 'IE'],
  CH: ['DE', 'FR', 'IT', 'AT'],
  NO: ['GB', 'DE', 'BE', 'FR', 'NL'],
  SI: ['IT', 'AT', 'HU', 'HR'],
  HR: ['SI', 'HU', 'RS'],
  RO: ['HU', 'BG', 'UA'],
  BG: ['RO', 'GR', 'RS'],
  RS: ['HU', 'HR', 'BG'],
  GR: ['BG', 'IT'],
  IE: ['GB'],
};

/**
 * BFS algorithm to find shortest physical gas transmission path between any two European countries
 */
export function findShortestPipelinePath(fromCountry: string, toCountry: string): string[] {
  if (fromCountry === toCountry) return [fromCountry];

  const queue: string[][] = [[fromCountry]];
  const visited = new Set<string>([fromCountry]);

  while (queue.length > 0) {
    const path = queue.shift()!;
    const current = path[path.length - 1];

    const neighbors = PIPELINE_ADJACENCY[current] || [];
    for (const neighbor of neighbors) {
      if (neighbor === toCountry) {
        return [...path, neighbor];
      }
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
      }
      queue.push([...path, neighbor]);
    }
  }

  // If no interconnected physical pipeline route exists across the European grid
  return [];
}

/**
 * Resolve the Interconnection Points along a pipeline path
 */
export function resolveInterconnectionPoints(
  countryPath: string[],
  tariffOverrides?: Record<string, { entryTariffEurMwh?: number | null; exitTariffEurMwh?: number | null; totalTariffEurMwh?: number | null }>
): InterconnectionPoint[] {
  if (!countryPath || countryPath.length < 2) return [];
  const ips: InterconnectionPoint[] = [];

  for (let i = 0; i < countryPath.length - 1; i++) {
    const from = countryPath[i];
    const to = countryPath[i + 1];

    const matchedIp = INTERCONNECTION_POINTS.find(ip => ip.fromCountry === from && ip.toCountry === to);
    const override = tariffOverrides?.[matchedIp?.id ?? `IP_${from}_${to}`] || tariffOverrides?.[`${from}_${to}`];

    if (matchedIp) {
      if (override) {
        const total = override.totalTariffEurMwh !== undefined
          ? override.totalTariffEurMwh
          : (override.entryTariffEurMwh !== undefined && override.exitTariffEurMwh !== undefined && override.entryTariffEurMwh !== null && override.exitTariffEurMwh !== null)
          ? Number((override.entryTariffEurMwh + override.exitTariffEurMwh).toFixed(2))
          : matchedIp.totalTariffEurMwh;

        ips.push({
          ...matchedIp,
          entryTariffEurMwh: override.entryTariffEurMwh ?? matchedIp.entryTariffEurMwh,
          exitTariffEurMwh: override.exitTariffEurMwh ?? matchedIp.exitTariffEurMwh,
          totalTariffEurMwh: total,
          capacityPlatform: 'PRISMA',
          confidence: 'VERIFIED',
          source: 'Desk tariff override',
        });
      } else {
        ips.push(matchedIp);
      }
    } else {
      // Unverified border tariff — never fabricate non-existent numbers
      if (override && override.totalTariffEurMwh !== null && override.totalTariffEurMwh !== undefined) {
        ips.push({
          id: `IP_${from}_${to}`,
          name: `Interconnection Point ${from}-${to}`,
          fromCountry: from,
          toCountry: to,
          fromTso: 'Custom TSO',
          toTso: 'Custom TSO',
          entryTariffEurMwh: override.entryTariffEurMwh ?? null,
          exitTariffEurMwh: override.exitTariffEurMwh ?? null,
          totalTariffEurMwh: override.totalTariffEurMwh,
          capacityPlatform: 'PRISMA',
          confidence: 'VERIFIED',
          source: 'Desk tariff override',
        });
      } else {
        ips.push({
          id: `IP_${from}_${to}`,
          name: `Interconnection Point ${from}-${to} (Unverified Tariff)`,
          fromCountry: from,
          toCountry: to,
          fromTso: 'Unknown TSO',
          toTso: 'Unknown TSO',
          entryTariffEurMwh: null,
          exitTariffEurMwh: null,
          totalTariffEurMwh: null,
          capacityPlatform: 'UNVERIFIED',
          confidence: 'UNVERIFIED',
          source: 'Unverified border pair',
          lastVerified: null,
        });
      }
    }
  }

  return ips;
}

/**
 * Main Logistics Calculation Engine
 */
export function calculateLogisticsRoute(
  originCountry: string,
  targetCountry: string,
  baseGasPriceEurMwh: number | null = null,
  tariffOverrides?: Record<string, { entryTariffEurMwh?: number | null; exitTariffEurMwh?: number | null; totalTariffEurMwh?: number | null }>
): LogisticsAssessment {
  const origin = originCountry.toUpperCase();
  const target = targetCountry.toUpperCase();

  const originName = COUNTRY_NAMES[origin] || origin;
  const targetName = COUNTRY_NAMES[target] || target;
  const targetMarket = MARKETS.find(m => m.country === target && m.status === 'ACTIVE') || MARKETS.find(m => m.country === target);
  const targetRegistry = targetMarket?.registry || `${targetName} National Registry`;
  const targetLaw = targetMarket?.legalBasis || `${targetName} Renewable Gas Mandate`;

  // Distance lookup (null if not mapped, no fallback fabrication)
  const originDistances = HUB_DISTANCES_KM[origin];
  const distanceKm: number | null = origin === target ? 0 : (originDistances?.[target] ?? null);

  // Shortest physical route
  const countryPath = findShortestPipelinePath(origin, target);
  const physicalIps = resolveInterconnectionPoints(countryPath, tariffOverrides);

  // Physical Transmission Tariffs & Unverified Legs
  const unverifiedLegs: string[] = [];
  let hasNullTariff = false;
  for (const ip of physicalIps) {
    if (ip.totalTariffEurMwh === null || ip.capacityPlatform === 'UNVERIFIED') {
      unverifiedLegs.push(`${ip.fromCountry}➔${ip.toCountry}`);
      hasNullTariff = true;
    }
  }

  const totalPhysicalTariffEurMwh = (hasNullTariff || physicalIps.length === 0)
    ? null
    : physicalIps.reduce((sum, ip) => sum + (ip.totalTariffEurMwh ?? 0), 0);
  
  // Pipeline Shrinkage & Fuel Gas (null if distance or gas price is not provided)
  const shrinkageLossPct = distanceKm !== null
    ? Number(Math.max(0.003, (distanceKm / 500) * 0.0035).toFixed(4))
    : null;
  const shrinkageEurMwh = (baseGasPriceEurMwh !== null && shrinkageLossPct !== null)
    ? Number((baseGasPriceEurMwh * shrinkageLossPct).toFixed(2))
    : null;

  // Hub Basis Spreads
  const originHub = HUB_BASIS_SPREADS[origin] || { hubName: `${origin} Local Hub`, operator: 'National Grid', basisSpreadToTtfEurMwh: +0.80 };
  const targetHub = HUB_BASIS_SPREADS[target] || { hubName: `${target} Local Hub`, operator: 'National Grid', basisSpreadToTtfEurMwh: +0.80 };
  const hubBasisSpreadEurMwh = Number((targetHub.basisSpreadToTtfEurMwh - originHub.basisSpreadToTtfEurMwh).toFixed(2));

  // -------------------------------------------------------------
  // MODE 1: Commercial Inter-Hub Swap + UDB PoS Title Transfer
  // -------------------------------------------------------------
  const swapOriginInjectionFee = 0.80; // Indicative local origin entry tariff
  const swapBasisHedgingFee = Math.abs(hubBasisSpreadEurMwh) > 0 ? Math.abs(hubBasisSpreadEurMwh) : 0.65;
  const swapUdbCertificationFee = 0.45; // Indicative RED III electronic PoS audit & registry fee
  const swapExecutionBrokerage = 0.25; // Indicative OTC / broker clearing fee
  const swapTotalEurMwh = Number((swapOriginInjectionFee + swapBasisHedgingFee + swapUdbCertificationFee + swapExecutionBrokerage).toFixed(2));

  const virtualSwapBreakdown: ModeCostBreakdown = {
    mode: 'VIRTUAL_SWAP',
    title: 'Option A: Commercial Inter-Hub Swap & UDB Title Transfer',
    summary: `Sell molecule at ${originHub.hubName} (or TTF) and buy natural gas at ${targetHub.hubName}, transferring environmental PoS via Union Database (UDB).`,
    totalCostEurMwh: swapTotalEurMwh,
    lineItems: [
      {
        label: 'Origin Grid Injection Tariff (Indicative)',
        costEurMwh: swapOriginInjectionFee,
        category: 'TARIFF',
        description: `Local entry tariff into ${originHub.hubName} network.`,
      },
      {
        label: `Hub Basis Spread Hedging (${originHub.hubName.split(' ')[0]} ➔ ${targetHub.hubName.split(' ')[0]})`,
        costEurMwh: swapBasisHedgingFee,
        category: 'COMMODITY_SPREAD',
        description: `Market price basis differential between origin gas hub and destination virtual point.`,
      },
      {
        label: 'Union Database (UDB) & Registry Transfer (Indicative)',
        costEurMwh: swapUdbCertificationFee,
        category: 'REGULATORY_FEE',
        description: 'RED III Article 31a single mass balance area electronic title transfer and scheme verification.',
      },
      {
        label: 'Brokerage & Hub Clearing Friction (Indicative)',
        costEurMwh: swapExecutionBrokerage,
        category: 'COMMODITY_SPREAD',
        description: 'OTC trade execution or exchange clearing fees.',
      },
    ],
    timelineDays: 1,
    regulatoryFeasibility: 'CONTESTED',
    isRecommended: true,
    legalBasis: 'RED III Directive (EU) 2023/2413 Art. 31a (Single EU Mass Balance Area)',
    pros: [
      'Lowest commercial friction compared to physical transmission wheeling',
      'Zero volume shrinkage / fuel gas losses over transit',
      'Execution time: Instant electronic settlement upon UDB PoS issuance',
      'No exposure to cross-border pipeline congestion or maintenance outages',
    ],
    cons: [
      `Requires active trading accounts at both origin and target hub (${originHub.hubName.split(' ')[0]} + ${targetHub.hubName.split(' ')[0]})`,
      'Basis spread exposure between hubs must be monitored or hedged',
      'Hub basis spreads are indicative annual averages — actual spreads vary seasonally and by market liquidity',
      'Cross-border mass balance vs national registry book-and-claim interpretation is contested in certain member states',
    ],
  };

  // -------------------------------------------------------------
  // MODE 2: Physical Pipeline Transit Wheeling Corridor
  // -------------------------------------------------------------
  const physicalEntryExitTariffs = totalPhysicalTariffEurMwh;
  const physicalBalancingReserve = 0.50; // Daily balancing margin across multi-TSO zones
  const physicalPrismaAuctionFee = 0.15;
  const physicalTotalEurMwh = (totalPhysicalTariffEurMwh !== null && shrinkageEurMwh !== null && countryPath.length > 0)
    ? Number((totalPhysicalTariffEurMwh + shrinkageEurMwh + physicalBalancingReserve + physicalPrismaAuctionFee + swapUdbCertificationFee).toFixed(2))
    : null;

  let physicalSummary = '';
  if (countryPath.length === 0) {
    physicalSummary = `No continuous interconnected physical pipeline route found between ${originName} and ${targetName}.`;
  } else if (unverifiedLegs.length > 0) {
    physicalSummary = `Tariff incomplete — unverified at ${unverifiedLegs.join(', ')}.`;
  } else {
    physicalSummary = `Physically wheel gas molecules across European transmission borders (${countryPath.join(' ➔ ')}) by booking firm entry/exit capacity on PRISMA.`;
  }

  const physicalPipelineBreakdown: ModeCostBreakdown = {
    mode: 'PHYSICAL_PIPELINE',
    title: 'Option B: Physical Multi-TSO Pipeline Transit Corridor',
    summary: physicalSummary,
    totalCostEurMwh: physicalTotalEurMwh,
    unverifiedLegs,
    lineItems: [
      ...physicalIps.map(ip => ({
        label: `PRISMA Capacity: ${ip.name}`,
        costEurMwh: ip.totalTariffEurMwh,
        category: 'TARIFF' as const,
        description: ip.totalTariffEurMwh !== null
          ? `${ip.fromTso} ➔ ${ip.toTso} border capacity booking.`
          : `Unverified border tariff between ${ip.fromCountry} and ${ip.toCountry}.`,
      })),
      {
        label: shrinkageLossPct !== null
          ? `Pipeline Shrinkage & Fuel Gas (${(shrinkageLossPct * 100).toFixed(2)}%)`
          : 'Pipeline Shrinkage & Fuel Gas (Gas Price / Distance Unset)',
        costEurMwh: shrinkageEurMwh,
        category: 'SHRINKAGE',
        description: distanceKm !== null
          ? `Compression fuel gas consumed over ${distanceKm.toLocaleString()} km pipeline transit.`
          : 'Distance or gas index unverified.',
      },
      {
        label: 'Multi-TSO Balancing & Imbalance Margin (Indicative)',
        costEurMwh: physicalBalancingReserve,
        category: 'TARIFF',
        description: 'Reserve buffer for hourly injection/withdrawal profile matching across TSOs.',
      },
      {
        label: 'PRISMA Auction Platform & Registry Handling (Indicative)',
        costEurMwh: Number((physicalPrismaAuctionFee + swapUdbCertificationFee).toFixed(2)),
        category: 'REGULATORY_FEE',
        description: 'PRISMA auction transaction costs and statutory mass-balance registry tracking.',
      },
    ],
    timelineDays: 14,
    regulatoryFeasibility: countryPath.length > 0 && unverifiedLegs.length === 0 ? 'MEDIUM' : 'LOW',
    isRecommended: false,
    legalBasis: 'Regulation (EC) No 715/2009 & CAM NC (Network Code on Capacity Allocation Mechanisms)',
    pros: [
      'Guarantees physical molecule delivery to a dedicated off-grid or private industrial asset',
      'Regulated tariffs set by National Regulatory Authorities (NRAs)',
    ],
    cons: [
      'High cumulative tariff stacking across intermediate transit countries',
      'Shrinkage fuel gas loss over long distances',
      'Complex shipper licensing required in every transiting jurisdiction',
      'PRISMA IP tariffs shown are published annual regulated rates — actual auction cleared prices vary by season (winter premiums can be 3-5× summer)',
    ],
  };

  // -------------------------------------------------------------
  // MODE 3: Bio-LNG Virtual Pipeline (Cryogenic Road / ISO Tanker)
  // -------------------------------------------------------------
  const liquefactionCapexOpex = 8.50; // Cryogenic upgrading / small-scale liquefaction
  const roadTransportRatePerKm = 0.0065; // ~€1.70/km for 20t trailer = €0.0065/MWh/km
  const roadFreightEurMwh = distanceKm !== null
    ? Number(Math.min(22.00, Math.max(4.00, distanceKm * roadTransportRatePerKm)).toFixed(2))
    : null;
  const regasificationTerminalFee = 2.00; // Destination regasification or bunkering terminal handling
  const bioLngTotalEurMwh = roadFreightEurMwh !== null
    ? Number((liquefactionCapexOpex + roadFreightEurMwh + regasificationTerminalFee + swapUdbCertificationFee).toFixed(2))
    : null;

  const bioLngBreakdown: ModeCostBreakdown = {
    mode: 'BIO_LNG',
    title: 'Option C: Bio-LNG Cryogenic Virtual Pipeline (Road / ISO Container)',
    summary: 'Liquefy biomethane at origin upgrading unit into Bio-LNG (-162°C) and transport via cryogenic ISO road tankers or maritime ferry directly to destination.',
    totalCostEurMwh: bioLngTotalEurMwh,
    lineItems: [
      {
        label: 'Small-Scale Cryogenic Liquefaction (Indicative)',
        costEurMwh: liquefactionCapexOpex,
        category: 'PROCESSING',
        description: 'Electricity, nitrogen pre-cooling, and liquefaction processing at origin facility.',
      },
      {
        label: distanceKm !== null
          ? `Cryogenic Road Freight (~${distanceKm.toLocaleString()} km, Indicative)`
          : 'Cryogenic Road Freight (Distance Unknown)',
        costEurMwh: roadFreightEurMwh,
        category: 'FREIGHT',
        description: 'ADR-certified cryogenic road trailer / ferry transit across Europe.',
      },
      {
        label: 'Destination Terminal Offloading / Regasification (Indicative)',
        costEurMwh: regasificationTerminalFee,
        category: 'PROCESSING',
        description: `${targetName} LNG terminal offloading, satellite station storage, or maritime bunker fueling.`,
      },
      {
        label: 'Physical Segregation Certification (ISCC EU)',
        costEurMwh: swapUdbCertificationFee,
        category: 'REGULATORY_FEE',
        description: 'Physical segregation chain of custody verification under RED III Annex IX.',
      },
    ],
    timelineDays: 4,
    regulatoryFeasibility: 'HIGH',
    isRecommended: false,
    legalBasis: 'ADR Agreement (Dangerous Goods) & RED III Physical Segregation Chain of Custody',
    pros: [
      'Required for heavy transport & FuelEU Maritime maritime bunkering',
      'No pipeline grid dependency; reaches un-piped regions & marine ports',
      'Full physical molecular segregation',
    ],
    cons: [
      'Expensive processing and freight costs',
      'Boil-off gas management during long haul transits',
      'Road freight rates are indicative per-km averages — actual rates depend on carrier availability, diesel price, and ADR hazmat surcharges',
    ],
  };

  // Execution Step-by-Step Playbook for Trader (Dynamically derived from actual trade)
  const executionSteps = [
    {
      phase: 'Step 1: Upstream Origination & Plant Offtake',
      title: `Sign EFET Biomethane Annex with ${originName} Producer`,
      actor: 'Trading Desk & Upstream Producer',
      actions: [
        `Execute EFET Master Agreement with Biomethane Annex specifying ${originHub.hubName} delivery.`,
        'Verify plant ISCC EU / REDcert audit scope, raw feedstock provenance (Annex IX-A), and RED III GHG saving certificate.',
        `Confirm physical grid injection into ${originHub.operator} network with entry meter confirmation.`,
      ],
    },
    {
      phase: 'Step 2: Commercial Delivery & Hub Execution',
      title: virtualSwapBreakdown.isRecommended
        ? `Execute Inter-Hub Swaps at ${originHub.hubName.split(' ')[0]} & ${targetHub.hubName.split(' ')[0]}`
        : 'Book PRISMA Interconnection Point Capacity Auctions',
      actor: 'Gas Dispatcher & Commercial Trader',
      actions: [
        `Sell physical molecule at ${originHub.hubName} (or TTF) to close origin physical position.`,
        `Buy matching physical natural gas volume at ${targetHub.hubName} (e.g. ${targetHub.hubName.split(' ')[0]} virtual trading point).`,
        `Hedge any inter-hub basis spread (current indicative basis: €${Math.abs(hubBasisSpreadEurMwh).toFixed(2)}/MWh).`,
      ],
    },
    {
      phase: 'Step 3: Union Database (UDB) Consignment Transfer',
      title: `Transfer Proof of Sustainability (PoS) in UDB: ${originName} ➔ ${targetName}`,
      actor: 'Compliance Operations',
      actions: [
        `Log into the European Commission Union Database (UDB) for Gaseous Fuels.`,
        `Accept consignment from ${originName} Producer (matching mass balance injection in single EU interconnected grid).`,
        `Execute Title Transfer in UDB to the ${targetName} Buyer / Offtaker (${targetHub.operator}).`,
      ],
    },
    {
      phase: 'Step 4: Downstream Settlement & Statutory Cancellation',
      title: `Target Registry Certificate Issuance & Settlement: ${targetRegistry}`,
      actor: 'Settlement & Regulatory Reporting Desk',
      actions: [
        `${targetName} buyer receives PoS in UDB and registers compliance claim in ${targetRegistry}.`,
        `Surrender certificates against ${targetLaw} statutory quota obligations.`,
        'Invoice counterparty for delivered Netback + Commercial Desk Margin.',
      ],
    },
  ];

  return {
    originCountry: origin,
    targetCountry: target,
    distanceKm,
    modes: {
      virtualSwap: virtualSwapBreakdown,
      physicalPipeline: physicalPipelineBreakdown,
      bioLng: bioLngBreakdown,
    },
    recommendedMode: 'VIRTUAL_SWAP',
    physicalRoute: {
      interconnectionPoints: physicalIps,
      transitingCountries: countryPath,
      totalPhysicalTariffEurMwh,
      unverifiedLegs,
      shrinkageLossPct,
      shrinkageEurMwh,
    },
    hubSpread: {
      originHub: originHub.hubName,
      targetHub: targetHub.hubName,
      basisSpreadEurMwh: hubBasisSpreadEurMwh,
    },
    executionSteps,
  };
}

