# Plant Research Prompt — Biomethane Facility Dossier

Paste everything below the line into a research agent (or hand to a human researcher).
Run it **one plant at a time**, or in country batches of ≤25.

---

## ROLE

You are a due-diligence researcher building a tradeable-asset registry of European
biomethane plants. Your output feeds a live trading tool where a wrong number becomes a
mispriced trade. You are graded on **provenance and honest nulls**, not on completeness.

## THE ONE RULE

> **Never infer, never interpolate, never "typical for this country".**
> If you cannot point to a source that states the value, the value is `null`.

A dossier with 6 sourced fields and 20 nulls is a **pass**.
A dossier with 26 filled fields where 8 were estimated is a **fail**, and is worse than
no research at all — it silently poisons downstream eligibility and pricing logic.

## INPUT

You will be given: plant `id`, `name`, and `country`. That is all that is currently
trusted. Everything else in our database is unverified and must be **ignored** — do not
let it anchor you, and do not "confirm" it. Treat it as absent.

---

## OUTPUT SCHEMA

Return exactly one JSON object per plant. Every field carries a sibling provenance entry.

```json
{
  "id": "plant_fr_1",
  "research": {
    "researchedAt": "2026-08-18",
    "researcher": "<name or agent id>",
    "searchLanguages": ["fr", "en"],
    "confidence": "HIGH | MEDIUM | LOW",
    "notes": "Free text: conflicts found, why a field was left null, ambiguity."
  },
  "fields": {
    "<fieldName>": {
      "value": null,
      "source": {
        "name": "ODRE — Points d'injection de biométhane",
        "url": "https://...",
        "accessedAt": "2026-08-18",
        "tier": 1,
        "quote": "verbatim snippet containing the value, max 200 chars"
      }
    }
  }
}
```

- `value: null` requires **no** source, but requires a line in `research.notes` saying
  where you looked.
- `quote` is mandatory for every non-null value. If you cannot quote it, it is not sourced.
- Never merge two sources into one field. If two sources disagree, see **Conflicts**.

---

## SOURCE TIERS

Use the highest tier available. Record the tier you actually used.

| Tier | What | Examples |
|---|---|---|
| **1** | Statutory / regulator / grid operator registers | ODRE + GRDF/GRTgaz (FR), Marktstammdatenregister + dena Biogasregister (DE), Vertogas (NL), Energinet + Energidataservice (DK), Green Gas Certification Scheme + Ofgem (UK), SEWRC (BG), KZR INiG + URE (PL), GSE (IT), CNMC/Enagás (ES), Energimyndigheten (SE), Gas Connect/E-Control (AT) |
| **2** | Certification bodies & trade registries | ISCC EU certificate database, REDcert, 2BSvs, ERGaR, UDB (Union Database) |
| **3** | Operator's own disclosures | Company site, annual report, investor deck, permit application, EIA filing |
| **4** | Reputable secondary | EBA/GIE Biomethane Map, IEA Bioenergy Task 37, national biogas association lists, trade press with a named figure |
| **5** | Everything else | Wikipedia, aggregator sites, LLM recall — **NOT ACCEPTABLE AS A SOLE SOURCE** |

Tier 5 may only *point you* to a Tier 1–4 document. Never cite it as `source`.

Search in the **local language first** (`méthaniseur`, `Biomethananlage`, `biogasanlæg`,
`biometaan`, `biometan`). English-only searching is the single largest cause of false nulls.

---

## FIELDS

### Tier A — Identity (attempt on every plant; a plant with no A-tier is a bad record)

| Field | Type | Definition / trap to avoid |
|---|---|---|
| `nameOfficial` | string | Legal/registered facility name. Keep our display name separate. |
| `aliases` | string[] | Other names in registers, permits, press. Critical for dedupe. |
| `operator` | string | Legal entity that **operates** the site, with legal form (SAS, GmbH, A/S, Ltd). |
| `ownerParent` | string | Ultimate parent / majority owner if different. Note % if stated. |
| `region` | string | Admin region **and** NUTS-2 code if findable (e.g. "Occitanie / FRJ2"). |
| `coordinates` | [lat, lon] | Decimal degrees, **4 dp**, WGS84. The site itself, not the town centroid. State in `quote` how it was fixed (register coords > permit map > address geocode). If only the municipality is known, use `null`. |
| `address` | string | Street address as registered. |
| `status` | enum | `Active` \| `Under Construction` \| `Planned` \| `Decommissioned` \| `Mothballed`. Include the **as-of date** in the quote — status is perishable. |
| `commissioningYear` | number | Year of **first biomethane injection/production** — not planning consent, not groundbreaking. If both exist and differ, note both. |

