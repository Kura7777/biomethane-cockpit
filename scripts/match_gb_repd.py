import csv
import json
import re
import math
import os

import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from scripts.lib.osgb36 import osgb36_to_wgs84

# 1. Load UK REPD AD units
ad_units = []
with open('scratch/uk_repd_2026.csv', encoding='utf-8', errors='ignore') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        if len(row) <= 29:
            continue
        tech = row[5].strip()
        status = row[20].strip()
        if 'anaerobic digestion' in tech.lower() and status in ['Operational', 'Under Construction']:
            east_str = row[28].strip()
            north_str = row[29].strip()
            lat, lon = None, None
            try:
                if east_str and north_str:
                    e = float(east_str)
                    n = float(north_str)
                    if e > 1000 and n > 1000:
                        lat, lon = osgb36_to_wgs84(e, n)
            except Exception:
                pass
                
            ad_units.append({
                'refId': row[1].strip(),
                'operator': row[3].strip(),
                'siteName': row[4].strip(),
                'status': status,
                'capMWelec': row[8].strip(),
                'address': row[23].strip(),
                'county': row[24].strip(),
                'region': row[25].strip(),
                'country': row[26].strip(),
                'postcode': row[27].strip(),
                'lat': lat,
                'lon': lon,
                'planningRef': row[31].strip() if len(row) > 31 else '',
            })

print(f"Loaded {len(ad_units)} operational UK AD units from REPD")

# 2. Load plantsData.ts
with open('src/domain/plants/plantsData.ts', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'export const RAW_BIOMETHANE_PLANTS: BiomethanePlant\[\] = (\[[\s\S]*?\n\]);', c)
plants = json.loads(m.group(1))
gb_plants = [p for p in plants if p.get('countryCode') in ['GB', 'UK']]
print(f"Loaded {len(gb_plants)} UK plants from plantsData.ts")

# Coordinate frequency to detect placeholder centroids
coord_counts = {}
for p in plants:
    coords = p.get('coordinates')
    if coords and len(coords) == 2:
        k = f"{coords[0]:.4f},{coords[1]:.4f}"
        coord_counts[k] = coord_counts.get(k, 0) + 1

def is_approximate(coords):
    if not coords or len(coords) != 2:
        return True
    k = f"{coords[0]:.4f},{coords[1]:.4f}"
    return coord_counts.get(k, 0) >= 5

def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

def norm(s):
    if not s: return ""
    return re.sub(r'[^a-zA-Z0-9]+', ' ', s.lower()).strip()

STOP_WORDS = set(['ltd', 'limited', 'ad', 'plant', 'farm', 'biogas', 'bioenergy', 'uk', 'renewables', 'green', 'power'])
def words(s):
    return set(w for w in norm(s).split() if len(w) >= 4 and w not in STOP_WORDS)

matches_out = []
matched_count = 0
ambiguous_count = 0
no_match_count = 0
centroid_plants_matched = 0

