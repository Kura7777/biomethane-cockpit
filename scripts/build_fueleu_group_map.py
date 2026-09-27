#!/usr/bin/env python3
"""
Build a mapping from EU MRV 2024 "DoC holder" companies (ISM Document of
Compliance holders, as named in the public MRV report) to the commercial
shipping group that actually makes FuelEU / EU ETS compliance-purchasing
decisions.

Why this exists: the MRV public dataset lists the ISM DoC holder, which is
frequently a ship manager or single-purpose subsidiary rather than the
commercial owner/operator/charterer who would buy biomethane/FuelEU
compliance surplus on a trading desk. This script consolidates recognisable
brand families and flags known third-party technical/crew managers, using
an editable rules file (data/fueleu_group_map_overrides.json) so the
mapping can be corrected/extended without touching this script.

Usage:
    python scripts/build_fueleu_group_map.py

Reads:
    data/fueleu_mrv_2024_companies.json
    data/fueleu_group_map_overrides.json

Writes:
    data/fueleu_group_map.json

Deterministic: given the same two input files, this script always produces
the same output.
"""
import json
import re
import sys
from pathlib import Path
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parent.parent
COMPANIES_PATH = ROOT / "data" / "fueleu_mrv_2024_companies.json"
OVERRIDES_PATH = ROOT / "data" / "fueleu_group_map_overrides.json"
OUTPUT_PATH = ROOT / "data" / "fueleu_group_map.json"

TOP_N = 400


def slugify(name: str) -> str:
    """Normalise a company name into a stable, punctuation-insensitive slug
    so that near-identical spellings of the same legal entity (e.g. with or
    without a trailing comma) collapse to the same self-group."""
    s = name.strip().lower()
    s = s.replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    return s or "unknown"


def compile_patterns(rules, key="pattern"):
    out = []
    for r in rules:
        out.append({**r, "_re": re.compile(r[key], re.IGNORECASE)})
    return out


def looks_like_cruise(name: str, segment: str) -> bool:
    if "passenger" not in segment.lower():
        return False
    return bool(re.search(r"cruise", name, re.IGNORECASE))


