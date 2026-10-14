import { GEMINI_API_KEY_STORAGE_KEY, getStoredGeminiApiKey, setStoredGeminiApiKey } from '../regcheck/storage';
import { getFullKnowledgeContext } from './knowledgeBase';
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../markets/constants';
import { FR_CPB_CEILING_EUR_MWH, RED3_TRANSPORT_MAX_CI } from '../regulatory/constants';
import { getMarketById } from '../markets/registry';
import { evaluateEligibility } from '../eligibility/engine';
import type { Consignment, AnnexClassification, CertificationScheme, ChainOfCustody, UDBStatus, PoSStatus } from '../consignment/types';
import { FEEDSTOCK_REGISTRY } from '../consignment/feedstockData';
import { extractQuoteProofsFromText, verifyQuoteAgainstVault } from './verifier';
import { TradeAuditContext, AuditorResponse, GateAuditCheck, AuditorVerdict, normalizeTradeAuditContext } from './types';

// The Gemini key is shared with the desk helper, so it lives with the other saved keys (regcheck/storage.ts).
export { GEMINI_API_KEY_STORAGE_KEY };

/** Stable Gemini models, tried in order (ai.google.dev/gemini-api/docs/models). */
const GEMINI_AUDITOR_MODELS = ['gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-2.0-flash'];

export function getStoredApiKey(): string {
  return getStoredGeminiApiKey();
}

export function setStoredApiKey(key: string): void {
  setStoredGeminiApiKey(key);
}

/**
 * Pings Google Gemini API to test if the provided API key is valid.
 */
export async function testGeminiApiKey(key: string): Promise<{ valid: boolean; model?: string; error?: string }> {
  const cleanKey = key.trim();
  if (!cleanKey) {
    return { valid: false, error: 'API key is empty.' };
  }

  const testPayload = {
    contents: [{ role: 'user', parts: [{ text: 'PING_CHECK' }] }],
    generationConfig: { maxOutputTokens: 5 }
  };

  const models = GEMINI_AUDITOR_MODELS;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cleanKey },
        body: JSON.stringify(testPayload)
      });

      if (res.ok) {
        return { valid: true, model };
      }

      const errText = await res.text();
      let parsedMsg = errText;
      try {
        const json = JSON.parse(errText);
        parsedMsg = json?.error?.message || errText;
      } catch {}

      // If invalid API key, fail immediately
      if (res.status === 400 && parsedMsg.toLowerCase().includes('api key')) {
        return { valid: false, error: `Invalid API Key (${parsedMsg})` };
      }
    } catch {
      // Continue to next model if network/fetch failed
    }
  }

  return { valid: false, error: 'Could not connect to Gemini API. Verify key and internet connection.' };
}

