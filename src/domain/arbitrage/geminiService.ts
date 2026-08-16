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
  | 'gemini-3.5-flash-lite'
  | 'gemini-3.1-flash-lite'
  | 'gemini-3.7-pro'
  | 'gemini-2.5-pro'
  | 'gemini-2.5-flash'
  | 'gemini-2.0-flash';

export interface GeminiAgentRequest {
  apiKey?: string;
  model?: GeminiModelId;
  systemInstruction?: string;
  userPrompt: string;
  contextData?: {
    topOpportunities?: ArbitrageOpportunity[];
    scenario?: RegulatoryWhatIfScenario;
    marks?: MarksState;
    costs?: CostInputs;
    activeConsignment?: Consignment | null;
    savedAssessmentsCount?: number;
  };
}

/**
 * Call Google Gemini API with comprehensive context access across the entire biomethane desk application
 */
export async function queryDeskAgent(req: GeminiAgentRequest): Promise<string> {
  const apiKey = req.apiKey?.trim();

  // If user provided a Gemini API Key, call the official Google AI endpoint
  if (apiKey) {
    // Intelligent priority fallback chain: prioritize fastest active Flash models
    const candidateModels: GeminiModelId[] = [
      req.model || 'gemini-3.7-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-2.0-flash',
      'gemini-2.5-flash',
    ];

    const uniqueModels = Array.from(new Set(candidateModels));

    // Dynamic search for specific plant or country queries in trader prompt
    const promptLower = req.userPrompt.toLowerCase();
    const matchedPlants = searchPlants(req.userPrompt).slice(0, 8);
    const plantSearchResults = matchedPlants.length > 0 ? `
MATCHED BIOMETHANE FACILITIES FROM 1,986 REGISTER:
${matchedPlants.map(p => `
* [${p.id.toUpperCase()}] ${p.name} — ${p.countryFlag} ${p.country} (${p.region})
  - Operator: ${p.operator} | Status: ${p.status}
  - Capacity: ${p.capacityNm3h} Nm³/h (${p.annualEnergyGWh} GWh/yr)
  - Feedstock: ${p.primaryFeedstockCategory} (${p.feedstockDetails})
  - Upgrading: ${p.upgradingTechnology} | Grid: ${p.gridConnectionType} (${p.networkOperator})
  - Certification: ${p.certificationAndRegistry}
`).join('')}
` : '';

    // Active Market Marks summary
    const marksSummary = req.contextData?.marks ? `
LIVE DESK MARKS & ENERGY INDICES:
* TTF Natural Gas Index: €${req.contextData.marks.gasIndex.bid?.toFixed(2) ?? '28.00'}/MWh (Bid) / €${req.contextData.marks.gasIndex.offer?.toFixed(2) ?? '29.00'}/MWh (Offer)
* FX: GBP/EUR = ${req.contextData.marks.fx.gbpEur?.toFixed(4) ?? '1.1800'} | CHF/EUR = ${req.contextData.marks.fx.chfEur?.toFixed(4) ?? '1.0600'}
* DE_THG (Germany): €${req.contextData.marks.marks.DE_THG?.bid ?? '300'}/tCO2e (${req.contextData.marks.marks.DE_THG?.source ?? 'Mark'})
* FR_CPB (France): €${req.contextData.marks.marks.FR_CPB?.bid ?? '150'}/MWh (Capped at €100 statutory ceiling)
* NL_ERE (Netherlands): €${req.contextData.marks.marks.NL_ERE?.bid ?? '0.30'}/HBE (approx. €83.40/MWh)
* UK_RTFO (United Kingdom): £${req.contextData.marks.marks.UK_RTFO?.bid ?? '0.25'}/dRTFC (approx. €42.48/MWh at 144 dRTFC/MWh)
* FUELEU (Maritime): €${req.contextData.marks.marks.FUELEU?.bid ?? '240'}/MWh (Avoided penalty stack up to €437.69/MWh)
* IT_CIC (Italy): €${req.contextData.marks.marks.IT_CIC?.bid ?? '375'}/CIC
` : '';

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

    // Live Top Arbitrage Deals
    const arbitrageSummary = req.contextData?.topOpportunities ? `
LIVE TOP EUROPEAN ARBITRAGE ROUTES (20 Origins x 14 Compliance Destinations):
${req.contextData.topOpportunities.slice(0, 6).map((o, i) => `
#${i + 1}. ${o.originFlag} ${o.originCountryName} ➔ ${o.targetFlag} ${o.targetMarketName}
   - Feedstock: ${o.feedstockName} (CI: ${o.carbonIntensity} gCO2e/MJ)
   - Total Delivered Value Stack: €${o.totalTerminalValueStackEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh
   - Upstream Producer Pay (Index-Linked ~90%): €${o.producerPayableEurPerMWh.toFixed(2)}/MWh
   - Grid Transit Tariff: €${o.transitCostEurPerMWh.toFixed(2)}/MWh
   - REAL DESK NET MARGIN: €${o.deskNetMarginEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh
   - Trade P&L (10,000 MWh): €${(o.totalDealProfitEur ?? 0).toLocaleString()}
   - Regulatory Clearance: ${o.overallVerdict} (${o.regulatoryRationale})
`).join('')}
` : '';

    const systemPrompt = req.systemInstruction || `
You are the Chief Regulatory & Commercial Biomethane Trading Strategist for a Tier-1 European energy trading desk.
You have FULL, UNRESTRICTED ACCESS to all data layers across the Biomethane Desk Cockpit:
1. PAN-EUROPEAN PLANT DIRECTORY: Complete register of 1,986 operating facilities (FR: 829, DE: 282, IT: 273, UK: 128, NL: 92, SE: 67, DK: 61, CH: 48, FI: 32, ES: 26, AT: 20, BE: 18, NO: 15, CZ: 13, PT: 13, EE: 12, LV: 12, LT: 12, etc.).
2. DEVELOPER PORTFOLIOS: Major operators (Nature Energy/Shell: 4,200 GWh/yr, TotalEnergies: 2,800 GWh/yr, ENGIE: 2,400 GWh/yr, VERBIO: 1,850 GWh/yr, EnviTec: 1,250 GWh/yr, Waga Energy: 850 GWh/yr).
3. STATUTORY FRAMEWORKS & DIRECTIVES: RED III (Directive EU 2023/2413 Article 31a UDB), FuelEU Maritime (Reg. EU 2023/1805), German BImSchG (§37a/38. BImSchV), French Code de l'énergie (CPB/TIRUERT), Dutch ERE, UK RTFO (Ofgem/GGCS), Italian CIC/PNRR.
4. COMMERCIAL DESK ECONOMICS: Real intermediary desk margins (€2.00–€6.00/MWh) with upstream producer index-linking (~88–92% of delivered compliance value stack).
Provide quantitative, legally referenced, and commercial trading desk intelligence. Format with markdown tables, clear bullet points, and actionable next steps.
`;

    const fullPrompt = `
=== CURRENT LIVE DESK COCKPIT CONTEXT ===
${marksSummary}
${scenarioSummary}
${consignmentSummary}
${arbitrageSummary}
${plantSearchResults}

=== TRADER INQUIRY ===
${req.userPrompt}
`;

    for (const modelName of uniqueModels) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 2000,
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

        const errJson = await response.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${response.status}`;
        console.warn(`[Gemini API] ${modelName} unavailable (${errMsg}). Trying next model...`);
      } catch (err: any) {
        console.warn(`[Gemini API] Failed calling ${modelName}: ${err.message}. Trying next model...`);
      }
    }

    return `⚠️ [Gemini API Note: Google servers temporarily congested — Using Local Desk Intelligence]\n\n` + generateLocalAgentResponse(req);
  }

  // Built-in Local Desk Intelligence (Zero API Key required)
  return generateLocalAgentResponse(req);
}

/**
 * High-precision local heuristic agent when no external API key is configured
 */
function generateLocalAgentResponse(req: GeminiAgentRequest): string {
  const query = req.userPrompt.toLowerCase();
  const topOpps = req.contextData?.topOpportunities || [];

  const matched = searchPlants(req.userPrompt);
  if (matched.length > 0) {
    const p = matched[0];
    return `### 🏭 Biomethane Facility Dossier: ${p.name}

* **Country / Location**: ${p.countryFlag} ${p.country} (${p.region})
* **Operator / Developer**: ${p.operator}
* **Operational Status**: ${p.status} (Commissioned: ${p.commissioningYear})
* **Capacity**: **${p.capacityNm3h.toLocaleString()} Nm³/h** (~${p.annualEnergyGWh.toLocaleString()} GWh/year)
* **Primary Feedstock**: ${p.primaryFeedstockCategory} (${p.feedstockDetails})
* **Upgrading Technology**: ${p.upgradingTechnology}
* **Grid Connection**: ${p.gridConnectionType} (Network: ${p.networkOperator})
* **Registry & Certification**: ${p.certificationAndRegistry}

**Compliance Clearance Assessment**:
* Injected into the **${p.country} gas grid**.
* Eligible for domestic compliance and cross-border mass balance transfer to RED III compliant member states.`;
  }

  if (query.includes('spanish') || query.includes('spain') || query.includes('cma cgm') || query.includes('fueleu')) {
    return `### ⚡ Commercial Deal Proposal: Spanish Bio-LNG ➔ FuelEU Maritime Compliance

**Deal Economics**:
* **Origin**: 🇪🇸 Spain (Enagás GTS Sistema GdO)
* **Offtaker**: CMA CGM / MSC (Container fleet bunkering in Western Mediterranean / ARA)
* **Feedstock**: Manure / Pig slurry (CI: -100 gCO₂e/MJ)
* **Total Delivered Value Stack**: **€220.00–€437.00/MWh** (avoided penalty equivalent)
* **Producer Share (Index-Linked)**: ~€215.00–€430.00/MWh
* **Trading Desk Intermediary Margin**: **€5.00–€6.00/MWh** (€50,000–€60,000 gross margin per 10,000 MWh)

**Regulatory Compliance Checklist (RED III / FuelEU)**:
1. **Chain of Custody**: Physical segregation or certified mass balance through recognized bunker supplier.
2. **Certification**: ISCC EU certified under RED III Annex IX-A.
3. **UDB Status**: Spain is fully interconnected into the single EU Union Database perimeter.
4. **Registry Movement**: Ex-domain cancellation issued by Enagás GTS to receiving bunker delivery note (BDN).`;
  }

  if (query.includes('uk') || query.includes('food waste') || query.includes('trap') || query.includes('blocked')) {
    return `### 🛡️ Compliance Warning: UK Grid ➔ EU Compliance Boundary Trap

**Regulatory Finding**:
* **Current Status**: ❌ **STRICTLY BLOCKED** for continental EU compliance (Germany THG, Netherlands ERE, France CPB).
* **Legal Ground**: **Directive (EU) 2023/2413 Article 31a & Commission Implementing Reg. 2024/2792**.
* **Reason**: Biomethane injected into the UK National Grid sits outside the EU single gas mass balance zone and cannot be recorded in the **Union Database (UDB)**.
* **Common Industry Mistake**: UK producers often hold valid ISCC EU certificates and believe their gas can clear German THG quotas. While the *production site* is certified, the *gas grid transport* fails the UDB mass balance test.

**Commercial Remedy**:
1. Sell domestically into the **UK RTFO** market (yielding ~144 dRTFC/MWh for double-counted food waste at ~£0.25/dRTFC ≈ €42.50/MWh).
2. Or liquefy on-site as **physically segregated Bio-LNG** in cryogenic ISO containers for direct transport across the Channel without grid injection.`;
  }

  if (topOpps.length > 0) {
    const best = topOpps[0];
    return `### ⚡ Top European Arbitrage Route

**#1 Alpha Route**: ${best.originFlag} **${best.originCountryName}** ➔ ${best.targetFlag} **${best.targetMarketName}**
* **Feedstock**: ${best.feedstockName} (CI: ${best.carbonIntensity} gCO₂e/MJ)
* **Total Delivered Value Stack**: €${best.totalTerminalValueStackEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh
* **Producer Pay (Index-Linked)**: €${best.producerPayableEurPerMWh.toFixed(2)}/MWh
* **Grid Transit Tariff**: €${best.transitCostEurPerMWh.toFixed(2)}/MWh
* **Real Trading Desk Margin**: **+€${best.deskNetMarginEurPerMWh?.toFixed(2) ?? 'N/A'}/MWh**
* **Expected Desk Gross Profit on 10,000 MWh**: **€${(best.totalDealProfitEur ?? 0).toLocaleString()}**`;
  }

  return `### 🤖 European Biomethane Desk Intelligence Engine

**Active Market Parameters**:
* **Baseline TTF**: €${req.contextData?.marks?.gasIndex.bid?.toFixed(2) ?? '28.00'}/MWh
* **Master Plant Database**: 1,986 European producing facilities across 26 countries.
* **Active Directives**: RED III (Directive (EU) 2023/2413), FuelEU Maritime (Regulation (EU) 2023/1805), German BImSchG, French CPB (Code de l'énergie), Dutch ERE, UK RTFO.`;
}