for plant in gb_plants:
    p_id = plant['id']
    p_name = plant.get('name') or ''
    p_coords = plant.get('coordinates')
    p_approx = is_approximate(p_coords)
    p_cap_nm3h = plant.get('capacityNm3h') or 0
    p_op = plant.get('operator') or ''
    
    parts = [norm(x) for x in p_name.split(',')]
    p_town = parts[0]
    p_county = parts[1] if len(parts) > 1 else None
    p_words = words(p_name) | words(p_op)
    
    candidates_scored = []
    
    for u in ad_units:
        score = 0
        evidence = []
        
        # 1. Distance check (ONLY if NOT centroid placeholder)
        dist_km = None
        if not p_approx and p_coords and u['lat'] and u['lon']:
            dist_km = haversine(p_coords[0], p_coords[1], u['lat'], u['lon'])
            if dist_km <= 3.0:
                score += 55
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
            elif dist_km <= 10.0:
                score += 35
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
            elif dist_km <= 25.0:
                score += 15
                evidence.append(f"{dist_km:.1f} km from plant coordinates")
                
        # 2. Town / Site name match
        u_site = norm(u['siteName'])
        u_addr = norm(u['address'])
        u_county = norm(u['county'])
        
        if p_town and (p_town in u_site or p_town in u_addr):
            score += 50
            evidence.append(f"site/town match: '{p_town}' in {u['siteName']}")
        elif p_words & words(u['siteName']):
            shared = p_words & words(u['siteName'])
            score += 35
            evidence.append(f"site name overlap: {', '.join(sorted(shared))}")
            
        # 3. County match
        if p_county and (p_county in u_county or p_county in u_addr):
            score += 25
            evidence.append(f"county match: {u['county']}")
            
        # 4. Operator word overlap
        shared_op = p_words & words(u['operator'])
        if shared_op:
            score += 30
            evidence.append(f"operator word overlap: {', '.join(sorted(shared_op))}")
            
        # 5. Capacity consistency
        if u['capMWelec']:
            evidence.append(f"capacity: {u['capMWelec']} MWelec")
            
        if u['postcode']:
            evidence.append(f"Postcode: {u['postcode']}")
            
        if score >= 35:
            candidates_scored.append({
                '_u': u,
                '_score': score,
                '_dist': dist_km,
                'evidence': evidence,
            })
            
    candidates_scored.sort(key=lambda x: x['_score'], reverse=True)
    
    status = 'NO_MATCH'
    best_cand = None
    top_candidates = []
    
    if len(candidates_scored) == 1:
        if candidates_scored[0]['_score'] >= 40:
            status = 'MATCHED'
            best_cand = candidates_scored[0]
    elif len(candidates_scored) > 1:
        top1 = candidates_scored[0]
        top2 = candidates_scored[1]
        if top1['_score'] >= 50 and (top1['_score'] - top2['_score'] >= 15):
            status = 'MATCHED'
            best_cand = top1
        else:
            status = 'AMBIGUOUS'
            top_candidates = candidates_scored[:3]

            
    def format_cand(c):
        u = c['_u']
        ref = u['refId']
        op_name = u['operator'] if u['operator'] else f"REPD Operator ({u['siteName']})"
        reg_id = f"REPD Ref #{ref}"
        coords = [round(u['lat'], 5), round(u['lon'], 5)] if u['lat'] and u['lon'] else None
        
        evidence = list(c['evidence'])
        evidence.append("REPD lists an anaerobic-digestion project here; confirm it is the biomethane operator")
        
        return {
            'operatorName': op_name,
            'operatorRegisterId': reg_id,
            'unitId': f"REPD_{ref}",
            'idLabel': 'REPD reference',
            'nameLabel': 'REPD operator/applicant',
            'town': u['county'] or u['siteName'],
            'coordinates': coords,
            'capacity': f"{u['capMWelec']} MWelec" if u['capMWelec'] else None,
            'evidence': evidence,
            '_refId': ref
        }
        
    best_cleaned = format_cand(best_cand) if best_cand else None
    cands_cleaned = [format_cand(c) for c in top_candidates]
    
    if status == 'MATCHED':
        matched_count += 1
        if p_approx: centroid_plants_matched += 1
    elif status == 'AMBIGUOUS':
        ambiguous_count += 1
    else:
        no_match_count += 1
        
    matches_out.append({
        'plantId': p_id,
        'plantName': p_name,
        'status': status,
        'best': best_cleaned,
        'candidates': cands_cleaned,
    })

# Check duplicate plant matches
ref_to_plants = {}
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('_refId'):
        ref = m['best']['_refId']
        ref_to_plants.setdefault(ref, []).append(m['plantId'])

dup_count = 0
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best']:
        ref = m['best'].pop('_refId', None)
        if ref:
            others = [pid for pid in ref_to_plants.get(ref, []) if pid != m['plantId']]
            if others:
                dup_count += 1
                m['best']['evidence'].append(f"matched to same REPD unit as {', '.join(others)} (duplicate census record)")
    if m.get('candidates'):
        for c in m['candidates']:
            c.pop('_refId', None)

print(f"\n=== UK REPD MATCHING SUMMARY ===")
print(f"Total UK Plants: {len(gb_plants)}")
print(f"MATCHED:    {matched_count} (including {dup_count} duplicate census records)")
print(f"AMBIGUOUS:  {ambiguous_count}")
print(f"NO_MATCH:   {no_match_count}")
print(f"Centroid placeholder plants that matched: {centroid_plants_matched}")

out_data = {
    "countryCode": "GB",
    "matchKind": "PROJECT_DATABASE",
    "source": "UK Department for Energy Security and Net Zero (DESNZ) Renewable Energy Planning Database (REPD Q2 2026)",
    "checkedAt": "2026-09-26",
    "results": matches_out
}

os.makedirs('data/registration_matches', exist_ok=True)
with open('data/registration_matches/gb.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)

print("Saved UK matches to data/registration_matches/gb.json")
