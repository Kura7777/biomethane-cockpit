"""
Builds src/domain/ets1/installationsData.generated.ts from three public sources:

1. European Commission, Union Registry "verified emissions 2025" workbook
   (verified_emissions_2025_en.xlsx, published 09/04/2026, data extracted 01/04/2026)
   https://climate.ec.europa.eu/document/download/53018483-62b3-499e-9ab9-b4a831cc44f4_en?filename=verified_emissions_2025_en.xlsx
   Per stationary installation: account holder (operator), name, main activity code, verified
   emissions 2025 and 2024, and free allocation (ALLOCATION_2025 = Art 10a(1) free allocation,
   ALLOCATION_RESERVE_2025 = new-entrant reserve, Art 10a(7)).
2. EUETS.INFO release of May 2024 (eutl_2024_202405.zip, Jan Abrell; EUTL version 13.12),
   https://euets-info-public.s3.eu-central-1.amazonaws.com/eutl_2024_202405.zip
   (The October 2024 release, eutl_2024_202410.zip, has the parentCompany column overwritten with
   the permit start year, so it is not used.)
   Only for fields the Commission workbook lacks: parent company, NACE code, city. Joined on the
   installation id (registry code + installation identifier). Installations first registered after
   that release have no parent company or NACE code.
3. European Commission operator list (policy_ets_registry_operators_ets_en.xlsx, 04/2024): the operator
   (account holder) name, and the city of installations missing from EUETS.INFO.

EUETS.INFO has no release after October 2024 (verified 2023 at best), which is why the verified
emissions and allocation come from the Commission workbook.

Usage:  python scripts/build_ets1_installations.py verified_emissions_2025_en.xlsx eutl_2024_202405.zip policy_ets_registry_operators_ets_en.xlsx

Scope: stationary installations in the EU ETS (not aircraft or maritime operators), EU/EEA
countries (GB excluded, it left the EU ETS in 2021), with verified emissions > 0 in the latest
year. Each row keeps the operator (account holder), parent company (where known), location, activity and NACE
codes, verified emissions for the latest two years and free allocation for the latest year.

Nothing is estimated here: the EUTL does not split emissions by fuel, so gas use is NOT
derived. The sector / biomethane-fit grouping is done in the app, from the NACE and
activity codes, and labelled as a heuristic.
"""

import csv
import datetime
import io
import json
import sys
import zipfile

import openpyxl

OUT = 'src/domain/ets1/installationsData.generated.ts'
VE_URL = 'https://climate.ec.europa.eu/document/download/53018483-62b3-499e-9ab9-b4a831cc44f4_en?filename=verified_emissions_2025_en.xlsx'
EUETS_INFO_URL = 'https://euets-info-public.s3.eu-central-1.amazonaws.com/eutl_2024_202405.zip'


def num(v):
    """Numeric cell or None ('n/a' and 'Excluded' mean no figure)."""
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def read_ve(path: str):
    wb = openpyxl.load_workbook(path, read_only=True)
    extraction = next(iter(wb['Read Me'].iter_rows(values_only=True)))[1]
    rows = list(wb['data'].iter_rows(values_only=True))
    hdr = rows[2]
    return extraction, [dict(zip(hdr, r)) for r in rows[3:] if r[0]]


