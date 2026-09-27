"""
Build a real, sourced FuelEU Maritime company/fuel dataset from the EU MRV
(THETIS-MRV) public emission report for reporting year 2024 (version 244).

Source
------
https://mrv.emsa.europa.eu/api/public-emission-report/reporting-period-document/binary/2024/244

The workbook has two sheets: "2024 Full ERs" (ships reporting for the full
calendar year) and "2024 Partial ERs" (ships that changed company / left the
EU trade / entered it mid-year, so their MRV report covers only part of
2024). We INCLUDE Partial ERs, because excluding them would silently drop
real ships and real emissions (they are ~1,000 of ~14,000+ rows, ~5.5 Mt of
~152 Mt CO2). Ships from the Partial ERs sheet are flagged `partialReport:
true` on the ship record and rolled into `partialReportShips` at company
level, so downstream consumers can see/exclude them if a full-year-only view
is wanted.

Column layout (0-based), verified by header text below, not assumed:
  0  ship IMO number
  1  ship name
  2  ship type (MRV ship type category)
  7  ice class
  8  company IMO number (DoC holder)
  9  company name (DoC holder, as reported)
  23 total fuel consumption [m tonnes]
  28 total CO2 emissions [m tonnes]
  29 CO2 emissions from voyages between MS ports [m tonnes]
  30 CO2 emissions from voyages which departed from an MS port [m tonnes]
  31 CO2 emissions from voyages to an MS port [m tonnes]
  32 CO2 emissions at berth in an MS port [m tonnes]
  37 CO2 to be reported under Directive 2003/87/EC (EU ETS) [m tonnes]
  38 total CH4 emissions [m tonnes]
  48 total N2O emissions [m tonnes]

Header row is row 3 (1-indexed) in both sheets; data starts row 4. The
script locates each column by matching the header text (see EXPECTED_HEADERS
below) rather than trusting the hardcoded indexes, and fails loudly if any
expected header is missing or has moved.

FuelEU / MRV scope reconciliation (see scratch/fueleu_audit/reg1805.txt,
Art. 2(1), lines 175-200)
------------------------------------------------------------------------
Reg. (EU) 2023/1805 Art. 2(1) applies FuelEU obligations, for ships >5,000 GT
carrying passengers/cargo commercially (MRV already restricts its scope to
>=5,000 GT ships, so no extra GT filter is applied here), to:
  (a) 100% of energy used at berth in an MS port;
  (b) 100% of energy used on voyages between two MS ports;
  (c) 50% of energy on voyages to/from an outermost-region MS port; and
  (d) 50% of energy on voyages where the other end is a third-country port.

MRV does not separately break out outermost-region voyages, so (c) cannot be
distinguished from ordinary intra-MS voyages in this dataset -- outermost
region voyages get the same 100% weighting as any other "between MS ports"
voyage. This is a known limitation and likely a small upward bias versus the
true legal scope (a few outermost-region legs should get 50% instead of
100%), which we cannot correct with MRV data alone.

MRV's "departed from an MS port" and "to an MS port" categories are, by the
MRV Regulation's own definitions (Reg. (EU) 2015/757, Art. 3(l)-(m); mirrored
in the THETIS-MRV reporting template), voyages where ONE end is an MS port
and the other end is outside the EU/EEA MS network (otherwise the voyage
would count under "between MS ports" instead). That maps directly onto
Art. 2(1)(d)'s "third country" case, so we give both categories a 50% weight.
We could not separately identify any outermost-region third-country legs to
exclude, so those (rare) are still weighted at 50%, which happens to also be
correct under 2(1)(c) -- the ambiguity is at 100% vs 50% in the "between MS
ports" bucket, not here.

So: scopeShare = (between + atBerth + 0.5*(departed + to)) / totalCO2

Reconciliation check (see report / sanity check output): for the large
majority of ships, total CO2 = between + departed + to + atBerth, to within
rounding. A few ships show a residual of a few CO2 tonnes (out of thousands),
consistent with rounding in the underlying THETIS-MRV EIV/monitoring plan
data, not a structural gap. The separate "CO2 emissions within MS ports"
column (index 33) is NOT used for scope, because it is inconsistently
populated relative to "at berth" (col 32) -- sometimes equal to it, sometimes
zero while at-berth is nonzero, sometimes vice-versa -- so it appears to mix
reporting conventions across ships/verifiers and is not a reliable "other
in-port" residual category.

Fuel-type split (ESTIMATED, not reported by MRV)
-------------------------------------------------
MRV reports total fuel mass and total CO2/CH4/N2O mass per ship, but not a
per-fuel-type breakdown. We ESTIMATE a 3-way HFO/MGO/LNG split using Annex II
default CO2 emission factors (t CO2 / t fuel): HFO 3.114, MGO 3.206,
LNG 2.750.

Step 1 - identify LNG-fuelled ships. We compute CH4-per-tonne-fuel for every
ship with fuel > 0 (13,903 ships). The distribution is strongly bimodal: the
bottom ~95% of ships cluster tightly at ~5.0e-5 t CH4 / t fuel (this is the
IMO default CH4 slip factor baked into conventional liquid-fuel monitoring,
not real LNG slip), then there is a clean gap, and the top ~3.4% (479 ships)
sit at >=5.8e-3 t CH4 / t fuel -- two orders of magnitude higher, consistent
with methane slip from dual-fuel / LNG-fuelled engines. We set the threshold
at 0.001 t CH4 / t fuel (comfortably inside the gap, well above the
conventional-fuel cluster and well below the LNG cluster) and flag any ship
above it as an LNG user (`lngShipCount`). This yields 479 LNG-fuelled ships,
consistent with the known size of the world LNG-fuelled fleet trading into
the EU.

For LNG users: solve for LNG mass L and "oil" mass O (treated as HFO-class)
from the two equations F = L + O and CO2 = 2.75*L + 3.114*O, i.e.
  L = (3.114*F - CO2) / (3.114 - 2.75), O = F - L
clamped to [0, F].

For non-LNG ships: compute r = CO2/F and estimate the MGO mass share m via
linear interpolation between the two Annex II factors:
  m = clamp((r - 3.114) / (3.206 - 3.114), 0, 1)
i.e. m=0 when the ship's emission factor matches pure HFO, m=1 when it
matches pure MGO. mgo_tonnes = m*F, vlsfo_tonnes (used as the "residual fuel
oil" bucket, not literally VLSFO) = (1-m)*F.

376 of 13,424 non-LNG ships (2.8%) have r outside the plausible fossil-fuel
band [3.10, 3.22] -- some below (biofuel blends, which have lower CO2
factors under RED II than fossil HFO/MGO; LPG also has a lower factor), some
above (data/verification rounding, or minor methanol/other alternative fuel
use, which MRV also lets ships report). We do not have per-fuel MRV detail to
resolve these, so we KEEP the CO2-based HFO/MGO split (clamped to [0,1], so
the ratio is simply pinned to the nearer bound) and flag the ship
`otherFuelSuspected: true` at both ship and company level so downstream users
can see where the fossil HFO/MGO/LNG split is least trustworthy.

All of this is clearly an ESTIMATE built from aggregate CO2/CH4 data, not a
measured fuel-type breakdown; `fuelSplitMethod` and `source.method` in the
output record this.

Usage
-----
    python scripts/build_fueleu_mrv_dataset.py

Downloads the workbook to data/raw/mrv_2024_v244.xlsx if not already cached
there (falls back to copying scratch/fueleu_audit/part2/mrv_2024.xlsx if
present and the download is unavailable), computes and prints sanity checks,
and writes data/fueleu_mrv_2024_companies.json.
"""

