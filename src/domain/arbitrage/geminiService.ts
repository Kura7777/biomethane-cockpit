import { ArbitrageOpportunity, RegulatoryWhatIfScenario } from './types';
import { MarksState, CostInputs } from '../netback/types';
import { Consignment } from '../consignment/types';
import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from '../plants/types';
import { BIOMETHANE_PLANTS, DEVELOPER_PORTFOLIOS, COUNTRY_MACRO_STATS, searchPlants } from '../plants/registry';
import { MARKETS } from '../markets/registry';

export type GeminiModelId = 
  | 'gemini-3.7-flash'
  | 'gemini-3.6-flash'
  | 'gemini-3.5-flash'
  | 'gemini-2.0-flash'
  | 'gemini-2.0-flash-thinking-exp'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | (string & {});

export interface RankedOpportunitySummary {
  rank: number;
  marketId: string;
  marketName: string;
  netNetbackEurPerMWh: number | null;
  certificateValueEurPerMWh: number | null;
  deskMarginEurPerMWh: number | null;
  overallVerdict: string;
  legalBasis: string;
}

export interface GeminiAgentRequest {
  apiKey?: string;
  model?: GeminiModelId;
  systemInstruction?: string;
  userPrompt: string;
  contextData?: {
    topOpportunities?: ArbitrageOpportunity[];
    rankedNetbacks?: RankedOpportunitySummary[];
    scenario?: RegulatoryWhatIfScenario;
    marks?: MarksState;
    costs?: CostInputs;
    activeConsignment?: Consignment | null;
    savedAssessmentsCount?: number;
  };
}

/**
 * Build live marks summary without fabricating missing marks
 */
function buildMarksSummary(marks?: MarksState): string {
  if (!marks) return 'LIVE DESK MARKS & ENERGY INDICES: None provided.';

  const lines: string[] = ['LIVE DESK MARKS & ENERGY INDICES:'];
  
  // TTF
  const ttfBid = marks.gasIndex.bid != null ? `€${marks.gasIndex.bid.toFixed(2)}/MWh` : 'NO MARK ENTERED';
  const ttfOffer = marks.gasIndex.offer != null ? `€${marks.gasIndex.offer.toFixed(2)}/MWh` : 'NO MARK ENTERED';
  lines.push(`* TTF Natural Gas Index: Bid: ${ttfBid} | Offer: ${ttfOffer}`);

  // FX
  const gbp = marks.fx.gbpEur != null ? marks.fx.gbpEur.toFixed(4) : 'NO FX ENTERED';
  const chf = marks.fx.chfEur != null ? marks.fx.chfEur.toFixed(4) : 'NO FX ENTERED';
  lines.push(`* FX Rates: GBP/EUR = ${gbp} | CHF/EUR = ${chf}`);

  // Active Market marks
  const marketKeys = Object.keys(marks.marks);
  if (marketKeys.length === 0) {
    lines.push('* Active Compliance Markets: NO MARKS ENTERED');
  } else {
    for (const [mId, mVal] of Object.entries(marks.marks)) {
      const bidStr = mVal.bid != null ? `${mVal.bid}` : 'NO MARK';
      const offerStr = mVal.offer != null ? `${mVal.offer}` : 'NO MARK';
      lines.push(`* [${mId}] Bid: ${bidStr} | Offer: ${offerStr} (Source: ${mVal.source || 'Manual'})`);
    }
  }

  return lines.join('\n');
}

/**
 * Call Google Gemini API with comprehensive context access and strict epistemic constraints
 */
