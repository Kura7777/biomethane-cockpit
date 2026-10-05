# Biomethane cross-border route audit — shared brief (read fully before starting)

Today is 2026-10-04. You are one of six researchers. A biomethane trader's desk app must say, for EVERY
origin → destination country pair, whether biomethane can be sold cross-border — "possible" with evidence,
"not possible" with the reason, or "awaiting registry answer" only where no public source settles it.
Wrong answers destroy the product's value. Precision over coverage; never guess.

## The two ways biomethane value crosses a border
1. **GO route (book-and-claim):** a Guarantee of Origin moves electronically from the origin registry to the
   destination registry (via the AIB EECS gas hub, the ERGaR CoO hub, a bilateral link, or ex-domain
   cancellation). Used for disclosure, voluntary/Scope-1 claims and some national schemes.
2. **PoS route (mass balance):** physical biomethane is injected in the origin grid and "delivered" through the
   interconnected gas grid under mass balance, with a Proof of Sustainability (ISCC EU, REDcert-EU, etc.;
   RED III / Union Database once live — UDB gas module launch postponed to end-2026). Used for compliance
   schemes: German THG-Quote / BEHG / EU ETS, Swedish biogas tax exemption, Dutch ERE, Italian CIC,
   French TIRUERT, UK RTFO, etc. Whether it works depends on (a) the DESTINATION scheme accepting biomethane
   injected in another country, (b) the ORIGIN allowing the sustainability attributes to leave (subsidy rules),
   (c) physical grid connection / same mass-balance area.

## Countries in scope (ISO)
AT BE BG CH CZ DE DK EE ES FI FR GB GR HR HU IE IT LT LU LV NL NO PL PT RO SE SI SK
(Belgium has three regional regulators: Brussels/Brugel, Flanders/VREG, Wallonia/SPW-CWaPE — treat separately.)

## Already established (verify only if your task says so)
See C:\Dev\bm-map-routes\docs\research\registry-hub-connectivity-2026-10-04.md (read it first). Highlights:
AIB gas-hub connected (aib-net.org/registries): AT E-Control, BE-Brussels Brugel, CZ OTE, EE Elering,
FI Gasgrid, FR EEX, HU MEKH, IT GSE, LV Conexus, LT Amber Grid, NL VertiCer, PT REN, SK SPP-distribúcia,
ES Enagás, SE Energimyndigheten, CH Pronovo (gas imports only). Energinet DK: AIB electricity only, gas
applicant since 17 Jun 2026. ERGaR participants: AT AGCS, DK Energinet, DE dena, SK SPP-d, CH Pronovo,
GB GGCS, LT Amber Grid (+ NL VertiCer active per statistics). dena's published ERGaR partners: NL, GB, AT, DK, SK.
AIB domain protocols list: https://www.aib-net.org/facts/aib-member-countries-regions/domain-protocols

## Rules
- Primary sources first: the registry's / ministry's / regulator's own page, legal text, AIB domain protocol,
  ERGaR documents. Trade press and consultancies only as SECONDARY, and say so.
- Every fact: claim · URL · short verbatim quote (original language + English) · confidence
  (PRIMARY / SECONDARY). If you inferred something, label it INFERENCE and explain.
- If a public source does not settle a question, write an **Open question** with the exact yes/no question to
  ask, the body to ask (registry/regulator name) and its contact email or contact-page URL (find it).
- PDFs: download with curl into C:\Dev\route-audit\_pdf\ and extract with `pdftotext -layout` (available in
  Git Bash) so you can quote exactly. WebFetch returns summaries — prefer raw text for quotes.
- Do the work yourself. Do NOT spawn subagents. Do not edit anything under C:\Dev\bm-map-routes or the OneDrive
  folder. Write ONLY your own output file.
- Spend the time needed. Thoroughness matters more than speed.

## Output
Write your findings to the file named in your task (under C:\Dev\route-audit\), in this structure:

```
# <task title> — findings (accessed 2026-10-04)
## <ISO> — <registry or scheme name>
### Facts
- <claim> | <URL> | "<quote>" | PRIMARY|SECONDARY|INFERENCE
### Verdicts (only what your task asks)
- <e.g. Imports GOs from: ... / Accepts PoS from other EU states: yes|no|conditional — conditions>
### Open questions
- Q: <exact question> | Ask: <body> | Contact: <email or URL>
```
End the file with "## Searched but not found" listing what you looked for and could not find.
Your final chat reply: ≤250 words — file path, the 5 most important findings, count of open questions.