const CLOSED_DOMAIN_SYSTEM_INSTRUCTION = `You are the Chief Regulatory Compliance Officer and Statutory Auditor for the European Biomethane Trading Desk.
Your task is to conduct an EXHAUSTIVE, FORENSIC, INSTITUTIONAL-GRADE STATUTORY AUDIT on proposed biomethane transactions.

CRITICAL OPERATING INVARIANTS:
1. STRICT CLOSED-DOMAIN RETRIEVAL: Answer solely from the provided Knowledge Vault dossiers. Never invent statutory articles or speculate.
2. VERBATIM STATUTORY PROOFS: Cite enacted Directive and Regulation numbers with verbatim double-quoted excerpts from the Knowledge Vault only, and name the article. Say plainly when the vault marks a point as unconfirmed.
3. DETAILED 6-GATE AUDIT: Evaluate:
   - Gate 1: Certification Scheme (ISCC EU / REDcert EU vs ISCC PLUS)
   - Gate 2: UDB Mass Balance & Grid Injection (EU interconnected grid vs UK/CH boundary under RED III Art 31a)
   - Gate 3: Chain of Custody (mass balance required under RED Art 30; book-and-claim not valid for quota compliance)
   - Gate 4: Feedstock Annex IX Classification (Annex IX-A advanced feedstocks vs Annex IX-B vs Energy crops food/feed cap)
   - Gate 5: RED III GHG Savings Threshold (>= 65% for transport, Art 29(10)(c), CI <= ${RED3_TRANSPORT_MAX_CI} gCO2e/MJ vs ${CI_COMPARATOR_ROAD_TRANSPORT} comparator)
   - Gate 6: Target Market Statutory Gating & Ceilings (French CPB €${FR_CPB_CEILING_EUR_MWH} ceiling, German 38. BImSchV Nabisy, Italian CIC, UK RTFO)
   - Gate 7 (Guarantee of Origin markets only): Registry Transfer. GO transfers depend on registry hub connectivity (AIB gas hub vs ERGaR) and must never be assumed; see the cross-border GO dossier. Hub connectivity does not govern Proof of Sustainability / mass-balance compliance trades.
4. CONTRACTUAL REMEDIES: Advise on the desk's EFET-based contract positions in the vault (these are desk template positions, not EFET standard clauses): a negotiated cure period for late Proof of Sustainability (PoS) delivery, and repricing down to the gas index (TTF Day-Ahead) if the PoS fails the audit.`;

/** Quotes shown with every offline audit. Each one is checked against the vault when used, never assumed verbatim. */
const CANNED_PROOF_QUOTES = [
  { quote: 'By 21 November 2024, the Commission shall ensure that a Union database is set up to enable the tracing of liquid and gaseous renewable fuels and recycled carbon fuels', articleCitation: 'Directive (EU) 2023/2413 Article 31a(1)' },
  { quote: 'share of renewable energy within the final consumption of energy in the transport sector of at least 29 % by 2030', articleCitation: 'Directive (EU) 2023/2413 Article 25(1)(a)(i)' },
];

export async function queryAuditor(
  prompt: string,
  tradeContext?: TradeAuditContext
): Promise<AuditorResponse> {
  const apiKey = getStoredApiKey();

  // If no API key is configured, run the exhaustive deterministic audit directly
  if (!apiKey) {
    return runExhaustiveDeterministicAudit(prompt, tradeContext);
  }

  const knowledgeContext = getFullKnowledgeContext();

  let userMessage = prompt;
  if (tradeContext) {
    const norm = normalizeTradeAuditContext(tradeContext);
    userMessage = `PROPOSED COMMERCIAL BIOMETHANE TRANSACTION:
- Origin Country: ${norm.originCountry} (${norm.originPlantId || 'Selected Asset'})
- Asset Name: ${norm.plantName || 'European Biomethane Facility'}
- Destination Market: ${norm.targetMarketId} (${norm.targetMarketName || 'Compliance Market'})
- Primary Feedstock: ${norm.feedstockCategory} (${norm.feedstockMix || 'Audited substrate mix'})
- Carbon Intensity (CI): ${norm.carbonIntensity} gCO2eq/MJ
- Traded Volume: ${norm.annualVolumeMWh ? norm.annualVolumeMWh.toLocaleString() + ' MWh/a' : '10,000 MWh'}
- Delivered Netback Stack: ${norm.deliveredValueEurMwh ? '€' + norm.deliveredValueEurMwh.toFixed(2) + '/MWh' : 'N/A'}

TASK FOR CHIEF REGULATORY OFFICER:
Perform a deep, forensic statutory compliance audit on this deal.
Start your answer with exactly one line of the form "VERDICT: APPROVED", "VERDICT: REJECTED" or "VERDICT: CONDITIONAL_PASS".
Then structure your assessment with:
1. Executive Statutory Verdict (APPROVED, REJECTED, or CONDITIONAL_PASS)
2. Exhaustive Gate Compliance Matrix (6 statutory gates, plus the Registry Transfer gate for Guarantee of Origin markets) with Pass/Fail status and exact legal citations
3. Feedstock Lifecycle & Manure Credit analysis
4. Cross-Border Gas Grid Logistics & Union Database (UDB) Recording Risk (note: the UDB gas module is not yet live — launch postponed to end-2026 per EBA)
5. Recommended Desk Contract Schedule & Protective Clauses`;
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: CLOSED_DOMAIN_SYSTEM_INSTRUCTION + '\n\n' + knowledgeContext + '\n\n' + userMessage }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.0,
      topK: 1,
      maxOutputTokens: 3000,
    }
  };

  const models = GEMINI_AUDITOR_MODELS;
  let lastError: string | null = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        let msg = errText;
        try {
          const parsed = JSON.parse(errText);
          msg = parsed?.error?.message || errText;
        } catch {}
        throw new Error(`${model} (${response.status}): ${msg}`);
      }

      const data = await response.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error('Empty response payload from Gemini model.');
      }

      const quoteProofs = extractQuoteProofsFromText(candidateText);

      const verdict = parseAuditorVerdict(candidateText);

      return {
        verdict,
        headline: tradeContext ? `Institutional Audit Verdict: ${verdict} (${tradeContext.originCountry} → ${tradeContext.targetMarketId})` : 'Statutory Regulatory Inquiry',
        explanation: candidateText,
        checks: extractGateChecks(candidateText),
        quoteProofs,
        recommendations: extractRecommendations(candidateText),
        rawText: candidateText,
        sourceEngine: 'GEMINI_LLM'
      };

    } catch (err: any) {
      lastError = err.message || String(err);
    }
  }

  // Fall back to exhaustive deterministic audit with clear notice
  console.warn('Gemini API call failed, falling back to exhaustive deterministic audit:', lastError);
  return runExhaustiveDeterministicAudit(prompt, tradeContext, lastError || 'Unknown API connection error');
}