def main(ve_path: str, zip_path: str, ops_path: str) -> None:
    extraction, ve = read_ve(ve_path)
    z = zipfile.ZipFile(zip_path)
    info = {
        r['id']: r
        for r in csv.DictReader(io.TextIOWrapper(z.open('installation.csv'), encoding='utf-8'))
    }

    # Commission operator list: account holder name (the legal operator) and city per installation.
    ops_city: dict[str, str] = {}
    ops_holder: dict[str, str] = {}
    ops_rows = openpyxl.load_workbook(ops_path, read_only=True)['data'].iter_rows(values_only=True)
    next(ops_rows)
    for r in ops_rows:
        if not (r[3] and r[4] is not None):
            continue
        key = f'{r[3]}_{int(r[4])}'
        if r[0]:
            ops_holder[key] = str(r[0]).strip()
        if r[11]:
            ops_city[key] = str(r[11]).strip()

    # EUETS.INFO account holders, the fallback for installations missing from the operator list.
    holders = {
        r['id']: r['name']
        for r in csv.DictReader(io.TextIOWrapper(z.open('account_holder.csv'), encoding='utf-8'))
    }
    info_holder: dict[str, tuple] = {}
    for r in csv.DictReader(io.TextIOWrapper(z.open('account.csv'), encoding='utf-8')):
        iid = r['installation_id']
        if r['accountType_id'] != '100-7':
            continue
        name = holders.get((r['accountHolder_id'] or '').split('.')[0], '') or r['name']
        key = (r['isOpen'] == 'True', r['openingDate'] or '', name)
        if iid not in info_holder or key > info_holder[iid]:
            info_holder[iid] = key

    # NOTE: the workbook's header labels are shifted for the first columns. Column
    # IDENTIFIER_IN_REG holds the registry ACCOUNT name (in Germany often "1624 - Anlagenkonto",
    # not a company), INSTALLATION_NAME the installation name and INSTALLATION_IDENTIFIER the
    # registry id. The operator is therefore taken from the operator list, then EUETS.INFO, and
    # only then from the account name.
    latest, previous = 2025, 2024
    rows = []
    stand_in = []  # open installations with no latest-year figure yet: previous year stands in
    for d in ve:
        if d['ACCOUNT_TYPE'] != 'OPERATOR HOLDING ACCOUNT' or d['REGISTRY_CODE'] == 'GB':
            continue
        v = num(d[f'VERIFIED_EMISSIONS_{latest}'])
        prev = num(d[f'VERIFIED_EMISSIONS_{previous}'])
        prior = 0
        if not v or v <= 0:
            # The extract (01/04/2026) predates many national verification uploads (Denmark 5%,
            # Bulgaria 30%, Poland 70% of 2024 tonnage present). An OPEN installation with n/a for
            # the latest year and a positive previous year has not reported yet, so the previous
            # year stands in and the row is flagged. 'Excluded' or a closed account is left out.
            raw = d[f'VERIFIED_EMISSIONS_{latest}']
            if not (raw in (None, 'n/a') and prev and prev > 0 and d['ACCOUNT_CLOSURE'] == 'OPEN'):
                continue
            v, prev, prior = prev, num(d[f'VERIFIED_EMISSIONS_{previous - 1}']), 1
            stand_in.append(v)
        iid = f"{d['REGISTRY_CODE']}_{d['INSTALLATION_IDENTIFIER']}"
        inst = info.get(iid)
        if inst and (inst['isAircraftOperator'] == 'True' or inst['isMaritimeOperator'] == 'True'):
            continue
        # Free allocation, latest year: Art 10a(1) allocation plus the new-entrant reserve
        # (Art 10a(7)). Art 10c (transitional, modernisation of electricity) and the
        # Iceland / FEETS columns are not part of it and are zero for 2025 anyway.
        # n/a in every summed column means unknown (null), 0 means none allocated.
        parts = [num(d[f'ALLOCATION_{latest}']), num(d[f'ALLOCATION_RESERVE_{latest}'])]
        alloc = None if all(p is None for p in parts) else round(sum(p for p in parts if p is not None))
        parent = (inst['parentCompany'] or '').strip() if inst else ''
        if parent == '-':
            parent = ''
        city = ((inst['city'] or '').strip() if inst else '')
        if city == '-':
            city = ''
        city = city or ops_city.get(iid, '')
        operator = ops_holder.get(iid) or (info_holder[iid][2].strip() if iid in info_holder else '') or str(d['IDENTIFIER_IN_REG'] or '').strip()
        act = d['MAIN_ACTIVITY_TYPE_CODE']
        rows.append([
            iid,
            str(d['INSTALLATION_NAME'] or '').strip(),
            operator,
            parent,
            d['REGISTRY_CODE'],
            city,
            int(act) if isinstance(act, (int, float)) else None,
            (inst['nace_id'] or '') if inst else '',
            round(v),
            round(prev) if prev is not None else None,
            alloc,
            prior,
        ])

    rows.sort(key=lambda r: -r[8])
    n_alloc = sum(1 for r in rows if r[10] is not None)
    n_nace = sum(1 for r in rows if r[7])
    header = (
        '/**\n'
        ' * GENERATED by scripts/build_ets1_installations.py — do not hand-edit.\n'
        ' * Source: European Commission Union Registry verified_emissions_2025_en.xlsx (published 09/04/2026,\n'
        f' * data extracted {extraction:%d/%m/%Y}), {VE_URL}\n'
        ' * Parent company, NACE code and city: EUETS.INFO release May 2024 (eutl_2024_202405.zip, EUTL 13.12),\n'
        f' * {EUETS_INFO_URL}, joined on installation id; blank for installations registered since.\n'
        f' * Stationary EU ETS installations with verified emissions > 0 in {latest} (or, if not yet reported, {previous}): {len(rows)} rows,\n'
        f' * NOTE: the {extraction:%d/%m/%Y} extract is not complete for {latest}: {len(stand_in)} open installations ({sum(stand_in) / 1e6:.1f} Mt,\n'
        f' * mostly PL, DK, FR, BG) have not reported yet. Their {previous} figure stands in as verifiedLatest, their {previous - 1} figure as\n'
        ' * verifiedPrevious, and priorYear = 1. Regenerate from a later extract to replace them.\n'
        f' * {n_alloc} with a free-allocation figure, {n_nace} with a NACE code. Generated {datetime.date.today()}.\n'
        ' * Row: [id, name, operator, parentCompany, country, city, activityId, nace, verifiedLatest, verifiedPrevious, freeAllocLatest, priorYear]\n'
        ' */\n'
    )
    body = (
        f'export const ETS1_LATEST_YEAR = {latest};\n'
        f'export const ETS1_PREVIOUS_YEAR = {previous};\n'
        f"export const ETS1_SOURCE_URL = '{VE_URL}';\n"
        'export type Ets1InstallationRow = [string, string, string, string, string, string, number | null, string, number, number | null, number | null, 0 | 1];\n'
        'export const ETS1_INSTALLATION_ROWS: Ets1InstallationRow[] = '
        # '?' only occurs inside strings here; escaping it keeps garbled source names ("??")
        # from looking like code to the architecture guards.
        + json.dumps(rows, ensure_ascii=False, separators=(',', ':')).replace('?', '\\u003f')
        + ';\n'
    )
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(header + body)
    print(f'{len(rows)} installations, latest year {latest}, {n_alloc} with allocation, {n_nace} with NACE, written to {OUT}')


if __name__ == '__main__':
    main(*sys.argv[1:4])