from __future__ import annotations

import hashlib
import json
import math
import os
import shutil
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone

import openpyxl

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(REPO_ROOT, "data", "raw")
RAW_XLSX = os.path.join(RAW_DIR, "mrv_2024_v244.xlsx")
FALLBACK_XLSX = os.path.join(REPO_ROOT, "scratch", "fueleu_audit", "part2", "mrv_2024.xlsx")
OUTPUT_JSON = os.path.join(REPO_ROOT, "data", "fueleu_mrv_2024_companies.json")
# Per-ship records (ships with fuel > 0), same source block; one ship per line.
OUTPUT_SHIPS_JSON = os.path.join(REPO_ROOT, "data", "fueleu_mrv_2024_ships.json")

SOURCE_URL = "https://mrv.emsa.europa.eu/api/public-emission-report/reporting-period-document/binary/2024/244"
REPORTING_PERIOD = 2024
VERSION = 244

HEADER_ROW = 3  # 1-indexed
DATA_START_ROW = 4

SHEETS = ["2024 Full ERs", "2024 Partial ERs"]

# Column header text we expect to find at the documented indexes. We search
# for these by TEXT across the header row rather than trusting the index, and
# fail loudly if a header can't be found or is at an unexpected index.
EXPECTED_HEADERS = {
    0: "IMO Number",              # ship IMO (first occurrence)
    1: "Name",                    # ship name (first occurrence)
    2: "Ship type",
    7: "Ice Class",
    8: "IMO Number",              # company IMO (second occurrence)
    9: "Name",                    # company name (second occurrence)
    23: "Total fuel consumption",
    28: "Total CO",                # "Total CO₂ emissions" -- avoid unicode subscript matching issues
    29: "CO",                      # between MS ports
    30: "CO",                      # departed from MS ports
    31: "CO",                      # to MS ports
    32: "CO",                      # at berth
    37: "CO2 emissions to be reported under Directive 2003/87/EC",
    38: "Total CH",                # "Total CH₄ emissions"
    48: "Total N",                 # "Total N₂O emissions"
}