export async function queryDeskAgent(req: GeminiAgentRequest): Promise<string> {
  const apiKey = req.apiKey?.trim();

  // If user provided a Gemini API Key, call the official Google AI endpoint
  if (apiKey) {
    const candidateModels: GeminiModelId[] = [
      req.model || 'gemini-2.0-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-3.6-flash',
      'gemini-2.5-pro',
    ];

    const uniqueModels = Array.from(new Set(candidateModels));

    // Dynamic search for specific plant queries in prompt
    const matchedPlants = searchPlants(req.userPrompt).slice(0, 8);
    const plantSearchResults = matchedPlants.length > 0 ? `
MATCHED BIOMETHANE FACILITIES FROM GIE/EBA 2026 MAP (1,975 Register):
${matchedPlants.map(p => `
* [${p.id.toUpperCase()}] ${p.name} — ${p.countryFlag} ${p.country}
  - Provenance: ${p.provenance}
  - Verified Data: Name, Country, Facility ID
  - Unverified Attributes: ${p.fieldsUnverified ? p.fieldsUnverified.join(', ') : 'operator, capacity, coordinates unverified'}
`).join('')}
` : '';

    const marksSummary = buildMarksSummary(req.contextData?.marks);

    // Active Regulatory Policy & Scenario Switches
    const scenarioSummary = req.contextData?.scenario ? `
REGULATORY WHAT-IF POLICY SIMULATOR STATE:
* German THG Double Counting (§37a BImSchG): ${req.contextData.scenario.deDoubleCounting === 'DC_ON' ? '2× Double Counting Active' : '1× Single Counting Baseline (Eliminated)'}
* UK UDB Mutual Recognition: ${req.contextData.scenario.ukUdbRecognition ? 'Mutual recognition enabled (UK exports clear EU)' : 'Current Law: UK Grid Injected BLOCKED at EU UDB'}
* FuelEU Non-Compliance Escalation: Year ${req.contextData.scenario.fuelEUEscalationYears} (+${((req.contextData.scenario.fuelEUEscalationYears - 1) * 10)}% penalty multiplier)
` : '';

    // Active Consignment from Trade Builder (if set)
    const consignmentSummary = req.contextData?.activeConsignment ? `
ACTIVE TRADER CONSIGNMENT IN TRADE BUILDER:
* Name: ${req.contextData.activeConsignment.name}
* Origin: ${req.contextData.activeConsignment.originCountryName} (${req.contextData.activeConsignment.originCountry})
* Feedstock: ${req.contextData.activeConsignment.feedstockName} (CI: ${req.contextData.activeConsignment.carbonIntensity} gCO2e/MJ)
* Certification: ${req.contextData.activeConsignment.certificationScheme} | Custody: ${req.contextData.activeConsignment.chainOfCustody}
* Injection: ${req.contextData.activeConsignment.injectionCountry} (EU: ${req.contextData.activeConsignment.injectionIsEU ? 'Yes' : 'No'})
* Volume: ${req.contextData.activeConsignment.volumeMWh ? `${req.contextData.activeConsignment.volumeMWh.toLocaleString()} MWh` : 'Unspecified'}
` : '';

    // Live Top Arbitrage Deals from deterministic engine
    const arbitrageSummary = req.contextData?.topOpportunities && req.contextData.topOpportunities.length > 0 ? `
LIVE TOP EUROPEAN ARBITRAGE ROUTES (from deterministic engine):
${req.contextData.topOpportunities.slice(0, 6).map((o, i) => `
#${i + 1}. ${o.originFlag} ${o.originCountryName} ➔ ${o.targetFlag} ${o.targetMarketName}
   - Feedstock: ${o.feedstockName} (CI: ${o.carbonIntensity} gCO2e/MJ)
   - Total Delivered Value Stack: ${o.totalTerminalValueStackEurPerMWh != null ? `€${o.totalTerminalValueStackEurPerMWh.toFixed(2)}/MWh` : 'Incomplete mark'}
   - Modelled Desk Net Margin: ${o.deskNetMarginEurPerMWh != null ? `€${o.deskNetMarginEurPerMWh.toFixed(2)}/MWh` : 'Incomplete mark'}
   - Regulatory Clearance: ${o.overallVerdict} (${o.regulatoryRationale})
`).join('')}
` : '';

    const systemPrompt = req.systemInstruction || `
You are the Senior Regulatory & Commercial Trading Strategist for a European Biomethane & Environmental Attribute Trading Desk.

Your mission:
1. Provide comprehensive, articulate, and actionable trading intelligence for cross-border biomethane consignments.
2. Structure your answers with clear sections:
   - **Executive Trade Recommendation**: Top market placement, delivered netback (€/MWh), notional value, and desk margin.
   - **Market Comparison Ladder**: Comparison against alternative destinations (e.g. DE THG vs NL ERE vs FR CPB vs FuelEU Maritime).
   - **Regulatory Risk & Downside Analysis**: Detail statutory rules, specifically §37a BImSchG German double counting (2× active vs 1× single counting baseline), Dutch ERE surrender, French CPB €100 ceiling, and UDB mass balance boundaries.
   - **Recommended Desk Actions**: Concrete execution steps (e.g., contracting structure, index-linked sharing, UDB registration).
3. Use clean, professional Markdown formatting with bold metrics and structured bullet points.
`;

    // Calculated Netbacks for active consignment
    const rankedSummary = req.contextData?.rankedNetbacks && req.contextData.rankedNetbacks.length > 0 ? `
CALCULATED NETBACKS & SPREAD LADDER (from live engine):
${req.contextData.rankedNetbacks.map(r => `
#${r.rank}. ${r.marketName} (${r.marketId})
   - Net Netback: ${r.netNetbackEurPerMWh != null ? `€${r.netNetbackEurPerMWh.toFixed(2)}/MWh` : 'N/A'}
   - Certificate Value: ${r.certificateValueEurPerMWh != null ? `€${r.certificateValueEurPerMWh.toFixed(2)}/MWh` : 'N/A'}
   - Desk Net Margin: ${r.deskMarginEurPerMWh != null ? `€${r.deskMarginEurPerMWh.toFixed(2)}/MWh` : 'N/A'}
   - Legal Clearance: ${r.overallVerdict} (${r.legalBasis})
`).join('')}
` : '';

    const fullPrompt = `
=== LIVE TRADING DESK MARKET DATA & COMPUTATIONS ===
${marksSummary}
${scenarioSummary}
${consignmentSummary}
${rankedSummary}
${arbitrageSummary}
${plantSearchResults}

=== TRADER INQUIRY ===
${req.userPrompt}

Please provide a detailed, authoritative trading desk advisory answering the inquiry in full based on the live figures and regulatory rules above.
`;

    let lastErrMsg = '';
    let lastStatus = 0;

    for (const modelName of uniqueModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 4000,
            },
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return text;
          }
        }

        lastStatus = response.status;
        const errJson = await response.json().catch(() => ({}));
        lastErrMsg = errJson.error?.message || `HTTP ${response.status} ${response.statusText}`;
        console.warn(`[Gemini API] ${modelName} returned error (${lastErrMsg}). Trying next model...`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        lastErrMsg = msg;
        console.warn(`[Gemini API] Failed calling ${modelName}: ${msg}. Trying next model...`);
      }
    }

    return `⚠️ [Gemini API Error (HTTP ${lastStatus || 'Network'}): ${lastErrMsg || 'Request failed'}]\n\nFalling back to deterministic desk intelligence:\n\n` + generateLocalAgentResponse(req);
  }

  // Built-in Local Desk Intelligence (Zero API Key required)
  return generateLocalAgentResponse(req);
}