/**
 * Reads the model's verdict from its explicit "VERDICT: …" line only. Free text such as
 * "this cannot be approved" must never become APPROVED, so a missing or ambiguous verdict is
 * INFO (unknown) — callers treat INFO as not cleared.
 */
export function parseAuditorVerdict(text: string): AuditorResponse['verdict'] {
  const found = new Set<AuditorResponse['verdict']>();
  const pattern = /^[\W\d]*(?:executive\s+statutory\s+)?verdict\W*\s*(approved|rejected|conditional[_\s-]?pass)\b/gim;
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const v = m[1].toLowerCase();
    found.add(v === 'approved' ? 'APPROVED' : v === 'rejected' ? 'REJECTED' : 'CONDITIONAL_PASS');
  }
  // Conflicting verdict lines are ambiguous: do not pick one.
  return found.size === 1 ? [...found][0] : 'INFO';
}

function extractGateChecks(text: string): GateAuditCheck[] {
  const checks: GateAuditCheck[] = [];
  const lines = text.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('[PASS]') || (trimmed.startsWith('-') && trimmed.toLowerCase().includes('pass'))) {
      checks.push({ gateName: 'Statutory Gate Check', status: 'PASS', details: trimmed.replace(/\[PASS\]/gi, '').replace(/^[-*]\s*/, '').trim() });
    } else if (trimmed.includes('[FAIL]') || (trimmed.startsWith('-') && trimmed.toLowerCase().includes('fail'))) {
      checks.push({ gateName: 'Statutory Gate Check', status: 'FAIL', details: trimmed.replace(/\[FAIL\]/gi, '').replace(/^[-*]\s*/, '').trim() });
    } else if (trimmed.includes('[FLAG]') || (trimmed.startsWith('-') && trimmed.toLowerCase().includes('conditional'))) {
      checks.push({ gateName: 'Statutory Gate Alert', status: 'FLAG', details: trimmed.replace(/\[FLAG\]/gi, '').replace(/^[-*]\s*/, '').trim() });
    }
  }

  return checks.slice(0, 8);
}