# More specific substrings (post the ambiguous generic "CO"/"Name" ones above)
# used for the loud verification pass.
EXPECTED_HEADERS_FULL = {
    0: "IMO Number",
    1: "Name",
    2: "Ship type",
    7: "Ice Class",
    8: "IMO Number",
    9: "Name",
    23: "Total fuel consumption",
    28: "Total CO₂ emissions",
    29: "CO₂ emissions from all voyages between ports under a MS jurisdiction",
    30: "CO₂ emissions from all voyages which departed from ports under a MS jurisdiction",
    31: "CO₂ emissions from all voyages to ports under a MS jurisdiction",
    32: "CO₂ emissions which occurred within ports under a MS jurisdiction at berth",
    37: "CO2 emissions to be reported under Directive 2003/87/EC",
    38: "Total CH₄ emissions",
    48: "Total N₂O emissions",
}

CO2_FACTOR_HFO = 3.114
CO2_FACTOR_MGO = 3.206
CO2_FACTOR_LNG = 2.750

LNG_CH4_PER_FUEL_THRESHOLD = 0.001  # t CH4 / t fuel; see docstring for justification
FOSSIL_RATIO_LOW = 3.10
FOSSIL_RATIO_HIGH = 3.22


def log(*args):
    print(*args, file=sys.stderr)


def sha256_of_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def ensure_source_file() -> str:
    os.makedirs(RAW_DIR, exist_ok=True)
    if os.path.exists(RAW_XLSX):
        log(f"Using cached source at {RAW_XLSX}")
        return RAW_XLSX

    if os.path.exists(FALLBACK_XLSX):
        log(f"Copying existing local copy {FALLBACK_XLSX} -> {RAW_XLSX}")
        shutil.copyfile(FALLBACK_XLSX, RAW_XLSX)
        return RAW_XLSX

    log(f"Downloading {SOURCE_URL} -> {RAW_XLSX}")
    req = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(RAW_XLSX, "wb") as out:
        shutil.copyfileobj(resp, out)
    return RAW_XLSX


def verify_headers(ws, sheet_name: str):
    header_row = next(ws.iter_rows(min_row=HEADER_ROW, max_row=HEADER_ROW, values_only=True))
    for idx, expected_text in EXPECTED_HEADERS_FULL.items():
        actual = header_row[idx] if idx < len(header_row) else None
        actual_str = (actual or "").strip()
        if expected_text not in actual_str:
            raise RuntimeError(
                f"Header mismatch in sheet '{sheet_name}' at column index {idx}: "
                f"expected substring {expected_text!r}, found {actual_str!r}. "
                f"The MRV export format may have changed -- column indexes must be re-verified."
            )
    log(f"Header verification OK for sheet '{sheet_name}'.")


