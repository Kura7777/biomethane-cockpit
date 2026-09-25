import json
import re
import math
import xml.etree.ElementTree as ET

# 1. Load MaStR Catalog Values for Court, Prefix, Technology, Status
kat_tree = ET.parse('scratch/mastr/Katalogwerte.xml')
kat = {c.findtext('Id'): c.findtext('Wert') for c in kat_tree.getroot() if c.findtext('Id')}

# 2. Load Operators
with open('scratch/mastr/operators.json', encoding='utf-8') as f:
    operators_raw = json.load(f)

# Format operator register ID
def format_operator_reg_id(op):
    if not op:
        return None
    court_raw = op.get('court')
    prefix_raw = op.get('prefix')
    reg_nr = op.get('regNr')
    
    court_name = kat.get(court_raw, court_raw) if court_raw else None
    prefix_name = kat.get(prefix_raw, prefix_raw) if prefix_raw else None
    
    parts = []
    if prefix_name and reg_nr:
        parts.append(f"{prefix_name} {reg_nr}")
    elif reg_nr:
        parts.append(reg_nr)
    
    if court_name:
        parts.append(f"(AG {court_name})")
        
    return " ".join(parts) if parts else None

# 3. Load Units (GasErzeuger with Technologie 825 = Biomethan-Erzeugung)
units_tree = ET.parse('scratch/mastr/EinheitenGasErzeuger.xml')
all_units = []
for elem in units_tree.getroot():
    tech = elem.findtext('Technologie')
    if tech != '825': # Only Biometan-Erzeugung
        continue
    status = elem.findtext('EinheitBetriebsstatus') # 35 = In Betrieb, 31 = In Planung
    unit_id = elem.findtext('EinheitMastrNummer')
    name = elem.findtext('NameGaserzeugungseinheit') or ''
    abr = elem.findtext('AnlagenbetreiberMastrNummer')
    town = elem.findtext('Ort') or ''
    gemeinde = elem.findtext('Gemeinde') or ''
    plz = elem.findtext('Postleitzahl') or ''
    lat_str = elem.findtext('Breitengrad')
    lon_str = elem.findtext('Laengengrad')
    cap_str = elem.findtext('Erzeugungsleistung')
    
    lat = float(lat_str) if lat_str else None
    lon = float(lon_str) if lon_str else None
    cap_kw = float(cap_str) if cap_str else None
    
    op_info = operators_raw.get(abr)
    op_name = op_info.get('name') if op_info else None
    op_reg_id = format_operator_reg_id(op_info)
    
    all_units.append({
        'unitId': unit_id,
        'name': name,
        'status': status,
        'abr': abr,
        'operatorName': op_name or (f"MaStR Operator {abr}" if abr else "Unknown Operator"),
        'operatorRegisterId': op_reg_id,
        'town': town,
        'gemeinde': gemeinde,
        'plz': plz,
        'lat': lat,
        'lon': lon,
        'capacityKw': cap_kw,
    })

print(f"Loaded {len(all_units)} MaStR biomethane units")

# 4. Load plantsData.ts and parse German plants
with open('src/domain/plants/plantsData.ts', encoding='utf-8') as f:
    ts_content = f.read()

# Parse JSON array RAW_BIOMETHANE_PLANTS
match = re.search(r'export const RAW_BIOMETHANE_PLANTS: BiomethanePlant\[\] = (\[[\s\S]*?\n\]);', ts_content)
if not match:
    raise ValueError("Could not find RAW_BIOMETHANE_PLANTS in plantsData.ts")

raw_plants = json.loads(match.group(1))
de_plants = [p for p in raw_plants if p.get('countryCode') == 'DE']
print(f"Loaded {len(de_plants)} German plants from plantsData.ts")

# Count coordinate frequencies to detect centroid placeholders (shared by >= 5 plants)
coord_counts = {}
for p in raw_plants:
    coords = p.get('coordinates')
    if coords and len(coords) == 2:
        k = f"{coords[0]:.4f},{coords[1]:.4f}"
        coord_counts[k] = coord_counts.get(k, 0) + 1