function extractRecommendations(text: string): string[] {
  const recs: string[] = [];
  const lines = text.split('\n');
  let capturing = false;

  for (const line of lines) {
    const l = line.toLowerCase();
    if (l.includes('recommendation') || l.includes('action:') || l.includes('clause')) {
      capturing = true;
      continue;
    }
    if (capturing && (line.trim().startsWith('*') || line.trim().startsWith('-') || /^\d+\./.test(line.trim()))) {
      recs.push(line.replace(/^[*\-\d.]+\s*/, '').trim());
    }
  }

  return recs.slice(0, 5);
}

function mapFeedstockKey(raw?: string): string {
  const f = (raw || '').toLowerCase().trim();
  if (FEEDSTOCK_REGISTRY[f]) return f;
  if (f.includes('manure') || f.includes('slurry')) return 'manure';
  if (f.includes('food') || f.includes('bio_waste') || f.includes('biowaste')) return 'food_waste';
  if (f.includes('sewage') || f.includes('sludge')) return 'sewage_sludge';
  if (f.includes('residue') || f.includes('straw') || f.includes('agri')) return 'agricultural_residues';
  if (f.includes('crop') || f.includes('maize')) return 'energy_crops';
  if (f.includes('landfill')) return 'landfill_gas';
  if (f.includes('uco') || f.includes('cooking')) return 'used_cooking_oil';
  if (f.includes('industrial')) return 'industrial_bio_waste';
  return 'manure';
}

/**
 * Normalizes a TradeAuditContext into a full Consignment object suitable for evaluateEligibility.
 */
export function buildConsignmentFromTradeContext(trade: TradeAuditContext, rawTrade?: any): Consignment {
  const origin = (trade.originCountry || 'DE').toUpperCase();
  const injectionCountry = ((rawTrade as any)?.injectionCountry || origin).toUpperCase();
  const isNonEu = injectionCountry === 'GB' || injectionCountry === 'UK' || injectionCountry === 'CH';
  const injectionIsEU = (rawTrade as any)?.injectionIsEU ?? !isNonEu;

  const rawScheme = (trade.certificationScheme || '').toUpperCase();
  let scheme: CertificationScheme = 'ISCC_EU';
  if (rawScheme.includes('PLUS')) scheme = 'ISCC_PLUS';
  else if (rawScheme.includes('REDCERT2')) scheme = 'REDCERT2';
  else if (rawScheme.includes('REDCERT')) scheme = 'REDCERT_EU';
  else if (rawScheme.includes('2BS')) scheme = '2BSVS';
  else if (rawScheme.includes('KZR')) scheme = 'KZR_INIG';
  else if (rawScheme.includes('NONE') || rawScheme.includes('UNVERIFIED')) {
    scheme = rawScheme as any;
  }

  const rawCoc = (trade.chainOfCustody || '').toUpperCase();
  let chainOfCustody: ChainOfCustody = 'MASS_BALANCE';
  if (rawCoc.includes('BOOK')) chainOfCustody = 'BOOK_AND_CLAIM';
  else if (rawCoc.includes('SEGREGAT')) chainOfCustody = 'SEGREGATION';

  const feedstockKey = mapFeedstockKey(trade.feedstockCategory || trade.feedstock);
  const regFeedstock = FEEDSTOCK_REGISTRY[feedstockKey];
  const feedstockName = regFeedstock?.name ?? (trade.feedstockCategory || 'Biomass');
  const annexClassification: AnnexClassification = (trade.annexClassification as AnnexClassification)
    || regFeedstock?.annexClassification
    || (feedstockKey === 'energy_crops' ? 'CROP' : 'IX_A');

  const udbStatus: UDBStatus = (rawTrade as any)?.udbStatus
    ?? (!injectionIsEU ? 'NOT_RECORDED' : 'RECORDED');

  const posStatus: PoSStatus = (rawTrade as any)?.posStatus ?? 'ISSUED';
  const volumeMWh = trade.annualVolumeMWh ?? trade.volumeMWh ?? 10000;

  return {
    id: trade.originPlantId ? `CONSIGN-${trade.originPlantId}` : `CONSIGN-${origin}-${feedstockKey}`,
    name: trade.plantName ? `${trade.plantName} (${origin})` : `${origin} ${feedstockName}`,
    originCountry: origin,
    originCountryName: origin,
    feedstock: feedstockKey,
    feedstockName,
    annexClassification,
    carbonIntensity: trade.carbonIntensity,
    commissioningDateRange: (rawTrade as any)?.commissioningDateRange ?? 'POST_2021_TO_2025',
    certificationScheme: scheme,
    chainOfCustody,
    injectionCountry,
    injectionIsEU,
    udbStatus,
    posStatus,
    volumeMWh,
    deliveryPeriod: (rawTrade as any)?.deliveryPeriod ?? null,
    custody: (rawTrade as any)?.custody ?? null,
    originPlantId: trade.originPlantId,
    originPlantName: trade.plantName,
  };
}

