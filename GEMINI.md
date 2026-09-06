# Biomethane Desk Cockpit — Core Engineering & Domain Invariants

## 1. Domain & Statutory Gating Rules
- **National Registry Boundaries**:
  - `UK_RGGO` (Green Gas Certification Scheme) strictly requires Great Britain (`GB`) gas grid injection. All non-UK origins are blocked under `MARKET_SPECIFIC`.
  - `UK_RTFO` is domestic transport compliance. Non-EU injected biomethane cannot clear EU UDB mass balance into EU compliance destinations without physical segregation.
- **Voluntary & Guarantee of Origin Exemption**:
  - `UK_RGGO`, `DE_GO`, `NL_GO`, `FR_GO`, and `VOL_SCOPE1` are exempt from the RED III 65% transport minimum GHG savings threshold. Energy crops (+40 CI) are fully tradeable.
- **Transport Quota Compliance**:
  - `DE_THG`, `NL_ERE`, `FR_CPB`, `IT_CIC`, `UK_RTFO` enforce RED III Annex IX classifications, avoided emissions formulas, and the >= 65% GHG savings requirement.

## 2. Pan-European Geographic & Topology Invariants
- **European Hubs**: Every European producing country ISO in `PRODUCING_ORIGINS`, `BIOMETHANE_PLANTS` (1,975+ facilities), and `MARKETS` must exist in `EUROPEAN_HUBS` (`src/features/map/mapData.ts`) with non-null coordinates.
- **Pipeline Adjacency**: Continental gas transmission nodes must be connected in `PIPELINE_ADJACENCY` (`src/domain/logistics/engine.ts`).
- **Map Visualizer**: Map fallbacks must dynamically resolve to the origin country hub or target hub, never defaulting to a hardcoded coordinate (e.g. Denmark).
- **Strict Country-ISO Gated Matching & Isolation**:
  - Flagship asset parameters, statutory operator assignments, and facility enrichments MUST strictly enforce country-ISO boundaries (`target_country_iso == record_country_iso`) before applying name matching.
  - Generic cross-country substring checks (e.g. `norm_name in keyword`) are prohibited to prevent false positive cross-border mappings (e.g. German municipalities matching UK facilities).
  - All facility directories, tables, and exports must be deterministically sorted by `country_iso` and deduplicated by unique facility `id`.

## 3. Institutional Data Provenance & Transparency Invariants
- **Data Source Attributions**: Every dataset, pricing card, plant modal, and regulatory formula MUST explicitly declare its institutional provenance tier (`STATUTORY_DIRECTIVE`, `TSO_OFFICIAL_DATA`, `INDUSTRY_BODY_CENSUS`, `BROKER_REPORTED_QUOTE`, `BUYER_SPECIFIED_RFQ`, or `MODELLED_ENGINEERING`).
- **Plant Data Disclosures**: Facility names and country locations originate from the official GIE & EBA 2026 Map (`GIE_EBA_BIO_2026_A0_FULL_115.pdf`) and national TSO registers. Any unverified granular attribute (e.g. hourly injection capacity or specific feedstock substrate mix) MUST be flagged in `fieldsUnverified` and disclosed to the trader rather than populated with fictitious numbers.
- **Data Directory**: All application datasets must be registered and transparently searchable in `src/domain/provenance/dataSourcesDirectory.ts` and accessible via `#/data-sources`.

## 4. Pan-European Plant Technical & Feedstock Invariant
- **National Agricultural Census Fidelity**: Every European country in `COUNTRY_MACRO_STATS` and individual plant in `BIOMETHANE_PLANTS` must reflect verified agricultural and industrial realities (e.g. UK ~65% Energy crops, Germany ~50% Energy crops / 40% Manure, Denmark ~80% Manure/Straw, France ~85% Agri/CIVE, Italy ~50% FORSU / 45% Slurry).
- **100% Technical Stack Completeness**: Every plant must declare its authentic `primaryFeedstockCategory`, `feedstockDetails`, `primaryUpgradingTech`, and `networkOperator`.
- **Physical Asset Sourcing & Consignment Invariant**:
  - Sourcing from any facility in `BIOMETHANE_PLANTS` (1,975 assets) into the Trade Builder (`/trade`) must strictly preserve and pass:
    1. **Exact Volume**: Derived from audited annual energy capacity (`annualEnergyGWh * 1000` MWh), never falling back to generic dummy volumes (e.g. 120,000 MWh).
    2. **Feedstock & CI Calibration**: Mapped directly to the audited substrate mix and RED III benchmark carbon intensity.
    3. **Optimal Statutory Market Routing**: Automated default selection of the highest-margin compliant market for that origin country (e.g. `UK_RTFO` for GB, `DE_THG` for AT/DE/DK/NL, `IT_CIC` for IT, `FR_CPB` for FR).
    4. **Physical Asset Provenance**: Full disclosure of operating entity, grid/TSO operator, and direct commercial contacts in the Trade Builder header and export term sheets.