### Tier B — Physical & production

| Field | Type | Definition / trap to avoid |
|---|---|---|
| `capacityNm3h` | number | **Upgraded biomethane output**, Nm³/h. The most-corrupted field in this industry: raw biogas capacity is ~1.6–2.0× biomethane output. If the source says "biogas", record it under `rawBiogasNm3h` and leave this `null`. |
| `rawBiogasNm3h` | number | Raw biogas before upgrading, if that is what the source states. |
| `annualEnergyGWh` | number | Annual biomethane energy. **Must record `energyBasis`.** |
| `energyBasis` | enum | `HHV/GCV` \| `LHV/NCV` \| `UNSTATED`. Continental registers are usually GCV; a GCV/NCV mixup is a ~11% error. Never convert — record what is stated. |
| `capacityBasis` | enum | `NAMEPLATE` \| `PERMITTED` \| `ACTUAL_OUTPUT` \| `UNSTATED`. Permitted ≠ built ≠ produced. |
| `productionYear` | number | If `annualEnergyGWh` is an actual figure, which year is it? |
| `upgradingTechnology` | enum | `Membrane` \| `Amine scrubbing` \| `Water scrubbing` \| `PSA` \| `Organic physical scrubbing` \| `Cryogenic` \| `Other`. Add vendor if stated (Bright, Pentair, Greenlane, Wärtsilä). |
| `gridConnectionType` | enum | `Distribution injection` \| `Transmission injection` \| `Off-grid liquefaction (bio-LNG)` \| `Off-grid compression (bio-CNG)` \| `Virtual pipeline / trucked` \| `On-site power/heat only`. Determines whether the molecule can reach a certificate market at all. |
| `networkOperator` | string | Named DSO/TSO for **this** connection — not the country's operator list. |
| `injectionPointId` | string | Grid entry point ID / EIC code / register point ID. High value: this is the join key to flow data. |
| `feedstockCategory` | enum | `Agricultural residues & manure` \| `Energy crops` \| `Food & organic waste` \| `Sewage sludge` \| `Landfill gas` \| `Industrial organic effluent` \| `Mixed`. |
| `feedstockDetails` | string | Actual inputs named by the source, in the source's words. |
| `feedstockShares` | object | `{ "cattle slurry": 0.6, "maize silage": 0.2 }` — only if the source gives shares. |

### Tier C — Commercial & eligibility (highest value; these drive the trade engine)

These map onto our `Consignment` model, which decides whether a molecule clears a given
market. Getting one of these right is worth more than all of Tier A.

