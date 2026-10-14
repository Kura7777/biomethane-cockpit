import { ArbitrageOpportunity, RegulatoryWhatIfScenario } from '../domain/arbitrage/types';
import { MarksState, CostInputs } from '../domain/netback/types';
import { Consignment } from '../domain/consignment/types';
import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from '../domain/plants/types';
import { BIOMETHANE_PLANTS, DEVELOPER_PORTFOLIOS, COUNTRY_MACRO_STATS, searchPlants } from '../domain/plants/registry';
import { MARKETS } from '../domain/markets/registry';
import { getStoredGeminiApiKey } from '../domain/regcheck/storage';

export type GeminiModelId = 
  | 'gemini-2.5-flash'
  | 'gemini-2.5-pro'
  | 'gemini-2.0-flash'
  | 'gemini-1.5-flash'
  | 'gemini-1.5-pro'
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
  if (!marks) return 'Live Marks: No desk marks currently loaded.';
  const lines: string[] = ['LIVE OBSERVED DESK MARKS & COMPLIANCE CERTIFICATES:'];
  if (marks.gasIndex.mid != null) lines.push(`- TTF Natural Gas Mid: €${marks.gasIndex.mid.toFixed(2)}/MWh`);
  if (marks.marks) {
    for (const [key, m] of Object.entries(marks.marks)) {
      if (m && m.mid != null) {
        lines.push(`- ${key}: €${m.mid.toFixed(2)}`);
      }
    }
  }
  return lines.join('\n');
}

/**
 * Dispatch an LLM query to Google Gemini API with automatic model fallback
 * and pure client-side execution.
 */
export async function callGeminiAgent(req: GeminiAgentRequest): Promise<string> {
  const apiKey = (req.apiKey || getStoredGeminiApiKey() || '').trim();

  // If API key is available, execute HTTPS request to Google Gemini API
  if (apiKey) {
    const primaryModel = req.model || 'gemini-2.5-flash';
    const fallbackModels: GeminiModelId[] = [
      'gemini-2.5-flash',
      'gemini-2.5-pro',
      'gemini-2.0-flash',
    ];
    const uniqueModels = Array.from(new Set([primaryModel, ...fallbackModels]));

    const marksSummary = buildMarksSummary(req.contextData?.marks);

    const scenarioSummary = req.contextData?.scenario ? `
REGULATORY SCENARIO CONFIGURATION:
- UK Gas Grid EU UDB Recognition: ${req.contextData.scenario.ukUdbRecognition ? 'Bilateral Treaty Active (UDB Pass)' : 'Hard Block (UDB Ineligible for EU Mass Balance)'}
- FuelEU Consecutive Escalation Years: ${req.contextData.scenario.fuelEUEscalationYears}
- French CPB Price Ceiling: €${req.contextData.scenario.frCpbPenaltyCap.toFixed(2)}/MWh
` : '';

    const consignmentSummary = req.contextData?.activeConsignment ? `
ACTIVE PHYSICAL CONSIGNMENT SPECIFICATION:
- Consignment ID: ${req.contextData.activeConsignment.id}
- Origin Country: ${req.contextData.activeConsignment.originCountry}
- Feedstock Type: ${req.contextData.activeConsignment.feedstock}
- Certified Carbon Intensity (CI): ${req.contextData.activeConsignment.carbonIntensity} gCO2e/MJ
- Monthly Volume: ${req.contextData.activeConsignment.volumeMWh != null ? req.contextData.activeConsignment.volumeMWh.toLocaleString() : 'Unset'} MWh
- Target Delivery Market: ${req.contextData.activeConsignment.injectionCountry}
` : '';

    const plantSearchResults = req.userPrompt.length > 2 ? (() => {
      const results = searchPlants(req.userPrompt);
      if (results.length === 0) return '';
      return `\nMATCHED FACILITIES FROM PAN-EUROPEAN REGISTRY (GIE/EBA 2026 Map, 1,975 plants):\n` +
        results.slice(0, 5).map(p => `- ${p.name} (${p.country}): Operator ${p.operator || 'Unverified'}, Capacity ${p.capacityNm3h ? `${p.capacityNm3h} Nm³/h` : 'Unverified'}, Tech ${p.upgradingTechnology || 'Unverified'}`).join('\n');
    })() : '';

    const arbitrageSummary = req.contextData?.topOpportunities && req.contextData.topOpportunities.length > 0 ? `
TOP CROSS-BORDER ARBITRAGE ROUTES (Pan-European Matrix):
${req.contextData.topOpportunities.slice(0, 5).map(o => `
- ${o.originFlag} ${o.originCountryName} ➔ ${o.targetFlag} ${o.targetMarketName} (${o.feedstockName}):
   - Net Desk Margin: ${o.deskNetMarginEurPerMWh != null ? `€${o.deskNetMarginEurPerMWh.toFixed(2)}/MWh` : 'N/A'}
   - Delivered Stack: ${o.totalTerminalValueStackEurPerMWh != null ? `€${o.totalTerminalValueStackEurPerMWh.toFixed(2)}/MWh` : 'N/A'}
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

*(Note: Connect Gemini API Key in Settings for deep custom LLM reasoning)*`;
  }

  return `### 🤖 European Biomethane Desk Copilot (Deterministic Mode)

* **Pan-European Registry**: 1,975 biomethane facilities across 26 countries (GIE/EBA 2026 Map).
* **Directives & Regulations**: RED III (Directive (EU) 2023/2413), FuelEU Maritime (Regulation (EU) 2023/1805), German BImSchG, French CPB, Dutch ERE, UK RTFO.
* **Prompt**: Enter marks in the Marks screen or enter a Gemini API Key to run deep scenario queries.`;
}
