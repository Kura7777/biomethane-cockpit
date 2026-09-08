#!/usr/bin/env python3
"""
Implementation Plan Task 0.4 — remove fabricated fields from the plant registry.

The source file src/domain/plants/plantsData.ts carries 1,975 plants, all
claiming provenance "GIE/EBA European Biomethane Map 2026 (Official Census)".
Verified fabrications (see IMPLEMENTATION_PLAN.md Task 0.4):

  - commissioningYear is the constant 2021 across every single row.
  - 217 rows (11%) have a templated operator "{Country} BioEnergy ({PlantName})".
  - The same 217 rows have a legalEntityName ending "Ltd/SA" — not a real
    corporate form in any European jurisdiction.
  - 98.5% of rows have no contactEmail / contactPhone / companyRegistrationId /
    corporateWebsite, which is consistent with the real GIE/EBA map (it does
    not publish these fields) but the provenance string does not say so.

This script nulls the fabricated values, rewrites the provenance string to
describe only what the source actually publishes, and recomputes
fieldsUnverified from the fields that are actually null, rather than the
disconnected placeholder list ("hourlyCapacity", "feedstockSubstrateMix")
that shipped in the original data — those keys do not even exist on the
BiomethanePlant type.

Idempotent: running this twice produces no further changes.
"""
import json
import re
import sys
from pathlib import Path

PLANTS_FILE = Path(__file__).resolve().parent.parent / "src" / "domain" / "plants" / "plantsData.ts"

TRUE_PROVENANCE = (
    "GIE/EBA European Biomethane Map 2026 — name, location and capacity only. "
    "Operator, legal entity, commissioning date and contact details are not "
    "published by this source and are unverified unless separately sourced."
)

# Fields a real registry entry could in principle be verified against. If any
# of these is null, the plant's fieldsUnverified list must say so — this
# replaces the old hardcoded list, which named fields that don't exist on the
# type at all.
VERIFIABLE_FIELDS = [
    "operator",
    "legalEntityName",
    "companyRegistrationId",
    "corporateWebsite",
    "contactEmail",
    "contactPhone",
    "commissioningYear",
]

TEMPLATE_OPERATOR_RE = re.compile(r"BioEnergy \(")


def load_plants():
    text = PLANTS_FILE.read_text(encoding="utf-8")
    start = text.index("= [") + 2
    end = text.rindex("]") + 1
    prefix = text[:start]
    suffix = text[end:]
    plants = json.loads(text[start:end])
    return prefix, plants, suffix


def purge(plants):
    stats = {
        "commissioning_year_nulled": 0,
        "template_operator_nulled": 0,
        "template_legal_entity_nulled": 0,
        "provenance_rewritten": 0,
    }

    for plant in plants:
        if plant.get("commissioningYear") is not None:
            stats["commissioning_year_nulled"] += 1
        plant["commissioningYear"] = None

        operator = plant.get("operator")
        if operator and TEMPLATE_OPERATOR_RE.search(operator):
            plant["operator"] = None
            stats["template_operator_nulled"] += 1

        legal_entity = plant.get("legalEntityName")
        if legal_entity and legal_entity.endswith("Ltd/SA"):
            plant["legalEntityName"] = None
            stats["template_legal_entity_nulled"] += 1

        if plant.get("provenance") != TRUE_PROVENANCE:
            plant["provenance"] = TRUE_PROVENANCE
            stats["provenance_rewritten"] += 1

        plant["fieldsUnverified"] = [f for f in VERIFIABLE_FIELDS if plant.get(f) is None]

    return stats


def main():
    prefix, plants, suffix = load_plants()
    print(f"Loaded {len(plants)} plants.")

    stats = purge(plants)
    for k, v in stats.items():
        print(f"  {k}: {v}")

    dumped = json.dumps(plants, indent=2, ensure_ascii=False)
    PLANTS_FILE.write_text(prefix + dumped + suffix, encoding="utf-8", newline="\n")
    print(f"Wrote {PLANTS_FILE}")

    # Sanity checks matching the acceptance criteria in Task 0.4.
    assert all(p.get("commissioningYear") is None for p in plants), "commissioningYear not fully nulled"
    assert not any(
        p.get("operator") and TEMPLATE_OPERATOR_RE.search(p["operator"]) for p in plants
    ), "template operator remains"
    assert not any(
        p.get("legalEntityName") and p["legalEntityName"].endswith("Ltd/SA") for p in plants
    ), "template legal entity remains"
    print("Sanity checks passed.")


if __name__ == "__main__":
    sys.exit(main())