/**
 * Exhaustive Deterministic Engine
 * Evaluates statutory compliance by strictly delegating to evaluateEligibility,
 * mapping all gates & chain-of-custody checklist items into GateAuditCheck[],
 * clamping French CPB delivered netbacks to the statutory ceiling, and deriving
 * the overall verdict directly from the statutory assessment.
 */
function runExhaustiveDeterministicAudit(
  prompt: string,
  rawTrade?: TradeAuditContext,
  errorNotice?: string
): AuditorResponse {
  if (!rawTrade) {
    return {
      verdict: 'INFO',
      headline: 'Statutory Knowledge Vault (Offline Mode)',
      explanation: errorNotice 
        ? `Notice: Gemini API reported: ${errorNotice}. Operating under Local Deterministic Engine.`
        : 'Closed-Domain Statutory Engine is active. Enter your Gemini API key in the Settings tab to enable real-time conversational drafting.',
      checks: [],
      quoteProofs: [],
      recommendations: ['Configure Gemini API Key in Settings tab for full AI synthesis.'],
      rawText: '',
      sourceEngine: 'DETERMINISTIC_VAULT',
      apiError: errorNotice
    };
  }

  const trade = normalizeTradeAuditContext(rawTrade);
  const targetMarket = getMarketById(trade.targetMarketId);
  if (!targetMarket) {
    return {
      verdict: 'REJECTED',
      headline: `Statutory Audit Verdict: REJECTED (${trade.originCountry} → ${trade.targetMarketId})`,
      explanation: `Target market ${trade.targetMarketId} is not recognized in the regulatory register.`,
      checks: [{
        gateName: 'Market Recognition Gate',
        status: 'FAIL',
        details: `Target market ${trade.targetMarketId} was not found.`,
      }],
      quoteProofs: [],
      recommendations: ['Select a valid target market from the market registry.'],
      rawText: `Target market ${trade.targetMarketId} is not recognized.`,
      sourceEngine: 'DETERMINISTIC_VAULT',
      apiError: errorNotice
    };
  }

  const consignment = buildConsignmentFromTradeContext(trade, rawTrade);
  const assessment = evaluateEligibility(consignment, targetMarket);
  const checks: GateAuditCheck[] = [];

  for (const gate of assessment.gates) {
    if (gate.gate === 'CHAIN_OF_CUSTODY' && gate.checklist && gate.checklist.length > 0) {
      for (const item of gate.checklist) {
        let status: 'PASS' | 'FAIL' | 'FLAG';
        if (item.status === 'PASS') status = 'PASS';
        else if (item.status === 'FAIL') status = 'FAIL';
        else status = 'FLAG';

        checks.push({
          gateName: item.label,
          status,
          details: `${status === 'FAIL' ? 'HARD BLOCK: ' : ''}${item.detail}${item.remedy && status !== 'PASS' ? ' ' + item.remedy : ''}`,
          citation: item.citations[0]?.shortName ?? item.citations[0]?.fullReference,
        });
      }
    } else {
      let status: 'PASS' | 'FAIL' | 'FLAG';
      if (gate.verdict === 'PASS') status = 'PASS';
      else if (gate.verdict === 'HARD_BLOCK') status = 'FAIL';
      else status = 'FLAG';

      const gateName = gate.gate === 'MARKET_SPECIFIC'
        ? `${gate.gateLabel} (${targetMarket.id})`
        : gate.gateLabel;

      checks.push({
        gateName,
        status,
        details: `${status === 'FAIL' ? 'HARD BLOCK: ' : ''}${gate.reason}${gate.remedy && status !== 'PASS' ? ' ' + gate.remedy : ''}`,
        citation: gate.citations[0]?.shortName ?? gate.citations[0]?.fullReference,
      });
    }
  }

  // Check French CPB price ceiling clamp
  let isClamped = false;
  if (targetMarket.id === 'FR_CPB' && (trade.deliveredValueEurMwh || 0) > FR_CPB_CEILING_EUR_MWH) {
    isClamped = true;
    checks.push({
      gateName: 'French Statutory CPB Price Ceiling',
      status: 'FLAG',
      details: `STATUTORY CLAMP: Delivered price (€${trade.deliveredValueEurMwh?.toFixed(2)}/MWh) exceeds the French CPB penalty ceiling of €${FR_CPB_CEILING_EUR_MWH.toFixed(2)}/MWh. Revenue will be clamped at €${FR_CPB_CEILING_EUR_MWH.toFixed(2)}/MWh.`,
      citation: "Code de l'énergie Art. L.446-24 et seq. (CPB penalty)"
    });
  }

  let verdict: AuditorVerdict;
  if (assessment.overallVerdict === 'HARD_BLOCK') {
    verdict = 'REJECTED';
  } else if (
    isClamped ||
    assessment.overallVerdict === 'CONDITIONAL' ||
    assessment.overallVerdict === 'UNRESOLVED' ||
    assessment.overallVerdict === 'UNKNOWN'
  ) {
    verdict = 'CONDITIONAL_PASS';
  } else {
    verdict = 'APPROVED';
  }

  const isApproved = verdict === 'APPROVED';
  const ghgSavingsPct = Math.round(((CI_COMPARATOR_ROAD_TRANSPORT - trade.carbonIntensity) / CI_COMPARATOR_ROAD_TRANSPORT) * 100);

  const explanation = `### Chief Compliance Officer Statutory Audit Report
**Transaction:** ${trade.originCountry} (${trade.originPlantId || 'Asset'}) → ${trade.targetMarketId}  
**Feedstock:** ${trade.feedstockCategory} (${trade.carbonIntensity} gCO₂e/MJ) | Volume: ${trade.annualVolumeMWh ? trade.annualVolumeMWh.toLocaleString() + ' MWh' : '10,000 MWh'}

${errorNotice ? `> ⚠ *API Notice: Gemini API connection returned: ${errorNotice}. Full audit executed via local statutory compliance rules.*` : ''}

#### 1. Statutory Eligibility Assessment
${assessment.summary}

${isApproved 
  ? `This proposed transaction is **COMPLIANT** with European Renewable Energy Directive (RED III) standards and eligible for quota surrender in target market **${trade.targetMarketId}**. The consignment satisfies all grid injection, mass balance, feedstock classification, and greenhouse gas savings requirements.`
  : verdict === 'CONDITIONAL_PASS'
  ? `This proposed transaction is **CONDITIONALLY ELIGIBLE** for target market **${trade.targetMarketId}**. Certain documentation, registry transfer steps, or pricing ceiling constraints must be satisfied.`
  : `This proposed transaction is **NON-COMPLIANT** and violates mandatory European or national regulatory gating rules. Executing this trade will result in title rejection by the recipient national registry.`}

#### 2. Carbon Intensity & Avoided Methane Dynamics
- **Fossil Fuel Baseline:** ${CI_COMPARATOR_ROAD_TRANSPORT} gCO₂eq/MJ
- **Achieved GHG Savings:** **${ghgSavingsPct}%** (Mandatory statutory threshold: **65%**, requiring CI ≤ ${RED3_TRANSPORT_MAX_CI} gCO₂eq/MJ).
- **Substrate Classification:** Substrate classified as **${consignment.annexClassification}** (${consignment.feedstockName}). Under German 38. BImSchV and the Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530; promulgation date not yet confirmed), single counting (1×) applies for 2026+ compliance. The manure credit in the carbon-intensity calculation (45 gCO₂eq per MJ of manure digested, RED Annex V Part C point 6 / Annex VI Part B point 6) is a physical accounting credit and is unaffected by quota counting; use the certified CI on the PoS.

#### 3. Registry & UDB Recording Logistics
- Gas grid injection in **${consignment.injectionCountry}** (${consignment.injectionIsEU ? 'connects to the interconnected European transmission pipeline network' : 'non-EU grid boundary'}).
- The **Union Database (UDB)** gas module is **not yet live** (launch postponed to end-2026 per the European Biogas Association); this desk's internal trade tracker models a lifecycle of \`DRAFT\` → \`SUBMITTED\` → \`PENDING_UDB_LAUNCH\` → \`TRANSFERRED\`, but no consignment can be formally recorded in the UDB until it launches. In the meantime, cross-border compliance traceability runs through national registries and ERGaR/AIB GO routes.

#### 4. Recommended EFET Contractual Protective Clauses
1. **Proof of Sustainability (PoS) Delivery Schedule:** Agree a fixed electronic delivery date for the valid PoS after each injection month.
2. **Cure Period & Gas-Index Fallback:** Include a negotiated cure period for delayed PoS (length to be agreed; not an EFET-standard term). If seller fails to deliver a RED III-compliant PoS, buyer retains the contractual right to re-price the molecule to the gas index (TTF Day-Ahead) without paying the green certificate premium.
3. **Regulatory Change Protection:** Ensure clause covering statutory amendments or national quota mandate adjustments without indemnification penalty.`;

  const remedies = assessment.gates
    .flatMap(g => [g.remedy, ...(g.checklist?.map(c => c.remedy) || [])])
    .filter((r): r is string => Boolean(r));

  const recommendations = isApproved
    ? [
        'Execute the desk contract schedule with an agreed PoS cure period',
        'Lock electronic transfer schedule in origin registry to prevent domestic cancellation',
        'Monitor UDB launch status (postponed to end-2026 per EBA) before relying on it for commercial invoice generation'
      ]
    : remedies.length > 0
    ? remedies.slice(0, 4)
    : [
        'Re-route volume to a voluntary Scope 1 or GO market where the route checker shows an open path',
        'Replace crop substrate with Annex IX Part A agricultural residues'
      ];

  return {
    verdict,
    headline: `Statutory Audit Verdict: ${verdict} (${trade.originCountry} → ${trade.targetMarketId})`,
    explanation,
    checks,
    quoteProofs: CANNED_PROOF_QUOTES.map(({ quote, articleCitation }) => {
      const check = verifyQuoteAgainstVault(quote);
      return {
        quote,
        sourceFile: check.matchedDoc?.sourceFile ?? 'Unverified External Source',
        articleCitation,
        isVerbatimVerified: check.verified
      };
    }),
    recommendations,
    rawText: explanation,
    sourceEngine: 'DETERMINISTIC_VAULT',
    apiError: errorNotice
  };
}