def is_approximate_coords(coords):
    if not coords or len(coords) != 2:
        return True
    k = f"{coords[0]:.4f},{coords[1]:.4f}"
    return coord_counts.get(k, 0) >= 5

# Haversine distance in km
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# Distinctive words helper
STOP_WORDS = set(['gmbh', 'biogas', 'bioenergie', 'energie', 'anlage', 'biomethan', 'biomethananlage', 'holding', 'und', 'der', 'die', 'das', 'ag', 'co', 'kg', 'mbh', 'germany', 'deutschland'])
def norm_words(s):
    if not s:
        return set()
    cleaned = re.sub(r'[^a-zA-Z0-9äöüÄÖÜß]+', ' ', s.lower())
    cleaned = cleaned.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    return set(w for w in cleaned.split() if len(w) >= 4 and w not in STOP_WORDS)

def norm_str(s):
    if not s:
        return ""
    cleaned = re.sub(r'[^a-zA-Z0-9äöüÄÖÜß]+', ' ', s.lower())
    return cleaned.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss').strip()

# 5. Matching Algorithm
matches_out = []
matched_count = 0
ambiguous_count = 0
no_match_count = 0
centroid_plants_matched = 0

for plant in de_plants:
    plant_id = plant['id']
    plant_name = plant.get('name') or ''
    p_status = plant.get('status', 'Active')
    p_coords = plant.get('coordinates')
    p_approx = is_approximate_coords(p_coords)
    p_cap_nm3h = plant.get('capacityNm3h') or 0
    p_op = plant.get('operator') or ''
    p_legal = plant.get('legalEntityName') or ''
    
    # Filter candidate units by operating status
    # 35 = In Betrieb, 31 = In Planung
    valid_status = {'35'}
    if p_status == 'Planned':
        valid_status.add('31')
        
    candidates_scored = []
    
    norm_p_name = norm_str(plant_name)
    p_op_words = norm_words(p_op) | norm_words(p_legal)
    
    for u in all_units:
        if u['status'] not in valid_status and u['status'] != '35':
            continue
            
        score = 0
        evidence = []
        
        # 1. Distance check (only if coordinates are NOT approximate placeholders)
        dist_km = None
        if not p_approx and p_coords and u['lat'] and u['lon']:
            dist_km = haversine(p_coords[0], p_coords[1], u['lat'], u['lon'])
            if dist_km <= 2.0:
                score += 55
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
            elif dist_km <= 5.0:
                score += 45
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
            elif dist_km <= 12.0:
                score += 25
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
            elif dist_km <= 25.0:
                score += 10
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
                
        # 2. Town / Municipality check
        norm_u_town = norm_str(u['town'])
        norm_u_gem = norm_str(u['gemeinde'])
        norm_u_name = norm_str(u['name'])
        
        if norm_p_name and norm_u_town and (norm_p_name == norm_u_town or norm_p_name in norm_u_town or norm_u_town in norm_p_name):
            score += 40
            evidence.append(f"same town: {u['town']}")
        elif norm_p_name and norm_u_gem and (norm_p_name == norm_u_gem or norm_p_name in norm_u_gem or norm_u_gem in norm_p_name):
            score += 30
            evidence.append(f"same municipality: {u['gemeinde']}")
        elif norm_p_name and norm_p_name in norm_u_name:
            score += 25
            evidence.append(f"unit name mentions town: '{u['name']}'")
            
        # 3. Capacity consistency (Nm3/h * 10 ~ kW)
        if p_cap_nm3h > 0 and u['capacityKw']:
            exp_kw = p_cap_nm3h * 10.0
            ratio = u['capacityKw'] / exp_kw
            if 0.75 <= ratio <= 1.35:
                score += 25
                evidence.append(f"capacity matches: {p_cap_nm3h} Nm³/h ≈ {u['capacityKw']:.0f} kW (ratio {ratio:.2f})")
            elif 0.50 <= ratio <= 1.80:
                score += 12
                evidence.append(f"capacity plausible: {p_cap_nm3h} Nm³/h vs {u['capacityKw']:.0f} kW")
                
        # 4. Operator name overlap
        u_op_words = norm_words(u['operatorName']) | norm_words(u['name'])
        shared_words = p_op_words & u_op_words
        if shared_words:
            score += 30
            evidence.append(f"operator word overlap: {', '.join(sorted(shared_words))}")
            
        if score >= 35:
            cand = {
                'operatorName': u['operatorName'],
                'operatorRegisterId': u['operatorRegisterId'],
                'unitId': u['unitId'],
                'town': u['town'],
                'coordinates': [u['lat'], u['lon']] if u['lat'] and u['lon'] else None,
                'capacity': f"{u['capacityKw']:.0f} kW" if u['capacityKw'] else None,
                'evidence': evidence,
                '_score': score,
                '_unitName': u['name'],
                '_dist': dist_km,
            }
            candidates_scored.append(cand)
            
    # Sort candidates by score descending
    candidates_scored.sort(key=lambda x: x['_score'], reverse=True)
    
    # Decide MATCHED / AMBIGUOUS / NO_MATCH
    status = 'NO_MATCH'
    best = None
    top_candidates = []
    
    if len(candidates_scored) == 1:
        if candidates_scored[0]['_score'] >= 45:
            status = 'MATCHED'
            best = candidates_scored[0]
        else:
            status = 'NO_MATCH'
    elif len(candidates_scored) > 1:
        top1 = candidates_scored[0]
        top2 = candidates_scored[1]
        # Clear winner check
        if top1['_score'] >= 50 and (top1['_score'] - top2['_score'] >= 20):
            status = 'MATCHED'
            best = top1
        else:
            # Ambiguous
            status = 'AMBIGUOUS'
            top_candidates = candidates_scored[:3]
            
    # Strip internal score keys from output candidates
    if best:
        best_cleaned = {k: v for k, v in best.items() if not k.startswith('_')}
        matched_count += 1
        if p_approx:
            centroid_plants_matched += 1
    else:
        best_cleaned = None
        
    cands_cleaned = [{k: v for k, v in c.items() if not k.startswith('_')} for c in top_candidates]
    if status == 'AMBIGUOUS':
        ambiguous_count += 1
    elif status == 'NO_MATCH':
        no_match_count += 1
        
    matches_out.append({
        'plantId': plant_id,
        'plantName': plant_name,
        'status': status,
        'best': best_cleaned,
        'candidates': cands_cleaned,
    })