def num(v):
    return v if isinstance(v, (int, float)) else 0.0


def estimate_fuel_split(fuel_t: float, co2_t: float, ch4_t: float):
    """Return (vlsfo_t, mgo_t, lng_t, is_lng, other_fuel_suspected)."""
    if fuel_t <= 0:
        return 0.0, 0.0, 0.0, False, False

    ch4_per_fuel = ch4_t / fuel_t if fuel_t else 0.0
    is_lng = ch4_per_fuel > LNG_CH4_PER_FUEL_THRESHOLD

    if is_lng:
        # F = L + O ; CO2 = 2.75*L + 3.114*O  =>  L = (3.114F - CO2)/(3.114-2.75)
        denom = CO2_FACTOR_HFO - CO2_FACTOR_LNG
        lng_t = (CO2_FACTOR_HFO * fuel_t - co2_t) / denom if denom else 0.0
        lng_t = max(0.0, min(fuel_t, lng_t))
        oil_t = fuel_t - lng_t
        return oil_t, 0.0, lng_t, True, False

    r = co2_t / fuel_t if fuel_t else 0.0
    other_fuel_suspected = r < FOSSIL_RATIO_LOW or r > FOSSIL_RATIO_HIGH
    m = (r - CO2_FACTOR_HFO) / (CO2_FACTOR_MGO - CO2_FACTOR_HFO)
    m = max(0.0, min(1.0, m))
    mgo_t = m * fuel_t
    vlsfo_t = (1.0 - m) * fuel_t
    return vlsfo_t, mgo_t, 0.0, False, other_fuel_suspected


