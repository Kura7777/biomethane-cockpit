## 2026-08-18T00:58:53Z

You are Worker subagent for Milestone 1 (R1: European Registry & Balance of Trade Hub).

Working directory: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m1_1\
Authoritative request: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\ORIGINAL_REQUEST.md
Project plan: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\PROJECT.md
Survey findings: c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\explorer_survey_v2_domain_1\handoff.md and c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\spec_miner_survey_v2_reg_1\handoff.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Your Tasks:
1. Implement pure domain module `src/domain/registries/`:
   - `types.ts`: RegistryId ('DENA' | 'VERTICER' | 'ENERGINET' | 'ENAGAS' | 'GSE' | 'EEX' | 'AGCS' | 'GGCS_UK'), CertificateTransferProtocol ('ERGAR_COO' | 'AIB_EECS_GAS' | 'UDB_DIRECT_TRANSFER' | 'BILATERAL_RECOGNITION' | 'DOMESTIC_ONLY'), UDBTitleTransferStatus ('NOT_APPLICABLE' | 'DRAFT' | 'SUBMITTED' | 'ESCROW_LOCKED' | 'TITLE_TRANSFERRED' | 'REJECTED_BOUNDARY_VIOLATION' | 'REJECTED_DISCREPANCY'), InjectionBatch, RegistryAccount, CrossBorderTransferRequest, RegistryTransferVerification, BalanceOfTradeSummary.
   - `connectors.ts`: `IRegistryConnector` interface with concrete mockable connector adapters for dena Biogasregister, VertiCer, Energinet, Enagás, GSE.
   - `baselineData.ts`: Realistic, high-density European baseline injection and certificate datasets for key registries (Germany, Netherlands, Denmark, Spain, Italy).
   - `udbVerification.ts`: Deterministic title transfer verification function `verifyRegistryTransfer(req: CrossBorderTransferRequest)` verifying mass balance compatibility and UDB title transfer status per RED III Art. 31a and Reg (EU) 2024/2792 (e.g. blocking UK grid injection from EU UDB transfers unless bilateral treaty applies).
   - `index.ts`: Barrel export.
2. Implement comprehensive unit tests in `src/domain/__tests__/registries.test.ts` testing issuance, mockable connectors, baseline batches, transfer compatibility, UDB title transfer state transitions, and non-EU blocking.
3. Integrate into UI:
   - Enhance `src/features/plants/PlantsScreen.tsx` (and `src/features/plants/RegistryHub.tsx` if needed) to provide a high-density "REGISTRIES & BALANCE OF TRADE" tab with:
     - Overview Metric Cards (Total Issuance TWh, Domestic Injection TWh, Active Cancellations, Net Exporter/Importer Trade Balance).
     - Balance of Trade comparative matrix (DK net exporter, DE/NL net importers, ES exporter, IT emerging).
     - Registry Flow Ledger (normalized flow batches with Feedstock chips, Grid type, Volume, UDB status badges, and transfer protocols).
     - Cross-Border Registry Compatibility matrix.
   - Adhere strictly to `design-system/MASTER.md` (strict stone dark theme, .font-num on figures, text-micro floor, zero raw hex).
4. Run tests and verify:
   - Run `npx vitest run` to ensure all existing 160 tests + new registry tests pass 100%.
   - Run `npm run build` or `npx tsc -b` to ensure clean compilation.
5. Write your complete handoff report to `c:\Users\Chris's PC\OneDrive\Desktop\Biomethane Tool (Gemini)\.agents\worker_m1_1\handoff.md` and report back with send_message.
