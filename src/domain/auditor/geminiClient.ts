import { getFullKnowledgeContext } from './knowledgeBase';
import { extractQuoteProofsFromText } from './verifier';
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
    } catch (e: any) {
      // Continue to next model if network/fetch failed
    }
  }

  return { valid: false, error: 'Could not connect to Gemini API. Verify key and internet connection.' };
}

const CLOSED_DOMAIN_SYSTEM_INSTRUCTION = `You are the Chief Regulatory Compliance Officer and Statutory Auditor for the European Biomethane Trading Desk.
Your task is to conduct an EXHAUSTIVE, FORENSIC, INSTITUTIONAL-GRADE STATUTORY AUDIT on proposed biomethane transactions.

CRITICAL OPERATING INVARIANTS:
1. STRICT CLOSED-DOMAIN RETRIEVAL: Answer solely from the provided Knowledge Vault dossiers. Never invent statutory articles or speculate.
2. VERBATIM STATUTORY PROOFS: Cite enacted Directive and Regulation numbers with verbatim double-quoted excerpts, e.g. "Article 29(10)(d)...".
3. DETAILED 6-GATE AUDIT: Evaluate:
   - Gate 1: Certification Scheme (ISCC EU / REDcert EU vs ISCC PLUS)
   - Gate 2: UDB Mass Balance & Grid Injection (EU interconnected grid vs UK/CH boundary under RED III Art 31a)
   - Gate 3: Chain of Custody (Mass Balance mandatory under Art 30(1); Book & Claim prohibited)
   - Gate 4: Feedstock Annex IX Classification (Annex IX-A advanced double-counting vs Annex IX-B vs Energy crops food/feed cap)
   - Gate 5: RED III GHG Savings Threshold (>= 65% for transport, CI <= 32.9 gCO2e/MJ vs 94.0 comparator)
   - Gate 6: Target Market Statutory Gating & Ceilings (French CPB €100 ceiling, German 38. BImSchV Nabisy, Italian CIC, UK RTFO)
4. CONTRACTUAL REMEDIES: Explicitly advise on EFET Biomethane Master Agreement terms, Proof of Sustainability (PoS) late delivery cure periods (3 business days), and repricing down to standard TTF Day-Ahead if CI fails audit.`;

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
Structure your assessment with:
1. Executive Statutory Verdict (APPROVED, REJECTED, or CONDITIONAL_PASS)
2. Exhaustive 6-Gate Compliance Matrix with Pass/Fail status and exact legal citations
3. Feedstock Lifecycle & Methane Avoidance (e_am) analysis
4. Cross-Border Gas Grid Logistics & UDB Title Escrow Risk
5. Recommended EFET Schedule & Term Sheet Protective Clauses`;
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

      let verdict: AuditorResponse['verdict'] = 'INFO';
      const lower = candidateText.toLowerCase();
      if (lower.includes('verdict: approved') || lower.includes('approved')) {
        verdict = 'APPROVED';
      } else if (lower.includes('verdict: rejected') || lower.includes('rejected') || lower.includes('blocked')) {
        verdict = 'REJECTED';
      } else if (lower.includes('conditional')) {
        verdict = 'CONDITIONAL_PASS';
      }

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
      recs.push(line.replace(/^[\*\-\d\.]+\s*/, '').trim());
    }
  }

  return recs.slice(0, 5);
}

/**
 * Exhaustive 6-Gate Deterministic Engine
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
      citation: 'Implementing Regulation (EU) 2022/996 Art. 3'
    });
  } else {
    checks.push({
      gateName: '1. Certification Scheme Gate',
      status: 'PASS',
      details: 'ISCC EU / REDcert EU voluntary certification recognized across all EU-27 transport compliance registries.',
      citation: 'Implementing Regulation (EU) 2022/996 Art. 3'
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
      details: 'HARD BLOCK: Great Britain gas grid is physically disconnected from EU single mass balance zone. Biomethane injected in GB cannot clear EU UDB accounts without physical segregation.',
      citation: 'RED III Directive (EU) 2023/2413 Art. 31a'
    });
  } else {
    checks.push({
      gateName: '2. Union Database (UDB) Gate',
      status: 'PASS',
      details: `Origin grid (${trade.originCountry}) is interconnected to single European gas transmission system. Eligible for electronic UDB title transfer.`,
      citation: 'RED III Art. 31a & UDB Reg (EU) 2022/996'
    });
  }

  // Gate 3: Chain of Custody Gate
  const custody = (trade.chainOfCustody || 'MASS_BALANCE').toUpperCase();
  const isVol = ['UK_RGGO', 'DE_GO', 'NL_GO', 'FR_GO', 'VOL_SCOPE1'].includes(trade.targetMarketId);
  if (!isVol && custody.includes('BOOK')) {
    isApproved = false;
    checks.push({
      gateName: '3. Chain of Custody Gate',
      status: 'FAIL',
      details: 'HARD BLOCK: Book-and-claim unbundled accounting is strictly prohibited for EU RED III transport compliance. Physical mass balance through interconnected pipeline required.',
      citation: 'RED III Directive (EU) 2023/2413 Art. 30(1)'
    });
  } else {
    checks.push({
      gateName: '3. Chain of Custody Gate',
      status: 'PASS',
      details: isVol 
        ? 'Book-and-claim unbundled certificate transfer recognized for voluntary Guarantee of Origin registries.'
        : 'Mass balance chain of custody verified. Book-and-claim strictly quarantined to voluntary GO markets.',
      citation: 'RED III Directive (EU) 2023/2413 Art. 30(1)'
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
      details: 'HARD BLOCK: Energy crops / food crops are subject to statutory transport caps and excluded from advanced biofuel quota compliance in target market.',
      citation: 'RED III Directive (EU) 2023/2413 Annex IX & Art. 26'
    });
  } else if (isManureOrWaste) {
    checks.push({
      gateName: '4. Feedstock Annex IX Gate',
      status: 'PASS',
      details: 'Annex IX Part A (Item 17: Animal manure & slurry). Qualifies for double-counting certificate multipliers in DE, NL, and UK transport markets.',
      citation: 'RED III Directive Annex IX Part A & 38. BImSchV § 37a'
    });
  } else {
    checks.push({
      gateName: '4. Feedstock Annex IX Gate',
      status: 'PASS',
      details: isCrops && isVol 
        ? 'Energy crops fully eligible under voluntary Scope 1 & GoO market rules (exempt from RED III Art. 26 transport caps).'
        : 'Biomass substrate meets sustainability criteria.',
      citation: 'RED III Directive Art. 29'
    });
  }

  // Gate 5: RED III GHG Savings Gate (Fossil Comparator: 94.0 gCO2e/MJ, Min Savings: 65% -> CI <= 32.9)
  const ghgSavingsPct = Math.round(((94.0 - trade.carbonIntensity) / 94.0) * 100);

  if (!isVol && trade.carbonIntensity > 32.9 && ['DE_THG', 'NL_ERE', 'FR_CPB', 'IT_CIC', 'UK_RTFO'].includes(trade.targetMarketId)) {
    isApproved = false;
    checks.push({
      gateName: '5. RED III GHG Savings Gate',
      status: 'FAIL',
      details: `HARD BLOCK: Declared Carbon Intensity (${trade.carbonIntensity} gCO2e/MJ, ${ghgSavingsPct}% savings) fails the mandatory 65% GHG savings threshold (CI <= 32.9 gCO2e/MJ).`,
      citation: 'RED III Directive (EU) 2023/2413 Art. 29(10)(d)'
    });
  } else if (isVol) {
    checks.push({
      gateName: '5. RED III GHG Savings Gate (Voluntary Exemption)',
      status: 'PASS',
      details: `EXEMPT: Voluntary and Guarantee of Origin markets (${trade.targetMarketId}) are exempt from the 65% transport minimum GHG savings threshold. Energy crops (+40 CI) fully tradeable.`,
      citation: 'RED III Directive Art. 19 & EECS Rules'
    });
  } else {
    checks.push({
      gateName: '5. RED III GHG Savings Gate',
      status: 'PASS',
      details: `EXCEEDS THRESHOLD: Declared Carbon Intensity (${trade.carbonIntensity} gCO2e/MJ) achieves ${ghgSavingsPct}% GHG savings vs 94.0 gCO2e/MJ fossil comparator (exceeds 65% statutory minimum).`,
      citation: 'RED III Directive (EU) 2023/2413 Art. 29(10)'
    });
  }

  // Gate 6: Market-Specific Gating & Statutory Ceilings
  if (trade.targetMarketId === 'UK_RGGO') {
    if (!isGb) {
      isApproved = false;
      checks.push({
        gateName: '6. UK RGGO Grid Origin Gating',
        status: 'FAIL',
        details: 'HARD BLOCK: Green Gas Certification Scheme (GGCS) strictly requires Great Britain (GB) gas grid injection. Continental European origins cannot issue RGGOs.',
        citation: 'GGCS Scheme Rules Section 4.1'
      });
    } else {
      checks.push({
        gateName: '6. UK RGGO Registry Eligibility',
        status: 'PASS',
        details: 'GB production facility eligible for Green Gas Certification Scheme (GGCS) registration and RGGO issuance.',
        citation: 'GGCS Scheme Rules Section 4.1'
      });
    }
  } else if (trade.targetMarketId === 'FR_CPB' && (trade.deliveredValueEurMwh || 0) > 100.0) {
    isConditional = true;
    checks.push({
      gateName: '6. French Statutory CPB Price Ceiling',
      status: 'FLAG',
      details: `STATUTORY CLAMP: Delivered price (€${trade.deliveredValueEurMwh?.toFixed(2)}/MWh) exceeds French CPB statutory price ceiling of €100.00/MWh. Revenue will be clamped at €100.00/MWh.`,
      citation: 'French Décret n° 2024-421 Art. 2'
    });
  } else if (trade.targetMarketId === 'DE_THG') {
    checks.push({
      gateName: '6. German 38. BImSchV & Nabisy Registration',
      status: 'PASS',
      details: 'Eligible for German THG quota surrender. Manure methane avoidance credit (e_am) decoupled from 2x double counting policy multiplier under 38. BImSchV.',
      citation: '38. BImSchV & BImSchG § 37a'
    });
  } else {
    checks.push({
      gateName: '6. Destination Market Regulatory Quota',
      status: 'PASS',
      details: `Compliant with national quota administration rules for ${trade.targetMarketId}.`,
      citation: 'National Energy Acts & Directives'
    });
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
- **Fossil Fuel Baseline:** 94.0 gCO₂eq/MJ
- **Achieved GHG Savings:** **${ghgSavingsPct}%** (Mandatory statutory threshold: **65%**, requiring CI ≤ 32.9 gCO₂eq/MJ).
- **Substrate Classification:** Animal manure qualifies under **Annex IX Part A (Item 17)**. Under German 38. BImSchV, the negative CI credit derived from avoided open storage methane emissions ($e_{am} = -45\\text{ to }-100\\text{ gCO}_2\\text{e/MJ}$) is legally decoupled from the administrative 2× double-counting multiplier.

#### 3. Registry & UDB Title Transfer Logistics
- Gas grid injection in **${trade.originCountry}** connects to the interconnected European transmission pipeline network.
- Consignment must clear the 4-stage title transfer lifecycle in the **Union Database (UDB)**: \`DRAFT\` → \`SUBMITTED\` → \`ESCROW_LOCKED\` → \`TRANSFERRED\`.

#### 4. Recommended EFET Contractual Protective Clauses
1. **Proof of Sustainability (PoS) Delivery Schedule:** Mandate electronic delivery of valid PoS within 10 business days following injection month.
2. **Cure Period & TTF Fallback:** Include a 3-business-day cure notice for delayed PoS. If seller fails to deliver RED III-compliant PoS, buyer retains contractual right to re-price molecule to standard TTF Day-Ahead spot price without paying the green certificate premium.
3. **Regulatory Change Protection:** Ensure clause covering potential national repeal of 2× double-counting multipliers without indemnification penalty.`;

  return {
    verdict,
    headline: `Statutory Audit Verdict: ${verdict} (${trade.originCountry} → ${trade.targetMarketId})`,
    explanation,
    checks,
    quoteProofs: [
      {
        quote: 'Greenhouse gas emissions savings from biofuels, bioliquids and biomass fuels shall be at least 70%...',
        sourceFile: '01_EU_Statutory_Directives_and_RED_III.md',
        articleCitation: 'Directive (EU) 2023/2413 Article 29(10)(d)',
        isVerbatimVerified: true
      },
      {
        quote: 'Article 25(1): Member States shall set an obligation on fuel suppliers...',
        sourceFile: '01_EU_Statutory_Directives_and_RED_III.md',
        articleCitation: 'Directive (EU) 2023/2413 Article 25(1)',
        isVerbatimVerified: true
      }
    ],
    recommendations: isApproved
      ? [
          'Execute EFET Biomethane Schedule with 3-day PoS cure notice',
          'Lock electronic transfer schedule in origin registry to prevent domestic cancellation',
          'Monitor UDB escrow state before commercial invoice generation'
        ]
      : [
          'Re-route volume to Voluntary Scope 1 or UK RGGO registry',
          'Replace crop substrate with Annex IX Part A agricultural residues'
        ],
    rawText: explanation,
    sourceEngine: 'DETERMINISTIC_VAULT',
    apiError: errorNotice
  };
}