def main():
    companies_doc = json.loads(COMPANIES_PATH.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))
    companies = companies_doc["companies"]

    manager_patterns = compile_patterns(overrides.get("thirdPartyManagerPatterns", []))
    owner_patterns = compile_patterns(overrides.get("ownerBrandPatterns", []))
    manual_overrides = overrides.get("manualOverrides", {})
    segment_bearer = overrides.get("segmentFuelCostBearer", {})
    group_parents = {
        k: v for k, v in overrides.get("groupParents", {}).items() if k != "_comment"
    }

    ranked = sorted(companies, key=lambda c: -(c.get("in_scope_co2_t") or 0))
    top_imos = {c["company_imo"] for c in ranked[:TOP_N]}
    total_co2 = sum(c.get("in_scope_co2_t") or 0 for c in companies)
    top_co2 = sum(c.get("in_scope_co2_t") or 0 for c in ranked[:TOP_N])

    # group_id -> group record
    groups = {}

    def get_group(group_id, group_name, entity_type):
        g = groups.get(group_id)
        if g is None:
            g = {
                "group_id": group_id,
                "group_name": group_name,
                "entityType": entity_type,
                "company_imos": [],
                "basis": [],
            }
            groups[group_id] = g
        return g

    deliberately_mapped_top400_co2 = 0.0
    deliberately_mapped_top400_count = 0
    unmapped_count = 0

    for c in companies:
        imo = c["company_imo"]
        name = c.get("parent_name", "")
        segment = c.get("segment", "")
        co2 = c.get("in_scope_co2_t") or 0
        in_top = imo in top_imos

        assigned = False

        # 1. Manual override (subsidiary/brand relationship not obvious from name)
        mo = manual_overrides.get(imo)
        if mo:
            g = get_group(mo["group_id"], mo["group_name"], mo["entityType"])
            g["company_imos"].append(imo)
            basis = {"company_imo": imo, "rule": "MANUAL", "note": mo.get("note", "")}
            if mo.get("sourceUrl"):
                basis["sourceUrl"] = mo["sourceUrl"]
            g["basis"].append(basis)
            assigned = True

        # 2. Third-party technical/crew manager patterns
        if not assigned:
            for p in manager_patterns:
                if p["_re"].search(name):
                    g = get_group(p["group_id"], p["group_name"], "THIRD_PARTY_MANAGER")
                    g["company_imos"].append(imo)
                    g["basis"].append({
                        "company_imo": imo,
                        "rule": "NAME_PATTERN",
                        "note": f"Matched third-party manager pattern /{p['pattern']}/i against parent_name.",
                    })
                    assigned = True
                    break

        # 3. Owner/commercial-brand consolidation patterns
        if not assigned:
            for p in owner_patterns:
                if p["_re"].search(name):
                    g = get_group(p["group_id"], p["group_name"], p["entityType"])
                    g["company_imos"].append(imo)
                    g["basis"].append({
                        "company_imo": imo,
                        "rule": "NAME_PATTERN",
                        "note": f"Matched owner-brand pattern /{p['pattern']}/i against parent_name.",
                    })
                    assigned = True
                    break

        # 4. Top-400 fallback: deliberate self-group (the DoC holder appears
        #    to be its own commercial decision-maker; no evidence of a
        #    distinct, differently-named commercial parent was found).
        if not assigned and in_top:
            group_id = slugify(name)
            entity_type = "CRUISE" if looks_like_cruise(name, segment) else "OWNER_OPERATOR"
            g = get_group(group_id, name, entity_type)
            g["company_imos"].append(imo)
            g["basis"].append({
                "company_imo": imo,
                "rule": "NAME_PATTERN",
                "note": "No third-party manager or consolidation pattern matched; treated as its own commercial group (self-evident owner/operator).",
            })
            assigned = True

        # 5. Outside top 400 and unmatched: single-company UNKNOWN group.
        if not assigned:
            group_id = slugify(name)
            g = get_group(group_id, name, "UNKNOWN")
            g["company_imos"].append(imo)
            g["basis"].append({
                "company_imo": imo,
                "rule": "NAME_PATTERN",
                "note": "Outside the top-400-by-CO2 deliberate-mapping pass; left as an unmapped single-company placeholder group.",
            })
            unmapped_count += 1

        if in_top:
            deliberately_mapped_top400_count += 1
            deliberately_mapped_top400_co2 += co2

    # A group counts as "deliberately mapped" (vs a bare UNKNOWN placeholder)
    # if its entityType isn't UNKNOWN.
    mapped_top400_co2 = 0.0
    for c in ranked[:TOP_N]:
        imo = c["company_imo"]
        for g in groups.values():
            if imo in g["company_imos"] and g["entityType"] != "UNKNOWN":
                mapped_top400_co2 += c.get("in_scope_co2_t") or 0
                break

    # Apply optional group-to-group parent links (e.g. msc-cruises -> msc).
    for group_id, link in group_parents.items():
        g = groups.get(group_id)
        if g is not None and link.get("parent_group_id"):
            g["parent_group_id"] = link["parent_group_id"]
            if link.get("sourceUrl"):
                g["parentGroupSourceUrl"] = link["sourceUrl"]

    group_list = sorted(
        groups.values(),
        key=lambda g: -sum(
            (next((c["in_scope_co2_t"] or 0 for c in companies if c["company_imo"] == imo), 0))
            for imo in g["company_imos"]
        ),
    )

    output = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "method": (
            "Groups are assigned in priority order: (1) manual company_imo overrides for "
            "subsidiary/brand relationships that are not obvious from the MRV parent_name "
            "itself (each carries a sourceUrl); (2) regex name-pattern matches against a "
            "curated list of known third-party ship/crew managers (entityType "
            "THIRD_PARTY_MANAGER); (3) regex name-pattern matches against a curated list of "
            "known commercial owner/operator and cruise brand families; (4) for the top "
            f"{TOP_N} companies by in_scope_co2_t that match nothing above, the DoC holder is "
            "treated as its own commercial group (deliberate self-group, not a default "
            "UNKNOWN); (5) all remaining companies become single-company UNKNOWN "
            "placeholder groups. All patterns and manual overrides live in "
            "data/fueleu_group_map_overrides.json and are re-run deterministically by "
            "scripts/build_fueleu_group_map.py."
        ),
        "coverage": {
            "totalCompanies": len(companies),
            "totalInScopeCo2T": round(total_co2, 1),
            "top400InScopeCo2T": round(top_co2, 1),
            "top400ShareOfTotalCo2Pct": round(100 * top_co2 / total_co2, 2) if total_co2 else None,
            "top400DeliberatelyMappedCo2T": round(mapped_top400_co2, 1),
            "top400DeliberatelyMappedSharePct": round(100 * mapped_top400_co2 / top_co2, 2) if top_co2 else None,
        },
        "groups": group_list,
        "segmentFuelCostBearer": segment_bearer,
        "unmapped_count": unmapped_count,
    }

    OUTPUT_PATH.write_text(json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} with {len(group_list)} groups, {unmapped_count} unmapped companies.")
    print(
        f"Top {TOP_N} CO2 share of total: {output['coverage']['top400ShareOfTotalCo2Pct']}%; "
        f"deliberately mapped share of that top-{TOP_N} CO2: "
        f"{output['coverage']['top400DeliberatelyMappedSharePct']}%"
    )


if __name__ == "__main__":
    sys.exit(main())
