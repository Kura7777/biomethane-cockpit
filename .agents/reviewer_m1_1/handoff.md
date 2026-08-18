# Milestone 1 & 3 Independent Audit Review & Adversarial Challenge Report

## Review Summary

**Verdict**: `REQUEST_CHANGES`

**Executive Evaluation**:
Worker `worker_m1_1` successfully resolved the primary Milestone 1 & 3 objectives:
1. Fixed `TradeBuilderScreen.tsx` German multiplier logic (now correctly preserving 1× baseline for `BRANCH_1X` and selecting 2× double counting for `BRANCH_2X` under the ≥2026 regime, eliminating the halving bug).
2. Corrected the `TradeBuilderScreen.tsx` preset market ID to `'FUELEU'`.
3. Protected `computeFuelEUDeficitClosureValue` in `src/domain/netback/engine.ts` against non-positive `shipActualCI <= 0` division by zero.
4. Cleaned up synthetic arbitrary fallbacks in `ScannerScreen.tsx` and `MarksScreen.tsx`.
5. Mounted `<FloatingAgentDrawer />` into `Layout.tsx` and corrected footer copy.
6. Enforced TypeScript strict mode with zero loose `any` casts across the application code.
7. Verified clean production build (`tsc -b && vite build` succeeded with 0 errors).

However, full test suite execution (`vitest run` across all 4 test suites: 106 tests) discovered **1 failing test** in `src/domain/__tests__/adversarial-stress.test.ts` due to a boundary condition in `src/domain/logistics/engine.ts`.

---

## Findings

### [Major] Finding 1: Logistics Engine Domestic Tariff Evaluates to `null` instead of `0` (Causing Test Failure)

- **What**: For domestic delivery routes where origin equals target (e.g. `origin = 'DE'`, `target = 'DE'`), `calculateLogisticsRoute()` evaluates `physicalRoute.totalPhysicalTariffEurMwh` to `null` instead of `0`.
- **Where**: `src/domain/logistics/engine.ts:182-184`
- **Why**: 
  ```ts
  const totalPhysicalTariffEurMwh = (hasNullTariff || physicalIps.length === 0)
    ? null
    : physicalIps.reduce((sum, ip) => sum + (ip.totalTariffEurMwh ?? 0), 0);
  ```
  When `origin === target`, there are zero border interconnection points (`physicalIps.length === 0`). The condition `physicalIps.length === 0` treats this as an unroutable / missing tariff leg and assigns `null`. For domestic wheeling, physical border tariffs are `0` (not `null`). This causes `adversarial-stress.test.ts:471` to fail:
  ```
  AssertionError: expected null to be +0
    471| expect(res.physicalRoute.totalPhysicalTariffEurMwh).toBe(0);
  ```
- **Suggested Fix**: Update line 182 in `src/domain/logistics/engine.ts`:
  ```ts
  const totalPhysicalTariffEurMwh = (hasNullTariff || (physicalIps.length === 0 && origin !== target))
    ? (origin === target ? 0 : null)
    : physicalIps.reduce((sum, ip) => sum + (ip.totalTariffEurMwh ?? 0), 0);
  ```
  And adjust `physicalPipelineBreakdown.totalCostEurMwh` on line 263 to ensure domestic pipeline wheeling calculates `0 + shrinkageEurMwh + balancing + fees`.

---

### [Minor] Finding 2: Stale Plant Count Copy (`1,986` vs `1,975`) in `FloatingAgentDrawer.tsx`

- **What**: Stale copy references `1,986` instead of the audited authoritative count of `1,975 verified biomethane operational facilities`.
- **Where**: `src/shared/components/FloatingAgentDrawer.tsx:67` (`'/plants': { title: '1,986 Facilities Directory' }`) and `line 413` (`'Analyzing 1,986 registry & marks...'`).
- **Why**: The authoritative GIE/EBA registry count across the codebase is 1,975 plants (as established in `PROJECT.md`, `Layout.tsx`, `PlantsScreen.tsx`, and `engine.test.ts`).
- **Suggested Fix**: Update `1,986` to `1,975` in `FloatingAgentDrawer.tsx:67, 413`.

---

## 1. Observation

1. **Test Suite Execution**:
   - Command: `cmd.exe /c npx vitest run`
   - Results: 4 test files collected, 106 tests total:
     - `src/domain/__tests__/logistics.test.ts`: 10/10 passed
     - `src/domain/__tests__/challenger_regulatory_stress.test.ts`: 21/21 passed
     - `src/domain/__tests__/engine.test.ts`: 51/51 passed
     - `src/domain/__tests__/adversarial-stress.test.ts`: 23/24 passed, 1 failed (`handles identical origin and target (domestic delivery) with distance 0 and zero physical tariff`).
   - Overall: **105 passed, 1 failed**.

2. **Production Build & Type Checking**:
   - Command: `cmd.exe /c npm run build`
   - Result: `tsc -b && vite build` succeeded in 10.40s. 1,942 modules transformed, zero TypeScript errors.

3. **Integrity & Anti-Cheat Audit**:
   - Source code inspected for hardcoded test fixtures, synthetic dummy facades, or shortcuts bypassing core logic.
   - All mathematical functions (`tCO2ePerMWh`, `computeFuelEUDeficitClosureValue`, `computeCertificateValue`, `calculateLogisticsRoute`, `evaluateEligibility`) execute genuine, un-mocked domain algorithms. Zero integrity violations detected.

---

## 2. Logic Chain

1. Worker `worker_m1_1` fixed the single counting halving bug in `TradeBuilderScreen.tsx:243-278` by using `rawNetback` directly for `BRANCH_1X` and `rawNetback.uncertaintyBranches[1]` (or 2×) for `BRANCH_2X`.
2. Worker `worker_m1_1` inserted `if (shipActualCI <= 0) return { valueEurPerMWh: 0, ... }` into `src/domain/netback/engine.ts:80-87`, successfully eliminating `NaN` and `Infinity` risk.
3. The UI improvements in `ScannerScreen.tsx`, `MarksScreen.tsx`, and `Layout.tsx` conform to the dark-first Tailwind CSS design system with strict type safety.
4. However, test suite execution revealed that `adversarial-stress.test.ts` expects `calculateLogisticsRoute('DE', 'DE', 28.50).physicalRoute.totalPhysicalTariffEurMwh` to equal `0`, whereas `engine.ts:182` returned `null` due to `physicalIps.length === 0`.
5. Because of the project requirement for a 100% passing automated test suite, the verdict must be `REQUEST_CHANGES` to address this domestic route tariff edge case.

---

## 3. Caveats

- All other 105 tests across regulatory gates, FuelEU deficit closure, German THG branches, and netback waterfalls pass with exact precision.
- Once Finding 1 is remediated, 100% of test suites (106/106 tests) and the production build will pass cleanly.

---

## 4. Conclusion

The code implementation for Milestones 1 & 3 is of high architectural quality, robustly typed, and strictly aligned with the design system. However, due to the single test failure in `adversarial-stress.test.ts` (domestic route physical tariff returning `null`), the verdict is **`REQUEST_CHANGES`**.

---

## 5. Verification Method

To independently verify after applying the recommended fix:

1. **Run Full Vitest Suite**:
   ```bash
   cmd.exe /c npx vitest run
   ```
   *Expected outcome*: 4/4 test files passed, 106/106 tests passed.

2. **Run Production Build**:
   ```bash
   cmd.exe /c npm run build
   ```
   *Expected outcome*: `tsc -b && vite build` exits with code 0.
