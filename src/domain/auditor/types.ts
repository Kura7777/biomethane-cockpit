export type AuditorVerdict = 'APPROVED' | 'REJECTED' | 'CONDITIONAL_PASS' | 'INFO';

export interface GateAuditCheck {
  gateName: string;
  status: 'PASS' | 'FAIL' | 'FLAG';
  details: string;
  citation?: string;
}

export interface StatutoryQuoteProof {
  quote: string;
  sourceFile: string;
  articleCitation: string;
  isVerbatimVerified: boolean;
}

export type AuditorModalTab = 'GATE_BREAKDOWN' | 'EFET_SCHEDULE' | 'DOSSIER_QA' | 'SETTINGS';

export interface TradeAuditContext {
  originCountry: string;
  originPlantId?: string;
  plantId?: string;
  plantName?: string;
  annualVolumeMWh?: number;
  volumeMWh?: number;
  volume?: number;
  targetMarketId: string;
  destinationMarket?: string;
  targetMarketName?: string;
  feedstockCategory: string;
  feedstock?: string;
  feedstockMix?: string;
  carbonIntensity: number;
  ghgIntensity?: number;
  deliveredValueEurMwh?: number;
  deliveredValue?: number;
  moleculeBaseEurMwh?: number;
  greenPremiumEurMwh?: number;
  logisticsTotalEurMwh?: number;
  counterparty?: string;
  operatorName?: string;
  gridOperator?: string;
  certificationScheme?: string;
  chainOfCustody?: string;
  annexClassification?: string;
}

export function normalizeAuditorTab(tab?: string): AuditorModalTab {
  if (!tab) return 'GATE_BREAKDOWN';
  const lower = tab.toLowerCase();
  if (lower.includes('gate') || lower === 'breakdown') return 'GATE_BREAKDOWN';
  if (lower.includes('efet') || lower.includes('remed')) return 'EFET_SCHEDULE';
  if (lower.includes('qa') || lower.includes('dossier') || lower.includes('search')) return 'DOSSIER_QA';
  if (lower.includes('setting') || lower.includes('api') || lower.includes('engine')) return 'SETTINGS';
  return 'GATE_BREAKDOWN';
}

export function normalizeTradeAuditContext(raw?: any, fallback?: TradeAuditContext): TradeAuditContext {
  const originCountry = (raw?.originCountry || fallback?.originCountry || 'DE').toUpperCase();
  const targetMarketId = raw?.targetMarketId || raw?.destinationMarket || fallback?.targetMarketId || 'DE_THG';
  const targetMarketName = raw?.targetMarketName || fallback?.targetMarketName;
  const originPlantId = raw?.originPlantId || raw?.plantId || fallback?.originPlantId;
  const plantName = raw?.plantName || fallback?.plantName;

  const annualVolumeMWh = typeof raw?.annualVolumeMWh === 'number' && !isNaN(raw.annualVolumeMWh)
    ? raw.annualVolumeMWh
    : typeof raw?.volumeMWh === 'number' && !isNaN(raw.volumeMWh)
    ? raw.volumeMWh
    : typeof raw?.volume === 'number' && !isNaN(raw.volume)
    ? raw.volume
    : (fallback?.annualVolumeMWh ?? 50000);

  const feedstockCategory = raw?.feedstockCategory || raw?.feedstock || fallback?.feedstockCategory || 'MANURE_SLURRY';
  const feedstockMix = raw?.feedstockMix || fallback?.feedstockMix;

  const carbonIntensity = typeof raw?.carbonIntensity === 'number' && !isNaN(raw.carbonIntensity)
    ? raw.carbonIntensity
    : typeof raw?.ghgIntensity === 'number' && !isNaN(raw.ghgIntensity)
    ? raw.ghgIntensity
    : (fallback?.carbonIntensity ?? -80);

  const deliveredValueEurMwh = typeof raw?.deliveredValueEurMwh === 'number' && !isNaN(raw.deliveredValueEurMwh)
    ? raw.deliveredValueEurMwh
    : typeof raw?.deliveredValue === 'number' && !isNaN(raw.deliveredValue)
    ? raw.deliveredValue
    : fallback?.deliveredValueEurMwh;

  return {
    originCountry,
    targetMarketId,
    destinationMarket: targetMarketId,
    targetMarketName,
    originPlantId,
    plantName,
    annualVolumeMWh,
    volumeMWh: annualVolumeMWh,
    feedstockCategory,
    feedstock: feedstockCategory,
    feedstockMix,
    carbonIntensity,
    ghgIntensity: carbonIntensity,
    deliveredValueEurMwh,
    moleculeBaseEurMwh: raw?.moleculeBaseEurMwh ?? fallback?.moleculeBaseEurMwh,
    greenPremiumEurMwh: raw?.greenPremiumEurMwh ?? fallback?.greenPremiumEurMwh,
    logisticsTotalEurMwh: raw?.logisticsTotalEurMwh ?? fallback?.logisticsTotalEurMwh,
    counterparty: raw?.counterparty || fallback?.counterparty,
    operatorName: raw?.operatorName || fallback?.operatorName,
    gridOperator: raw?.gridOperator || fallback?.gridOperator,
    certificationScheme: raw?.certificationScheme || fallback?.certificationScheme,
    chainOfCustody: raw?.chainOfCustody || fallback?.chainOfCustody,
    annexClassification: raw?.annexClassification || fallback?.annexClassification,
  };
}

export interface AuditorResponse {
  verdict: AuditorVerdict;
  headline: string;
  explanation: string;
  checks: GateAuditCheck[];
  quoteProofs: StatutoryQuoteProof[];
  recommendations: string[];
  rawText: string;
  sourceEngine?: 'GEMINI_LLM' | 'DETERMINISTIC_VAULT';
  apiError?: string;
}

export interface AuditorChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  auditResponse?: AuditorResponse;
  isVerbatimVerified?: boolean;
}
