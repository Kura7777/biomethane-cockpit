# Handoff: build the biomethane route matrix from finished research

You are taking over one step of a research audit for a biomethane trading desk app. The research is finished and fact-checked. Your job is to **consolidate it** into rules, compute a complete route matrix, list the remaining open questions, and draft emails. You do **not** need to do new web research.

## Hard rules
1. Work only inside `C:\Dev\route-audit\`. Do **not** edit anything in `C:\Dev\bm-map-routes\` or in the OneDrive folder.
2. Never invent a fact. Every rule must come from the research files and cite its source (URL plus a short quote copied from the file).
3. **`SYNTHESIS-NOTES.md` wins any conflict.** It holds facts the lead reviewer checked against the primary sources. If a research file disagrees with it, follow `SYNTHESIS-NOTES.md`.
4. If a research file marks something as INFERENCE or unsettled, the route stays **OPEN** unless `SYNTHESIS-NOTES.md` settles it.
5. Save your outputs as you go, so nothing is lost if you are interrupted.

## Read these files fully, in this order
1. `C:\Dev\route-audit\BRIEF.md`: the context, and the two ways biomethane is sold across a border:
   - **GO route:** a Guarantee of Origin moves between registries (AIB hub, ERGaR hub, or ex-domain cancellation).
   - **PoS route:** physical biomethane is delivered by mass balance through the gas grid with a Proof of Sustainability, into a national compliance scheme.
2. `C:\Dev\route-audit\SYNTHESIS-NOTES.md`: the verified facts and corrections. Key ones:
   - Sweden has been connected to the AIB gas hub since 1 Sep 2026.
   - The Netherlands left ERGaR on 1 Jul 2026.
   - Energinet (DK) publishes its own per-registry ERGaR table and still allows ex-domain cancellation.
   - Germany's 2026 THG-Quote law accepts biomethane injected anywhere in the EU.
   - The Dutch ERE accepts Dutch GOs only.
   - Italy's CIC requires Italian injection.
   - France's TIRUERT 2026 excludes biomethane.
   - Czechia's transport obligation accepts a GO or a PoS from any origin.
   - The UK RTFO accepts EU pipeline biomethane.
   - Switzerland and Norway are not possible for compliance trades.
3. The research files: `go-ergar.md`, `go-aib.md`, `go-nohub.md`, `pos-origin-grid.md`, `pos-dest-nw.md`, `pos-dest-se.md`, `pos-dest-se-pass2.md`.
4. `C:\Dev\bm-map-routes\docs\research\registry-hub-connectivity-2026-10-04.md`: an older snapshot. The files above override it.

**Countries (28):** AT BE BG CH CZ DE DK EE ES FI FR GB GR HR HU IE IT LT LU LV NL NO PL PT RO SE SI SK.

For Belgium, treat BE as Flanders and Wallonia, where the production is. Record Brussels (Brugel) only as a note: it is on the AIB hub, but no gas transfers have been recorded and it has almost no production.

## Output 1: rules and computed matrix (Node.js, no dependencies)

**`C:\Dev\route-audit\build\rules.mjs`** contains data only:
- **`REGISTRIES[iso]`**, with these fields:
  - `name`
  - `operational`
  - `aib`: one of `CONNECTED`, `APPLICANT`, `OBSERVER`, `ELECTRICITY_ONLY`, `NONE`
  - `aibImportOnly`
  - `ergar`: one of `PARTICIPANT`, `LEFT`, `NONE`
  - `exDomainOut`: one of `ALLOWED`, `CONDITIONAL`, `NOT_ALLOWED`, `UNKNOWN`, plus a note
  - `exportRestrictions`: a list of `{text, appliesTo?}`
  - `importRestrictions`: a list of `{text, refusesFrom?, requires?}`
  - `sources`: a list of `{claim, url, quote, grade: PRIMARY | SECONDARY}`
- **`GO_PAIR_EVIDENCE`**: explicit facts for specific pairs, which override the general rules. Example: `'DK>DE': {status:'POSSIBLE', via:'ERGAR', grade:'PUBLISHED', source}`. Take them from:
  - Energinet's published table
  - the GGCS guidance table
  - dena's partner list, with NL removed
  - Pronovo's import lists
  - the SPP-d slide
  - the Amber Grid announcement
  - VertiCer's exit from ERGaR
  - the AIB hub-flow corridors in `go-aib.md`, with grade `OBSERVED`
- **`POS_ORIGIN[iso]`**:
  - `inEuMassBalanceSystem`
  - `reason`
  - `supportedVolumeRule`: either null, or `{text, effect}`, where `effect` is one of `NO_PoS_FOR_SUPPORTED`, `SUPPORTED_MUST_STAY`, `STATE_OWNS_ATTRIBUTES`, `OPEN`
  - `sources`
- **`POS_DEST_SCHEMES[iso]`**: a list of schemes, each with:
  - `id`
  - `name`
  - `legalBasis`
  - `acceptsForeign`: one of `YES`, `NO`, `GO_REQUIRED`, `OPEN`
  - `originScope`
  - `goRequiredInRegistry?`
  - `conditions`
  - `reason`
  - `sources`
  - `openQuestionId?`

**`C:\Dev\route-audit\build\compute.mjs`** computes every ordered pair, 756 in total, for both layers.

**GO layer**
- Each pair gets: a status (`POSSIBLE`, `NOT_POSSIBLE` or `OPEN`), `via` (`AIB` or `ERGAR`), an evidence grade, a one-sentence reason a trader understands, and its sources.
- Evidence grades, strongest first: `OBSERVED` (real transfers seen), then `PUBLISHED` (the registry's own list), then `RULE` (follows from hub membership).
- Decide each pair in this order:
  1. Use `GO_PAIR_EVIDENCE` if the pair has an entry.
  2. If the origin registry isn't operational or is on no hub, the pair is `NOT_POSSIBLE`. Say why.
  3. If both registries are on AIB with status `CONNECTED`, the origin is not import-only and no restriction applies, the pair is `POSSIBLE`, graded `RULE`, or `OBSERVED` if it appears in the flow data.
  4. If both share ERGaR but no acceptance list covers the pair, it is `OPEN`. Attach the question id.
  5. If a restriction applies, follow what the source says: `POSSIBLE` with a condition, or `NOT_POSSIBLE`.
- Add a `workaround` field wherever the origin allows ex-domain cancellation but there is no hub route. Example: "Energinet can cancel ex-domain for a buyer in X; whether X recognises it is open."

**PoS layer**
- For each destination scheme, combine `POS_ORIGIN` with the scheme into a status: `POSSIBLE`, `NOT_POSSIBLE` or `OPEN`, plus conditions.
- For `GO_REQUIRED` schemes, the result depends on the GO-layer pair into the required registry.
- Each pair also gets a summary: the best status across that destination's schemes, naming the scheme.

**Files to write**
- `build\out\route-matrix.json`, with the full detail.
- `build\out\ROUTE-MATRIX.md`, containing:
  - two 28×28 grids, one for GO and one for the PoS summary, using P (possible), N (not possible) and O (open). In the GO grid, add the evidence grade as a suffix: o (observed), p (published), r (rule).
  - a section per origin listing every destination with its status and a one-line reason for both layers.

Run `node build/compute.mjs` and make sure it finishes without errors.

**Spot checks: the computed results must match these.**

| Pair | GO | PoS |
|---|---|---|
| DK > DE | P (published) | |
| DK > AT | N | |
| DK > GB | N | |
| DE > DK | N | |
| NL > DE | N | |
| DK > CZ | N (AIB gas not connected) | P (CZ transport accepts a GO or a PoS) |
| SE ↔ AIB members | P | |
| any EU origin > DE (THG) | | P |
| any origin > NL (ERE) | | N |
| any foreign origin > IT (CIC) | | N |
| any origin > FR (TIRUERT 2026) | | N |
| EU > GB (RTFO) | | P (pipeline route, capacity booked) |
| any origin > CH (fuel tax relief) | | N |
| any origin > NO | | N |

For DK > CZ on the GO layer, add the ex-domain workaround.

## Output 2: `C:\Dev\route-audit\OPEN-QUESTIONS.md`
1. Collect every open question from all the research files.
2. Remove any already answered by `SYNTHESIS-NOTES.md` or by another file, and say which fact answered it.
3. Merge duplicates.
4. Group them by the organisation to ask. For each organisation give its name, country, and the best email or contact page found in the files.

For each question give:
- an id, e.g. `Q-DK-1`
- the exact yes/no question
- which matrix cells it would settle: a count plus examples
- why public sources didn't settle it

Order the organisations by how many cells their answers would settle, most first.

## Output 3: `C:\Dev\route-audit\EMAILS.md`
- Write one short, professional email per organisation in `OPEN-QUESTIONS.md`, for a biomethane trader to send from their own address. Use `[Name]` and `[Company]` placeholders.
- Write in English, with numbered questions that can each be answered yes/no with a reference.
- Add a one-line note where the organisation probably prefers its national language.

## When you finish, report back with
- the files you wrote
- GO grid counts (P, N, O), with P split by grade
- PoS grid counts
- how many organisations and questions are in `OPEN-QUESTIONS.md`
- the top 5 organisations by cells settled
- any conflict between research files you could not resolve, and what you chose
- confirmation that every spot check above matches, or which ones don't and why