/**
 * Deterministic local heuristic response without fabricated prices or deals
 */
export function generateLocalAgentResponse(req: GeminiAgentRequest): string {
  const query = req.userPrompt.toLowerCase();
  const topOpps = req.contextData?.topOpportunities || [];

  const matched = searchPlants(req.userPrompt);
  if (matched.length > 0) {
    const p = matched[0];
    return `### 🏭 Biomethane Facility Record: ${p.name}

* **Country**: ${p.countryFlag} ${p.country}
* **Facility Code**: ${p.id.toUpperCase()}
* **Sourced Provenance**: ${p.provenance}
* **Source Record**: Location name and national facility ID verified from GIE/EBA 2026 Map.
* **Unverified Attributes**: Operator, capacity, upgrading technology, and coordinates are not provided by the GIE/EBA source map (marked unverified).`;
  }

  if (query.includes('uk') && (query.includes('grid') || query.includes('udb') || query.includes('trap') || query.includes('blocked') || query.includes('food waste'))) {
    return `### 🛡️ Compliance Rule: UK Grid ➔ EU UDB Mass Balance Boundary

**Statutory Finding**:
* **Status**: ❌ **HARD BLOCK** at UDB Gate for continental EU compliance (Germany THG, Netherlands ERE, France CPB).
* **Legal Citation**: **Directive (EU) 2023/2413 Article 31a & Commission Implementing Reg. 2024/2792**.
* **Reason**: UK gas grid injection is physically and regulatorily outside the EU single mass balance zone and cannot be recorded in the **Union Database (UDB)**.
* **Producer Note**: Holding an ISCC EU production site certificate does not override the grid injection UDB requirement.

**Remedies**:
1. Supply the domestic **UK RTFO** quota market.
2. Supply via **physically segregated Bio-LNG** with point-to-point chain of custody avoiding non-EU grid mixing.`;
  }

  if (query.includes('double counting') || query.includes('german') || query.includes('thg') || query.includes('37a')) {
    return `### ⚖️ German THG §37a BImSchG Double Counting Status

**Regulatory Dual-Branch Status**:
* **Status**: ⚠️ **UNRESOLVED** under current legal transposition.
* **Double Counting Active (2× Branch)**: Manure and Annex IX-A feedstocks receive double quota compliance credit per MWh, yielding maximum certificate value if recognized by the German customs authority (Hauptzollamt).
* **Single Counting Baseline (1× Branch)**: If double counting is eliminated or restricted for cross-border imports, netback returns to single-count baseline.
* **Desk Rule**: Always evaluate both 2× and 1× branches when structuring cross-border trades into Germany.`;
  }

  if (topOpps.length > 0) {
    const completeOpps = topOpps.filter(o => o.deskNetMarginEurPerMWh != null);
    const oppsToDisplay = completeOpps.length > 0 ? completeOpps : topOpps;
    const best = oppsToDisplay[0];

    return `### 📊 Top Deterministic Arbitrage Route

* **Route**: ${best.originFlag} **${best.originCountryName}** ➔ ${best.targetFlag} **${best.targetMarketName}**
* **Feedstock**: ${best.feedstockName} (CI: ${best.carbonIntensity} gCO₂e/MJ)
* **Total Delivered Value Stack**: ${best.totalTerminalValueStackEurPerMWh != null ? `€${best.totalTerminalValueStackEurPerMWh.toFixed(2)}/MWh` : 'Incomplete mark inputs'}
* **Modelled Desk Net Margin**: ${best.deskNetMarginEurPerMWh != null ? `€${best.deskNetMarginEurPerMWh.toFixed(2)}/MWh` : 'Incomplete mark inputs'}
* **Regulatory Verdict**: ${best.overallVerdict} (${best.regulatoryRationale})

*(Note: Connect Gemini API Key via top-right key icon for deep custom LLM reasoning)*`;
  }

  return `### 🤖 European Biomethane Desk Copilot (Deterministic Mode)

* **Pan-European Registry**: 1,975 biomethane facilities across 26 countries (GIE/EBA 2026 Map).
* **Directives & Regulations**: RED III (Directive (EU) 2023/2413), FuelEU Maritime (Regulation (EU) 2023/1805), German BImSchG, French CPB, Dutch ERE, UK RTFO.
* **Prompt**: Enter marks in the Marks screen or enter a Gemini API Key to run deep scenario queries.`;
}
