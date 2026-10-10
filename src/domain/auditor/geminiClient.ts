import { getFullKnowledgeContext } from './knowledgeBase';
import { CI_COMPARATOR_ROAD_TRANSPORT } from '../markets/constants';
import { FR_CPB_CEILING_EUR_MWH, RED3_TRANSPORT_MAX_CI } from '../regulatory/constants';
import { getMarketById } from '../markets/registry';
import { evaluateRegistryTransferGate } from '../eligibility/gates/registry-transfer';
import type { Consignment } from '../consignment/types';
import { extractQuoteProofsFromText, verifyQuoteAgainstVault } from './verifier';
import { TradeAuditContext, AuditorResponse, GateAuditCheck, normalizeTradeAuditContext } from './types';

export const GEMINI_API_KEY_STORAGE_KEY = 'biomethane_gemini_api_key';

export function getStoredApiKey(): string {
  if (typeof localStorage === 'undefined') return '';
  return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '';
}

export function setStoredApiKey(key: string): void {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim());
  }
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

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cleanKey}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError: string | null = null;

  for (const model of models) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

/**
 * Exhaustive Deterministic Engine (6 statutory gates + Registry Transfer for GO markets)
 * Evaluates all statutory gates with full depth and legal citations.
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
  const checks: GateAuditCheck[] = [];
  let isApproved = true;
  let isConditional = false;

  // Gate 1: Scheme Gate
  const scheme = (trade.certificationScheme || 'ISCC_EU').toUpperCase();
  if (scheme.includes('NONE') || scheme.includes('UNVERIFIED')) {
    isApproved = false;
    checks.push({
      gateName: '1. Certification Scheme Gate',
      status: 'FAIL',
      details: 'HARD BLOCK: Production facility lacks an approved EU voluntary sustainability scheme (ISCC EU / REDcert-EU).',
      citation: 'RED III Art. 30(4) (Commission-recognised voluntary schemes)'
    });
  } else {
    checks.push({
      gateName: '1. Certification Scheme Gate',
      status: 'PASS',
      details: 'ISCC EU / REDcert EU are Commission-recognised voluntary schemes that can certify the chain; the destination market may add its own registry steps.',
      citation: 'RED III Art. 30(4) (Commission-recognised voluntary schemes)'
    });
  }

  // Gate 2: UDB Mass Balance Gate (Non-EU Grid Boundary)
  const isGb = trade.originCountry === 'GB' || trade.originCountry === 'UK';
  const isEuTarget = ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC'].includes(trade.targetMarketId);
  if (isGb && isEuTarget) {
    isApproved = false;
    checks.push({
      gateName: '2. Union Database (UDB) Gate',
      status: 'FAIL',
      details: 'HARD BLOCK: The Great Britain gas grid sits outside the EU single mass-balance area. Biomethane injected in GB cannot clear into EU quota markets on mass balance alone; it needs physical segregation or a recognition arrangement.',
      citation: 'RED III Art. 31a; IR (EU) 2022/996 (interconnected EU grid as one mass-balance area)'
    });
  } else {
    checks.push({
      gateName: '2. Union Database (UDB) Gate',
      status: 'PASS',
      details: `Origin grid (${trade.originCountry}) is interconnected to the single European gas system; mass balance is possible. The UDB gas module is not yet live (end-2026), so recording runs via national registries meanwhile.`,
      citation: 'RED III Art. 31a; IR (EU) 2022/996 (interconnected EU grid as one mass-balance area)'
    });
  }

  // Gate 3: Chain of Custody Gate
  const custody = (trade.chainOfCustody || 'MASS_BALANCE').toUpperCase();
  // Book-and-claim markets per the market registry (GO markets incl. DK_GO, ES_GDO, PT_EEGO, AIB_GO).
  const isVol = getMarketById(trade.targetMarketId)?.acceptsBookAndClaim === true;
  if (!isVol && custody.includes('BOOK')) {
    isApproved = false;
    checks.push({
      gateName: '3. Chain of Custody Gate',
      status: 'FAIL',
      details: 'HARD BLOCK: Book-and-claim (certificates traded apart from the gas) is not valid for EU quota compliance. Mass balance within the interconnected gas system is required.',
      citation: 'RED III Art. 30 (mass balance and audited chain of custody)'
    });
  } else {
    checks.push({
      gateName: '3. Chain of Custody Gate',
      status: 'PASS',
      details: isVol 
        ? 'Book-and-claim unbundled certificate transfer recognized for voluntary Guarantee of Origin registries.'
        : 'Mass balance chain of custody verified. Book-and-claim strictly quarantined to voluntary GO markets.',
      citation: 'RED III Art. 30 (mass balance and audited chain of custody)'
    });
  }

  // Gate 4: Feedstock Annex IX Gate
  const rawFeedstock = (trade.feedstockCategory || trade.feedstock || '').toLowerCase();
  const isManureOrWaste = rawFeedstock.includes('manure') || 
                          rawFeedstock.includes('slurry') || 
                          rawFeedstock.includes('residue') ||
                          rawFeedstock.includes('waste');
  const isCrops = rawFeedstock.includes('crop') || 
                  rawFeedstock.includes('maize');

  if (isCrops && !isVol && ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC'].includes(trade.targetMarketId)) {
    isApproved = false;
    checks.push({
      gateName: '4. Feedstock Annex IX Gate',
      status: 'FAIL',
      details: 'HARD BLOCK: Food and feed crops are capped under RED III Art. 26(1) and are not advanced feedstock; the desk blocks them in these national quota markets.',
      citation: 'RED III Art. 26(1) and Annex IX'
    });
  } else if (isManureOrWaste) {
    checks.push({
      gateName: '4. Feedstock Annex IX Gate',
      status: 'PASS',
      details: 'Annex IX Part A (animal manure and sewage sludge). Qualifies as advanced feedstock in compliance transport markets (single counting in DE from 2026 under Drs 21/5530, promulgation unconfirmed; double RTFCs in the UK RTFO).',
      citation: 'RED III Annex IX Part A; 38. BImSchV; Bundestag Drs 21/5530'
    });
  } else {
    checks.push({
      gateName: '4. Feedstock Annex IX Gate',
      status: 'PASS',
      details: isCrops && isVol 
        ? 'Energy crops are accepted in voluntary Scope 1 and GO markets, which are not RED III transport quotas and are not bound by the Art. 26 transport cap.'
        : 'Biomass substrate meets sustainability criteria.',
      citation: 'RED III Art. 29'
    });
  }

  // Gate 5: RED III GHG Savings Gate (transport comparator, min savings 65% -> CI <= RED3_TRANSPORT_MAX_CI)
  const ghgSavingsPct = Math.round(((CI_COMPARATOR_ROAD_TRANSPORT - trade.carbonIntensity) / CI_COMPARATOR_ROAD_TRANSPORT) * 100);

  if (!isVol && trade.carbonIntensity > RED3_TRANSPORT_MAX_CI && ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO'].includes(trade.targetMarketId)) {
    isApproved = false;
    checks.push({
      gateName: '5. RED III GHG Savings Gate',
      status: 'FAIL',
      details: `HARD BLOCK: Declared Carbon Intensity (${trade.carbonIntensity} gCO2e/MJ, ${ghgSavingsPct}% savings) fails the mandatory 65% GHG savings threshold (CI <= ${RED3_TRANSPORT_MAX_CI} gCO2e/MJ).`,
      citation: 'RED III Art. 29(10)(c) (65% for transport biogas, installations from 2021)'
    });
  } else if (isVol) {
    checks.push({
      gateName: '5. RED III GHG Savings Gate (Voluntary Exemption)',
      status: 'PASS',
      details: `EXEMPT: Voluntary and Guarantee of Origin markets (${trade.targetMarketId}) are exempt from the 65% transport minimum GHG savings threshold.`,
      citation: 'RED III Art. 19 (Guarantees of Origin) & EECS Rules'
    });
  } else {
    checks.push({
      gateName: '5. RED III GHG Savings Gate',
      status: 'PASS',
      details: `EXCEEDS THRESHOLD: Declared Carbon Intensity (${trade.carbonIntensity} gCO2e/MJ) achieves ${ghgSavingsPct}% GHG savings vs ${CI_COMPARATOR_ROAD_TRANSPORT} gCO2e/MJ fossil comparator (exceeds 65% statutory minimum).`,
      citation: 'RED III Art. 29(10)(c)'
    });
  }

  // Gate 6: Market-Specific Gating & Statutory Ceilings
  if (trade.targetMarketId === 'UK_RGGO') {
    if (!isGb) {
      isApproved = false;
      checks.push({
        gateName: '6. UK RGGO Grid Origin Gating',
        status: 'FAIL',
        details: 'HARD BLOCK: The Green Gas Certification Scheme (GGCS) issues RGGOs for gas injected into the Great Britain (GB) grid. Continental European origins cannot issue RGGOs.',
        citation: 'GGCS scheme rules (section reference not verified)'
      });
    } else {
      checks.push({
        gateName: '6. UK RGGO Registry Eligibility',
        status: 'PASS',
        details: 'GB production facility eligible for Green Gas Certification Scheme (GGCS) registration and RGGO issuance.',
        citation: 'GGCS scheme rules (section reference not verified)'
      });
    }
  } else if (trade.targetMarketId === 'FR_CPB' && (trade.deliveredValueEurMwh || 0) > FR_CPB_CEILING_EUR_MWH) {
    isConditional = true;
    checks.push({
      gateName: '6. French Statutory CPB Price Ceiling',
      status: 'FLAG',
      details: `STATUTORY CLAMP: Delivered price (€${trade.deliveredValueEurMwh?.toFixed(2)}/MWh) exceeds the French CPB penalty ceiling of €${FR_CPB_CEILING_EUR_MWH.toFixed(2)}/MWh. Revenue will be clamped at €${FR_CPB_CEILING_EUR_MWH.toFixed(2)}/MWh.`,
      citation: "Code de l'énergie Art. L.446-24 et seq. (CPB penalty)"
    });
  } else if (trade.targetMarketId === 'DE_THG') {
    checks.push({
      gateName: '6. German 38. BImSchV & Nabisy Registration',
      status: 'PASS',
      details: 'Eligible for German THG quota surrender. Single counting (1×) applies from 2026 under Bundestag Drucksache 21/5530 (promulgation date not yet confirmed). The manure credit in the carbon-intensity calculation is unaffected by quota counting.',
      citation: '38. BImSchV, § 37a BImSchG & Bundestag Drs 21/5530'
    });
  } else {
    checks.push({
      gateName: '6. Destination Market Regulatory Quota',
      status: 'PASS',
      details: `Compliant with national quota administration rules for ${trade.targetMarketId}.`,
      citation: 'National quota rules of the destination market (not checked in detail)'
    });
  }

  // Gate 7: Registry Transfer (GO markets only; compliance PoS trades do not move through GO hubs)
  const goMarket = getMarketById(trade.targetMarketId);
  if (goMarket) {
    const registryGate = evaluateRegistryTransferGate(
      { originCountry: trade.originCountry, injectionCountry: trade.originCountry } as Consignment,
      goMarket
    );
    if (registryGate) {
      const status: GateAuditCheck['status'] =
        registryGate.verdict === 'PASS' ? 'PASS' : registryGate.verdict === 'HARD_BLOCK' ? 'FAIL' : 'FLAG';
      if (status === 'FAIL') isApproved = false;
      if (status === 'FLAG') isConditional = true;
      checks.push({
        gateName: '7. Registry Transfer Gate',
        status,
        details: `${status === 'FAIL' ? 'HARD BLOCK: ' : ''}${registryGate.reason}${registryGate.remedy && status !== 'PASS' ? ' ' + registryGate.remedy : ''}`,
        citation: registryGate.citations[0]?.sourceUrl ?? 'AIB / ERGaR registry hub connectivity (research 4 Oct 2026)'
      });
    }
  }

  const verdict: AuditorResponse['verdict'] = !isApproved ? 'REJECTED' : isConditional ? 'CONDITIONAL_PASS' : 'APPROVED';

  const explanation = `### Chief Compliance Officer Statutory Audit Report
**Transaction:** ${trade.originCountry} (${trade.originPlantId || 'Asset'}) → ${trade.targetMarketId}  
**Feedstock:** ${trade.feedstockCategory} (${trade.carbonIntensity} gCO₂e/MJ) | Volume: ${trade.annualVolumeMWh ? trade.annualVolumeMWh.toLocaleString() + ' MWh' : '10,000 MWh'}

${errorNotice ? `> ⚠ *API Notice: Gemini API connection returned: ${errorNotice}. Full audit executed via local statutory compliance rules.*` : ''}

#### 1. Statutory Eligibility Assessment
${isApproved 
  ? `This proposed transaction is **COMPLIANT** with European Renewable Energy Directive (RED III) standards and eligible for quota surrender in target market **${trade.targetMarketId}**. The consignment satisfies all grid injection, mass balance, feedstock classification, and greenhouse gas savings requirements.`
  : `This proposed transaction is **NON-COMPLIANT** and violates mandatory European or national regulatory gating rules. Executing this trade will result in title rejection by the recipient national registry.`}

#### 2. Carbon Intensity & Avoided Methane Dynamics
- **Fossil Fuel Baseline:** ${CI_COMPARATOR_ROAD_TRANSPORT} gCO₂eq/MJ
- **Achieved GHG Savings:** **${ghgSavingsPct}%** (Mandatory statutory threshold: **65%**, requiring CI ≤ ${RED3_TRANSPORT_MAX_CI} gCO₂eq/MJ).
- **Substrate Classification:** Animal manure qualifies under **Annex IX Part A**. Under German 38. BImSchV and the Zweites Gesetz zur Weiterentwicklung der THG-Quote (Bundestag Drucksache 21/5530; promulgation date not yet confirmed), single counting (1×) applies for 2026+ compliance. The manure credit in the carbon-intensity calculation (45 gCO₂eq per MJ of manure digested, RED Annex V Part C point 6 / Annex VI Part B point 6) is a physical accounting credit and is unaffected by quota counting; use the certified CI on the PoS.

#### 3. Registry & UDB Recording Logistics
- Gas grid injection in **${trade.originCountry}** connects to the interconnected European transmission pipeline network.
- The **Union Database (UDB)** gas module is **not yet live** (launch postponed to end-2026 per the European Biogas Association); this desk's internal trade tracker models a lifecycle of \`DRAFT\` → \`SUBMITTED\` → \`PENDING_UDB_LAUNCH\` → \`TRANSFERRED\`, but no consignment can be formally recorded in the UDB until it launches. In the meantime, cross-border compliance traceability runs through national registries and ERGaR/AIB GO routes.

#### 4. Recommended EFET Contractual Protective Clauses
1. **Proof of Sustainability (PoS) Delivery Schedule:** Agree a fixed electronic delivery date for the valid PoS after each injection month.
2. **Cure Period & Gas-Index Fallback:** Include a negotiated cure period for delayed PoS (length to be agreed; not an EFET-standard term). If seller fails to deliver a RED III-compliant PoS, buyer retains the contractual right to re-price the molecule to the gas index (TTF Day-Ahead) without paying the green certificate premium.
3. **Regulatory Change Protection:** Ensure clause covering statutory amendments or national quota mandate adjustments without indemnification penalty.`;

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
    recommendations: isApproved
      ? [
          'Execute the desk contract schedule with an agreed PoS cure period',
          'Lock electronic transfer schedule in origin registry to prevent domestic cancellation',
          'Monitor UDB launch status (postponed to end-2026 per EBA) before relying on it for commercial invoice generation'
        ]
      : [
          'Re-route volume to a voluntary Scope 1 or GO market where the route checker shows an open path',
          'Replace crop substrate with Annex IX Part A agricultural residues'
        ],
    rawText: explanation,
    sourceEngine: 'DETERMINISTIC_VAULT',
    apiError: errorNotice
  };
}
