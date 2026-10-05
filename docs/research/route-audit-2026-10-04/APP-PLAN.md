# App plan — wire the verified route matrix into the desk app (execute overnight, leave staged)

Repo: `C:\Dev\bm-map-routes` (branch `feat/map-certificate-routes`, based on origin/main b77054a; earlier map + REGISTRY_TRANSFER gate work already STAGED there). node_modules is a junction. Never touch the OneDrive checkout. `git add` every file right after writing it. Do NOT commit, do NOT push — the user will do that after reviewing.
After any vitest run: `git checkout -- src/domain/plants/plantResearch.generated.ts src/domain/plants/registerMatches.generated.ts tsconfig.tsbuildinfo` (test side-effects). Known pre-existing failures on main (not ours): architecture "unsourced decimal coefficient", plantResearch determinism, statutory register matches determinism.

Precondition: `C:\Dev\route-audit\build\out\route-matrix.json` exists AND has passed Opus verification (see HANDOFF-SYNTHESIS.md spot checks + SYNTHESIS-NOTES.md).

## 1. Bring the audit into the repo (reproducible)
- Copy `C:\Dev\route-audit\build\rules.mjs` and `compute.mjs` to `scripts/route-audit/` and add `scripts/route-audit/generate.mjs` that runs compute and writes `src/domain/routes/routeMatrix.generated.ts` (typed export: `GO_ROUTES`, `POS_ROUTES`, `POS_SCHEMES`, `ROUTE_AUDIT_ACCESSED = '2026-10-04'`). Add npm script `routes:generate`. Generated file must be deterministic (sorted keys).
- Copy the research record to `docs/research/route-audit-2026-10-04/` (BRIEF, SYNTHESIS-NOTES, the 7 research files, OPEN-QUESTIONS, EMAILS, ROUTE-MATRIX.md). Not the _pdf cache.

## 2. Domain API — `src/domain/routes/` (new) + adapt existing
- `getGoRoute(origin, dest)` → { status: 'POSSIBLE'|'NOT_POSSIBLE'|'AWAITING_REGISTRY', via, grade: 'OBSERVED'|'PUBLISHED'|'RULE', reason, workaround?, conditions?, sources, openQuestionId? }.
- `getPosRoute(origin, dest)` → { summary status, schemes: [{ schemeId, name, status, conditions, reason, sources, openQuestionId? }] }.
- Re-implement `src/domain/registries/certificateRoutes.ts` on top of `getGoRoute` (keep exported names used by MapScreen/gate, update the status union + labels: 'Possible · observed trades' / 'Possible · registry-published' / 'Possible · hub rules' / 'Awaiting registry answer' / 'Not possible'). Delete superseded hand-written data in `hubConnectivity.ts` only where the generated matrix replaces it; keep `registryDirectory.ts` consistent (NL ergar now false — left 1 Jul 2026; SE AIB gas connected; DK applicant; BE Flanders/Wallonia not hub-connected).
- `OPEN` cells show the open-question id and the body to ask (from OPEN-QUESTIONS.md) in their reason.

## 3. Eligibility
- `REGISTRY_TRANSFER` gate (GO markets): use `getGoRoute`. POSSIBLE → PASS (CONDITIONAL if conditions), NOT_POSSIBLE → HARD_BLOCK (reason + workaround text if any), AWAITING_REGISTRY → UNRESOLVED.
- New `CROSS_BORDER_POS` gate for compliance (mass-balance) markets when origin country ≠ market country: map each app market id to its audited scheme (e.g. DE_THG→DE THG-Quote, NL_ERE→NL ERE, SE_TAX→SE tax exemption, IT_CIC→IT CIC, FR_TIRUERT/FR_CPB→FR, CZ_POZE→CZ transport §47d, UK_RTFO→GB RTFO, CH_VSG→CH, NO_STATNETT→NO, AT_EGG→AT, PL/SK/LT/HU/ES/PT/… as audited). POSSIBLE → PASS/CONDITIONAL, NOT_POSSIBLE → HARD_BLOCK, OPEN → UNRESOLVED. Markets with no audited scheme → gate omitted (not invented). Domestic trades → gate omitted.
- Update existing tests whose expectations contradict the audit (list each with one-line justification in the report). Add tests: every HANDOFF spot check through `evaluateEligibility`.
- Auditor (`geminiClient.ts` deterministic checks + `knowledgeBase.ts`): add the PoS check and replace the hub knowledge entry with a summary of the audited rules (dated 2026-10-04).

## 4. Map (`src/features/map/MapScreen.tsx`)
- Map view toggle: `GO routes` (default) | `PoS / compliance routes` | `Compliance status`.
- Fills by status for the selected origin (palette: accent = possible; accent 60% = possible-conditional; accent 25% = awaiting registry; neutral 16% = not possible; NONE fill = no data). Legend with counts.
- Rail list per destination: status, via/scheme, evidence grade, reason, conditions, workaround, open-question id. Footer: "Audited 4 Oct 2026 — sources in docs/research/route-audit-2026-10-04".
- Corridor strip "Certificate route" cell shows GO status; add PoS status line.
- Keep mobile sheet working (railBody shared).

## 5. Verify (Opus does this, not the implementer)
- `npx tsc --noEmit -p .`, `npx vitest run` (only the 3 known failures), `npm run build`.
- Re-run `npm run routes:generate` → no diff (deterministic).
- Screenshots via `vite preview --port 4502` + Playwright scripts in `C:\Dev\shots\` (map-routes.mjs / trade-audit.mjs pattern): map GO view from DK and from NL; map PoS view from DK; trade builder DK→CZ_POZE (PoS pass), DK→NL_ERE (blocked), DK→DE_THG (pass), DK→ES_GDO (GO blocked + workaround); phone map + sheet; dark mode. Check overflow/clipping/pageerrors. Send to the user with SendUserFile (status proactive).
- Write `C:\Dev\route-audit\READY-TO-PUSH.md`: what changed, test/build results, changed-test justifications, screenshots list, and the exact commands for the user:
  `git -C C:/Dev/bm-map-routes commit -F C:/Dev/route-audit/COMMIT-MSG.txt` then push via fast-forward of the verified hash to origin/main (check `git fetch` first; main must not have moved, else rebase and re-verify).
- Write `C:\Dev\route-audit\COMMIT-MSG.txt` (conventional commit summary + body + attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`).
- Update memory file map-certificate-routes.md with the final state.
