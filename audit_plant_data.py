import zipfile, xml.etree.ElementTree as ET, json

xlsx_path = 'European Biomethane Plants - Complete Pan-European Registry (All 1,975+ Facilities).xlsx'
z = zipfile.ZipFile(xlsx_path)

# 1. Parse original Excel shared strings and rows
strings = []
if 'xl/sharedStrings.xml' in z.namelist():
    ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
    ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
    for si in ss_tree.findall('.//main:si', ns):
        text = ''.join(t.text for t in si.findall('.//main:t', ns) if t.text)
        strings.append(text)

sheet_xml = 'xl/worksheets/sheet1.xml'
s_tree = ET.fromstring(z.read(sheet_xml))
rows = s_tree.findall('.//main:row', ns)

raw_rows = []
for r in rows[1:]:
    cols = []
    for c in r.findall('main:c', ns):
        v = c.find('main:v', ns)
        t = c.attrib.get('t')
        val = ''
        if v is not None and v.text:
            val = strings[int(v.text)] if t == 's' and int(v.text) < len(strings) else v.text
        cols.append(val)
    if cols and cols[0]:
        raw_rows.append(cols)

print(f'=== AUDIT REPORT: BIOMETHANE PLANT DATA ACCURACY ===')
print(f'1. Total records in source Excel sheet: {len(raw_rows)}')

# 2. Check registry.ts
with open('src/domain/plants/registry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Extract BIOMETHANE_PLANTS JSON
start_idx = content.find('export const BIOMETHANE_PLANTS: BiomethanePlant[] = ') + len('export const BIOMETHANE_PLANTS: BiomethanePlant[] = ')
end_idx = content.find(';\n\nexport const DEVELOPER_PORTFOLIOS')
plants_json = content[start_idx:end_idx].strip()

plants = json.loads(plants_json)
print(f'2. Total records in TypeScript registry: {len(plants)}')

# 3. Check for any missing or mismatching records
mismatches = 0
encoding_issues = 0
coord_issues = 0

# European Country Lat/Long Bounding Boxes (approx)
country_bounds = {
    'FR': (-5.0, 9.5, 41.0, 51.5),
    'DE': (5.8, 15.2, 47.2, 55.1),
    'IT': (6.5, 18.6, 36.5, 47.1),
    'GB': (-8.5, 1.8, 49.8, 60.0),
    'NL': (3.3, 7.3, 50.7, 53.6),
    'DK': (8.0, 15.2, 54.5, 57.8),
    'ES': (-9.5, 3.4, 36.0, 43.8),
    'SE': (11.0, 24.2, 55.3, 69.1),
    'AT': (9.5, 17.2, 46.3, 49.1),
    'BE': (2.5, 6.4, 49.5, 51.5),
    'CH': (5.9, 10.5, 45.8, 47.9),
    'PL': (14.1, 24.2, 49.0, 54.9),
    'FI': (20.5, 31.6, 59.7, 70.1),
    'NO': (4.5, 31.1, 57.9, 71.2),
    'CZ': (12.1, 18.9, 48.5, 51.1),
    'PT': (-9.6, -6.1, 36.9, 42.2),
    'EE': (21.7, 28.3, 57.5, 59.7),
    'LV': (20.9, 28.3, 55.6, 58.1),
    'LT': (20.9, 26.9, 53.9, 56.5),
    'UA': (22.1, 40.2, 44.3, 52.4),
    'SK': (16.8, 22.6, 47.7, 49.7),
    'HU': (16.1, 22.9, 45.7, 48.6),
    'IE': (-10.7, -5.9, 51.4, 55.4),
    'RO': (20.2, 29.7, 43.6, 48.3),
    'BG': (22.3, 28.7, 41.2, 44.3),
    'HR': (13.4, 19.5, 42.3, 46.6),
    'SI': (13.3, 16.6, 45.4, 46.9),
    'GR': (19.3, 28.3, 34.8, 41.8),
    'LU': (5.7, 6.6, 49.4, 50.2),
}

for idx, (raw, p) in enumerate(zip(raw_rows, plants)):
    raw_id = raw[0].strip()
    raw_country = raw[1].strip() if len(raw) > 1 else ''
    raw_name = raw[2].strip() if len(raw) > 2 else ''
    
    # Check ID match
    if raw_id not in p['name'] and raw_id not in p['id']:
        mismatches += 1
        if mismatches <= 5:
            print(f"  [MISMATCH] Row {idx}: Source ID {raw_id} vs App {p['name']}")
            
    # Check for replacement character artifacts
    for field_val in [p['name'], p['operator'], p['networkOperator'], p['certificationAndRegistry'], p['upgradingTechnology']]:
        if '' in field_val:
            encoding_issues += 1
            if encoding_issues <= 5:
                print(f"  [ENCODING ARTIFACT] Row {idx} ({p['id']}): {field_val}")

print(f'3. Exact ID / Row Mismatches: {mismatches} (Target: 0)')
print(f'4. Encoding / Character Artifacts: {encoding_issues}')

# Check for duplicate IDs
ids = [p['id'] for p in plants]
unique_ids = set(ids)
print(f'5. Unique ID verification: {len(unique_ids)} / {len(ids)} unique IDs')

# Check coordinates
print('\n6. Checking Coordinates against Country Geography...')
for p in plants:
    iso = p['countryCode']
    if iso in country_bounds and p.get('coordinates'):
        min_lon, max_lon, min_lat, max_lat = country_bounds[iso]
        lon, lat = p['coordinates']
        if not (min_lon - 2.0 <= lon <= max_lon + 2.0 and min_lat - 2.0 <= lat <= max_lat + 2.0):
            coord_issues += 1

print(f'   Coordinate bounding check issues: {coord_issues}')

# Summary of categories
feedstocks = {}
for p in plants:
    cat = p['primaryFeedstockCategory']
    feedstocks[cat] = feedstocks.get(cat, 0) + 1

print('\n7. Feedstock Category Breakdown:')
for k, v in sorted(feedstocks.items(), key=lambda x: x[1], reverse=True)[:6]:
    print(f'   - {k}: {v} plants')

techs = {}
for p in plants:
    t = p['upgradingTechnology']
    techs[t] = techs.get(t, 0) + 1

print('\n8. Upgrading Technology Breakdown:')
for k, v in sorted(techs.items(), key=lambda x: x[1], reverse=True)[:6]:
    print(f'   - {k}: {v} plants')
