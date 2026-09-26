# Official Statutory Register Sources & Regeneration Guide

This document specifies the authentic statutory data sources, mirror locations, and reproduction steps for biomethane plant register matching.

> **Trading Desk Invariant**: Nothing may be presented as coming from a register unless it was read from that register's published data. All fabricated matchers and synthesized identifiers have been removed.

---

## 1. Statutory Sources by Country

### Germany (DE)
- **Authority**: Bundesnetzagentur (Federal Network Agency)
- **Register**: Marktstammdatenregister (MaStR)
- **Dataset**: MaStR Gesamtdatenexport (Export version 2026-09-25 26.1)
- **Official URL**: `https://download.marktstammdatenregister.de/Gesamtdatenexport_20260925_26.1.zip`
- **Primary Match Identifier**: MaStR Unit ID (`GEE...` / `SEE...`)
- **Operator Identifier**: Handelsregister (`HRB ...` / `HRA ... (AG <Gericht>)`)
- **Match Kind**: `OPERATOR_REGISTER`
- **Scratch Files**:
  - `scratch/mastr/EinheitenGasErzeuger.xml` (Biomethane units, Technology 825)
  - `scratch/mastr/Katalogwerte.xml` (Court and prefix lookups)
  - `scratch/mastr/operators.json` (Biomethane operator corporate records)
- **Operator Extraction**:
  ```bash
  python scripts/build_mastr_operators.py
  ```
- **Matching Command**:
  ```bash
  python scripts/match_de_mastr.py
  ```

---

### France (FR)
- **Authority**: Open Data Réseaux Énergies (ODRE) & NaTran / GRDF
- **Register**: Répertoire des installations d'injection de biométhane
- **Dataset**: Points d'injection de biométhane en France
- **Official URL**: `https://opendata.reseaux-energies.fr/explore/dataset/points-d-injection-de-biomethane-en-france/`
- **Primary Match Identifier**: Bare injection point code (e.g. `GD0177`, `PITD...`)
- **Operator Attribution**: ODRE project designation (ODRE records injection points, not commercial operators)
- **Match Kind**: `INJECTION_SITE`
- **Scratch File**: `scratch/odre/points_injection.json`
- **Matching Command**:
  ```bash
  python scripts/match_fr_odre.py
  ```

---

### United Kingdom (GB)
- **Authority**: Department for Energy Security and Net Zero (DESNZ) & Ofgem
- **Database**: Renewable Energy Planning Database (REPD Q2 2026 monthly extract)
- **Official URL**: `https://www.gov.uk/government/publications/renewable-energy-planning-database-monthly-extract`
- **Primary Match Identifier**: REPD Project Reference (e.g. `REPD Ref #256`)
- **Operator Attribution**: Planning applicant / project developer (Anaerobic digestion site hint, not verified trading signatory)
- **Match Kind**: `PROJECT_DATABASE`
- **Coordinate Conversion**: British National Grid (OSGB36 Airy 1830) converted to WGS84 using the standard 7-parameter Helmert transformation in `scripts/lib/osgb36.py`.
- **Scratch File**: `scratch/uk_repd_2026.csv`
- **Matching Command**:
  ```bash
  python scripts/match_gb_repd.py
  ```

---

### Denmark (DK)
- **Authority**: Erhvervsstyrelsen (Danish Business Authority) & Energinet
- **Register**: Danish Central Business Register (CVR) verified via `lasso.dk` mirror
- **Dataset**: `data/registration_checks/dk.json`
- **Primary Match Identifier**: Statutory CVR number (8 digits, e.g. `34734445`)
- **Match Kind**: `OPERATOR_REGISTER`
- **Matching Command**:
  ```bash
  python scripts/match_dk_cvr.py
  ```
- **Rejection Policy**: Mismatched CVRs flagged by the registry are marked `NO_MATCH` with explicit rejection rationale; they are never masked as `AMBIGUOUS`.

---

## 2. Full Regeneration Order

To rebuild the entire registry matching pipeline deterministically:

```bash
# 1. (Optional) Rebuild German MaStR operators if updated export is placed in scratch/mastr/
python scripts/build_mastr_operators.py

# 2. Execute country matchers
python scripts/match_de_mastr.py
python scripts/match_fr_odre.py
python scripts/match_gb_repd.py
python scripts/match_dk_cvr.py

# 3. Regenerate TypeScript artifact consumed by Vite application
cmd /c npx vite-node scripts/regenerate_matches.ts
```

Running these steps produces identical output in `src/domain/plants/registerMatches.generated.ts`.