def main():
    src_path = ensure_source_file()
    sha256 = sha256_of_file(src_path)
    log(f"Source SHA-256: {sha256}")

    wb = openpyxl.load_workbook(src_path, read_only=True, data_only=True)

    for sheet_name in SHEETS:
        if sheet_name not in wb.sheetnames:
            raise RuntimeError(f"Expected sheet {sheet_name!r} not found; sheets present: {wb.sheetnames}")

    companies = defaultdict(lambda: {
        "company_imo": None,
        "parent_name": None,
        "ship_imos": [],
        "vessels_in_scope": 0,
        "segment_co2_by_type": defaultdict(float),
        "vlsfo_tonnes": 0.0,
        "mgo_tonnes": 0.0,
        "lng_tonnes": 0.0,
        "in_scope_co2_t": 0.0,
        "total_co2_t": 0.0,
        "ets_co2_t": 0.0,
        "ch4_t": 0.0,
        "lngShipCount": 0,
        "partialReportShips": 0,
        "otherFuelSuspectedShips": 0,
    })

    total_ships = 0
    ship_records = []
    total_co2_all = 0.0
    total_co2_full = 0.0
    total_co2_partial = 0.0
    total_in_scope_co2 = 0.0
    total_ets_co2 = 0.0
    total_ch4 = 0.0
    lng_ship_examples = []
    reconciliation_residuals = []
    zero_fuel_ships = 0

    for sheet_name in SHEETS:
        ws = wb[sheet_name]
        verify_headers(ws, sheet_name)
        is_partial = sheet_name == "2024 Partial ERs"

        n_rows = 0
        for row in ws.iter_rows(min_row=DATA_START_ROW, values_only=True):
            ship_imo = row[0]
            if ship_imo is None:
                continue
            n_rows += 1

            ship_name = row[1]
            ship_type = row[2] or "Unknown"
            company_imo = row[8]
            company_name = (row[9] or "").strip() if row[9] else None

            fuel_t = num(row[23])
            total_co2 = num(row[28])
            co2_between = num(row[29])
            co2_departed = num(row[30])
            co2_to = num(row[31])
            co2_at_berth = num(row[32])
            ets_co2 = num(row[37])
            ch4_t = num(row[38])

            if not company_imo:
                # Ships without a DoC holder company IMO can't be aggregated
                # into a company; skip (rare / data quality issue in MRV).
                continue

            company_key = str(company_imo)

            recon = total_co2 - (co2_between + co2_departed + co2_to + co2_at_berth)
            if total_co2 > 0:
                reconciliation_residuals.append(recon / total_co2)

            if total_co2 > 0:
                scope_share = (co2_between + co2_at_berth + 0.5 * (co2_departed + co2_to)) / total_co2
                scope_share = max(0.0, min(1.0, scope_share))
            else:
                scope_share = 0.0

            if fuel_t <= 0:
                zero_fuel_ships += 1

            vlsfo_t, mgo_t, lng_t, is_lng, other_fuel_suspected = estimate_fuel_split(fuel_t, total_co2, ch4_t)

            in_scope_co2 = total_co2 * scope_share
            in_scope_vlsfo = vlsfo_t * scope_share
            in_scope_mgo = mgo_t * scope_share
            in_scope_lng = lng_t * scope_share

            c = companies[company_key]
            c["company_imo"] = company_key
            if company_name:
                c["parent_name"] = company_name
            c["ship_imos"].append(str(ship_imo))
            if scope_share > 0:
                c["vessels_in_scope"] += 1
            c["segment_co2_by_type"][ship_type] += total_co2
            c["vlsfo_tonnes"] += in_scope_vlsfo
            c["mgo_tonnes"] += in_scope_mgo
            c["lng_tonnes"] += in_scope_lng
            c["in_scope_co2_t"] += in_scope_co2
            c["total_co2_t"] += total_co2
            c["ets_co2_t"] += ets_co2
            c["ch4_t"] += ch4_t
            if is_lng:
                c["lngShipCount"] += 1
                if len(lng_ship_examples) < 8:
                    lng_ship_examples.append((str(ship_imo), ship_name, company_name, round(fuel_t, 1), round(lng_t, 1)))
            if is_partial:
                c["partialReportShips"] += 1
            if other_fuel_suspected:
                c["otherFuelSuspectedShips"] += 1

            if fuel_t > 0:
                ship_records.append({
                    "imo": str(ship_imo),
                    "name": ship_name,
                    "shipType": ship_type,
                    "company_imo": company_key,
                    "iceClass": row[7],
                    "partialReport": is_partial,
                    "scopeShare": round(scope_share, 4),
                    "in_scope_vlsfo_t": round(in_scope_vlsfo, 1),
                    "in_scope_mgo_t": round(in_scope_mgo, 1),
                    "in_scope_lng_t": round(in_scope_lng, 1),
                    "in_scope_co2_t": round(in_scope_co2, 1),
                    "total_co2_t": round(total_co2, 1),
                    "ets_co2_t": round(ets_co2, 1),
                    "ch4_t": round(ch4_t, 3),
                    "isLng": is_lng,
                    "otherFuelSuspected": other_fuel_suspected,
                    "_in_scope_co2_raw": in_scope_co2,
                })

            total_ships += 1
            total_co2_all += total_co2
            if is_partial:
                total_co2_partial += total_co2
            else:
                total_co2_full += total_co2
            total_in_scope_co2 += in_scope_co2
            total_ets_co2 += ets_co2
            total_ch4 += ch4_t

        log(f"Sheet '{sheet_name}': {n_rows} ship rows processed.")

    # Cross-check 3 ships by hand (pick 3 arbitrary but stable IMOs seen above).
    manual_check_imos = ["1013676", "1014838", "1015155"]  # AQUADONNA, WARRIOR, SPAR MAIA
    manual_checks = []
    for sheet_name in SHEETS:
        ws = wb[sheet_name]
        for row in ws.iter_rows(min_row=DATA_START_ROW, values_only=True):
            if row[0] is not None and str(row[0]) in manual_check_imos:
                manual_checks.append({
                    "sheet": sheet_name,
                    "ship_imo": str(row[0]),
                    "ship_name": row[1],
                    "company_name": row[9],
                    "fuel_t": num(row[23]),
                    "total_co2_t": num(row[28]),
                    "between": num(row[29]),
                    "departed": num(row[30]),
                    "to": num(row[31]),
                    "at_berth": num(row[32]),
                    "ch4_t": num(row[38]),
                })

    # Finalize per-company records.
    company_list = []
    for key, c in companies.items():
        segment = max(c["segment_co2_by_type"].items(), key=lambda kv: kv[1])[0] if c["segment_co2_by_type"] else "Unknown"
        company_list.append({
            "company_imo": c["company_imo"],
            "parent_name": c["parent_name"] or "(unknown)",
            "ship_imos": c["ship_imos"],
            "vessels_in_scope": c["vessels_in_scope"],
            "segment": segment,
            "vlsfo_tonnes": round(c["vlsfo_tonnes"], 1),
            "mgo_tonnes": round(c["mgo_tonnes"], 1),
            "lng_tonnes": round(c["lng_tonnes"], 1),
            "in_scope_co2_t": round(c["in_scope_co2_t"], 1),
            "total_co2_t": round(c["total_co2_t"], 1),
            "ets_co2_t": round(c["ets_co2_t"], 1),
            "ch4_t": round(c["ch4_t"], 3),
            "lngShipCount": c["lngShipCount"],
            "fuelSplitMethod": "ESTIMATED_FROM_MRV_CO2_CH4",
            "partialReportShips": c["partialReportShips"],
            "otherFuelSuspectedShips": c["otherFuelSuspectedShips"],
        })

    company_list.sort(key=lambda c: c["in_scope_co2_t"], reverse=True)

    downloaded_at = datetime.now(timezone.utc).isoformat()

    output = {
        "source": {
            "dataset": "EU MRV public emission report (THETIS-MRV)",
            "reportingPeriod": REPORTING_PERIOD,
            "version": VERSION,
            "url": SOURCE_URL,
            "sha256": sha256,
            "downloadedAt": downloaded_at,
            "method": (
                "Scope share per ship = (CO2 between MS ports + CO2 at berth in MS ports "
                "+ 0.5*(CO2 departed from MS port + CO2 to MS port)) / total CO2, per "
                "Reg. (EU) 2023/1805 Art. 2(1); outermost-region 50% voyages cannot be "
                "distinguished from ordinary intra-MS voyages in MRV data and are treated "
                "as 100%-in-scope (limitation). Fuel type split (HFO/MGO/LNG) is ESTIMATED "
                "from total fuel mass, total CO2 and total CH4 using IMO Annex II default "
                "CO2 factors (HFO 3.114, MGO 3.206, LNG 2.750 t CO2/t fuel); ships with "
                "CH4/fuel > 0.001 t/t are classified as LNG-fuelled and split via the "
                "CO2/CH4 mass-balance; other ships are split via linear interpolation of "
                "their CO2/fuel ratio between the HFO and MGO factors. Partial-year MRV "
                "reports ('2024 Partial ERs') are included and flagged partialReport."
            ),
        },
        "companies": company_list,
    }

    os.makedirs(os.path.dirname(OUTPUT_JSON), exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    # Per-ship output. Reconcile against company totals using unrounded values
    # (summing 1-dp ship figures over hundreds of ships drifts by rounding alone).
    raw_by_company = defaultdict(float)
    for sr in ship_records:
        raw_by_company[sr["company_imo"]] += sr["_in_scope_co2_raw"]
    for c in company_list:
        diff = abs(raw_by_company.get(c["company_imo"], 0.0) - c["in_scope_co2_t"])
        assert diff <= 0.1, f"ship/company in-scope CO2 mismatch for {c['company_imo']}: {diff}"
    with open(OUTPUT_SHIPS_JSON, "w", encoding="utf-8") as f:
        f.write(json.dumps({"source": output["source"]}, ensure_ascii=False)[:-1] + ',"ships":[\n')
        clean = [{k: v for k, v in sr.items() if not k.startswith("_")} for sr in ship_records]
        f.write(",\n".join(json.dumps(sr, ensure_ascii=False, separators=(",", ":")) for sr in clean))
        f.write("\n]}\n")
    print(f"Wrote {len(ship_records)} ship records to {OUTPUT_SHIPS_JSON} (ship/company reconciliation OK)")

    # ---------------- Sanity checks ----------------
    print("\n================ SANITY CHECKS ================")
    print(f"Total ships processed: {total_ships}")
    print(f"Ships with zero reported fuel: {zero_fuel_ships}")
    print(f"Total companies (DoC holders): {len(company_list)}")
    print(f"Sum total CO2 (Full ERs): {total_co2_full/1e6:.2f} Mt")
    print(f"Sum total CO2 (Partial ERs): {total_co2_partial/1e6:.2f} Mt")
    print(f"Sum total CO2 (Full+Partial): {total_co2_all/1e6:.2f} Mt  (expected approx 152.6 Mt)")
    print(f"Sum in-scope CO2: {total_in_scope_co2/1e6:.2f} Mt  (must be < total)")
    print(f"Sum ETS CO2 (col 37): {total_ets_co2/1e6:.2f} Mt")
    print(f"Sum in-scope CO2 vs ETS CO2 ratio: {total_in_scope_co2/total_ets_co2 if total_ets_co2 else float('nan'):.3f}")
    print(f"Sum total CH4: {total_ch4:.1f} t")

    if reconciliation_residuals:
        abs_res = sorted(abs(r) for r in reconciliation_residuals)
        n = len(abs_res)
        p50 = abs_res[n // 2]
        p95 = abs_res[int(n * 0.95)]
        p99 = abs_res[min(int(n * 0.99), n - 1)]
        print(f"\nReconciliation check: |total - (between+departed+to+atBerth)| / total")
        print(f"  n={n}, median={p50:.5f}, p95={p95:.5f}, p99={p99:.5f} (fractions, i.e. 0.01 = 1%)")

    print("\n--- Manual cross-check of 3 ships by IMO ---")
    for mc in manual_checks:
        recon = mc["total_co2_t"] - (mc["between"] + mc["departed"] + mc["to"] + mc["at_berth"])
        print(f"  IMO {mc['ship_imo']} ({mc['ship_name']}, sheet={mc['sheet']}, company={mc['company_name']}):")
        print(f"    fuel={mc['fuel_t']:.2f}t total_co2={mc['total_co2_t']:.2f}t "
              f"between={mc['between']:.2f} departed={mc['departed']:.2f} to={mc['to']:.2f} "
              f"at_berth={mc['at_berth']:.2f}  recon_residual={recon:.4f}  ch4={mc['ch4_t']:.5f}t")

    total_lng_ships = sum(c["lngShipCount"] for c in company_list)
    total_other_fuel_suspected = sum(c["otherFuelSuspectedShips"] for c in company_list)
    print(f"\nLNG-fuelled ships identified: {total_lng_ships} (threshold CH4/fuel > {LNG_CH4_PER_FUEL_THRESHOLD} t/t)")
    print(f"Ships flagged otherFuelSuspected (CO2/fuel ratio outside [{FOSSIL_RATIO_LOW},{FOSSIL_RATIO_HIGH}]): {total_other_fuel_suspected}")
    print("Example LNG-fuelled ships (imo, name, company, fuel_t, est_lng_t):")
    for ex in lng_ship_examples:
        print(f"  {ex}")

    print("\n--- Top 15 companies by in-scope CO2 ---")
    for c in company_list[:15]:
        print(f"  {c['parent_name']!r} (IMO {c['company_imo']}): "
              f"in_scope_co2={c['in_scope_co2_t']/1000:.1f} kt, total_co2={c['total_co2_t']/1000:.1f} kt, "
              f"ships={len(c['ship_imos'])}, vessels_in_scope={c['vessels_in_scope']}, "
              f"segment={c['segment']}, lngShips={c['lngShipCount']}")

    print(f"\nWrote {OUTPUT_JSON}")
    print("================================================\n")


if __name__ == "__main__":
    main()