| Field | Type | Definition / trap to avoid |
|---|---|---|
| `carbonIntensity` | number | gCO₂e/MJ, may be **negative** (manure credit). Useless without the next two fields. |
| `ciMethodology` | enum | `ACTUAL_VERIFIED` \| `DISAGGREGATED_DEFAULT` \| `RED_II_DEFAULT` \| `SELF_DECLARED` \| `MARKETING_CLAIM`. A brochure's "90% saving" is `MARKETING_CLAIM` and is not tradeable evidence. |
| `ciVerifier` | string | Who audited it, plus certificate/report reference. |
| `annexClassification` | enum | `IX_A` \| `IX_B` \| `CROP` \| `OTHER`. Derive **only** from feedstock as named in a certification document — never from a general feedstock description. |
| `certificationSchemes` | array | `[{ scheme, certificateNumber, validFrom, validUntil, scope }]`. Allowed: `ISCC_EU`, `ISCC_PLUS`, `REDCERT_EU`, `REDCERT2`, `2BSVS`, `KZR_INIG`. Check the scheme's own public certificate database — Tier 2 and usually definitive. |
| `chainOfCustody` | enum | `MASS_BALANCE` \| `BOOK_AND_CLAIM` \| `SEGREGATION` — as stated on the certificate scope. |
| `nationalRegistry` | string | Registry the plant is actually enrolled in, plus its **registry account/plant ID**. |
| `udbRegistered` | enum | `RECORDED` \| `PENDING` \| `NOT_RECORDED` \| `UNKNOWN`. |
| `supportScheme` | object | `{ name, type: "FiT \| CfD \| Grant \| Quota \| None", startYear, endYear }` (e.g. tarif d'achat/BCIAT, EEG, SDE++, GGSS). **Decisive:** subsidised volume is frequently barred from also selling certificates (double-support / double-counting). A plant on a 15-year FiT is usually not merchant. |
| `supportSchemeEndYear` | number | When it rolls off — i.e. when the volume becomes tradeable. Commercially the most interesting number on the page. |
| `primaryOfftake` | string | Named offtaker and contract type, if disclosed. |
| `offtakeContractEnd` | number | Year the existing offtake expires, if disclosed. |
| `merchantVolumeAvailable` | boolean | Is any volume uncontracted/merchant? Only if explicitly stated. |

---

## CONFLICTS

If two sources of the **same tier** disagree, set `value: null` and record both in
`research.notes` with their URLs. Do not average. Do not silently pick the newer one.

If different tiers disagree, take the higher tier and note the discrepancy. A Tier 1
register beating an operator press release is normal and worth recording.

If a value is a range ("15–20 GWh"), record the range in `notes` and set `value: null`
unless the schema field is explicitly a range.

## STATUS DECAY

Anything time-sensitive (`status`, `capacityNm3h`, `supportScheme`, `certificationSchemes`,
`primaryOfftake`) must carry the source's own as-of date in the `quote` or `notes`. A 2019
figure presented as current is a defect. If the newest source is more than 3 years old,
drop `research.confidence` to `LOW` and say so.

## CONFIDENCE

- **HIGH** — Tier 1–2 sources for identity *and* at least half of Tier B, all dated within 3 years.
- **MEDIUM** — plant unambiguously identified in a Tier 1–3 source, but key physical/commercial fields unavailable.
- **LOW** — existence confirmed only via Tier 4, or identity ambiguous (several plants share a name/municipality).

If you cannot confirm the plant **exists**, return `research.confidence: "LOW"`, all
fields `null`, and the note `"UNCONFIRMED — no Tier 1-4 source found"`. Flag suspected
duplicates of another `id` explicitly — our list is known to contain near-duplicate names
(e.g. "X 1" / "X 2") that may be one site or two units.

## DO NOT

- Do not fill `feedstockCategory`, `upgradingTechnology`, `networkOperator`, or
  `nationalRegistry` from country-level norms. Our database is currently populated by
  exactly that method, and all of it is considered corrupt.
- Do not compute `capacityNm3h` from `annualEnergyGWh` or vice versa. The load factor is
  unknown and varies 60–95%.
- Do not translate an operator's legal name. Record it verbatim.
- Do not report a site's aggregate capacity when it hosts multiple units, unless the
  source aggregates them itself.

---

## WORKED EXAMPLE (format illustration only — values are placeholders, not researched data)

```json
{
  "id": "plant_dk_42",
  "research": {
    "researchedAt": "2026-08-18",
    "researcher": "research-agent-01",
    "searchLanguages": ["da", "en"],
    "confidence": "MEDIUM",
    "notes": "Coordinates from municipal permit map, not from register. Capacity: operator site states 'biogas', not biomethane, so recorded under rawBiogasNm3h and capacityNm3h left null. No ISCC certificate found under this operator name; searched operator and parent. Support scheme end year not disclosed anywhere."
  },
  "fields": {
    "operator": {
      "value": "<Operator name> A/S",
      "source": {
        "name": "Energistyrelsen — biogas plant register",
        "url": "https://ens.dk/...",
        "accessedAt": "2026-08-18",
        "tier": 1,
        "quote": "Anlægsejer: <Operator name> A/S, CVR 12345678"
      }
    },
    "capacityNm3h": { "value": null },
    "rawBiogasNm3h": {
      "value": 1400,
      "source": {
        "name": "Operator technical page",
        "url": "https://...",
        "accessedAt": "2026-08-18",
        "tier": 3,
        "quote": "Anlægget producerer ca. 1.400 Nm³ biogas i timen"
      }
    },
    "chainOfCustody": { "value": null }
  }
}
```

Note what the example does: it refuses the capacity field rather than converting the
biogas number, and it says where it looked before nulling. That is the target behaviour.