# Check for duplicate plant matches
unit_to_plants = {}
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('unitId'):
        uid = m['best']['unitId']
        unit_to_plants.setdefault(uid, []).append(m['plantId'])

duplicate_count = 0
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('unitId'):
        uid = m['best']['unitId']
        other_plants = [pid for pid in unit_to_plants[uid] if pid != m['plantId']]
        if other_plants:
            duplicate_count += 1
            m['best']['evidence'].append(f"matched to same MaStR unit as {', '.join(other_plants)} (duplicate census record)")

print(f"\n=== MATCHING SUMMARY ===")
print(f"Total German Plants: {len(de_plants)}")
print(f"MATCHED:    {matched_count} (including {duplicate_count} duplicate census records)")
print(f"AMBIGUOUS:  {ambiguous_count}")
print(f"NO_MATCH:   {no_match_count}")
print(f"Centroid placeholder plants that matched: {centroid_plants_matched}")

# Write to data/registration_matches/de.json
out_data = {
    "countryCode": "DE",
    "source": "Bundesnetzagentur Marktstammdatenregister (Gesamtdatenexport 2026-09-25 26.1)",
    "checkedAt": "2026-09-26",
    "results": matches_out
}

import os
os.makedirs('data/registration_matches', exist_ok=True)
with open('data/registration_matches/de.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)

print("Saved matches to data/registration_matches/de.json")

