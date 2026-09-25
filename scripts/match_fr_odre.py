import json
import re
import math
import os

with open('scratch/odre/points_injection.json', encoding='utf-8') as f:
    odre_points = json.load(f)
print(f"Loaded {len(odre_points)} ODRE injection points")

with open('src/domain/plants/plantsData.ts', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'export const RAW_BIOMETHANE_PLANTS: BiomethanePlant\[\] = (\[[\s\S]*?\n\]);', c)
plants = json.loads(m.group(1))
fr_plants = [p for p in plants if p.get('countryCode') == 'FR']
print(f"Loaded {len(fr_plants)} French plants from plantsData.ts")

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

def norm_txt(s):
    if not s: return ""
    cleaned = re.sub(r'[^a-zA-Z0-9]+', ' ', s.lower())
    for fr, to in [('é','e'),('è','e'),('ê','e'),('ë','e'),('à','a'),('â','a'),('î','i'),('ï','i'),('ô','o'),('ö','o'),('ù','u'),('û','u'),('ü','u'),('ç','c')]:
        cleaned = cleaned.replace(fr, to)
    return cleaned.strip()

LEGAL_KEYWORDS = ['sas', 'sarl', 'earl', 'gaec', 'scea', 'biogaz', 'metha', 'energie', 'energies', 'gaz', 'bio', 'environ', 'waga', 'engie', 'total', 'suez', 'veolia', 'air liquide']

def extract_operator_name(proj_name, commune):
    s = re.sub(r'\s*-\s*\d{4}-\d{2}-\d+.*$', '', proj_name)
    s = re.sub(r'\s*-\s*\d{2}$', '', s)
    s = re.sub(r'\s*\(\d{2,3}\)\s*$', '', s)
    s = re.sub(r'^(STEP\s*(DE\s*)?|STEU\s*|ISDND\s*)', '', s)
    s = re.sub(r'^[A-Z]{3}\d+_[A-Za-z0-9\s]+[\s_]', '', s)
    s = re.sub(r'^(EST|OUEST|NORD|SUD|IDF|CEN|NOO|BFC|GES|NAQ|OCC|ARA|NOR|BRE|HDF|PDL|CVL)\s*[-_]\s*', '', s)
    
    parts = [p.strip() for p in re.split(r'\s*[-_]\s*', s) if len(p.strip()) >= 2]
    norm_comm = norm_txt(commune)
    
    ranked_parts = []
    for p in parts:
        np = norm_txt(p)
        if np == norm_comm or np in norm_comm:
            continue
        score = 0
        for kw in LEGAL_KEYWORDS:
            if kw in np:
                score += 10
        ranked_parts.append((score, p))
        
    ranked_parts.sort(key=lambda x: x[0], reverse=True)
    if ranked_parts and ranked_parts[0][0] > 0:
        return ranked_parts[0][1]
    if parts:
        for p in parts:
            if norm_txt(p) != norm_comm:
                return p
        return parts[0]
    return s.strip()

matches_out = []
matched_count = 0
ambiguous_count = 0
no_match_count = 0
centroid_plants_matched = 0

for plant in fr_plants:
    p_id = plant['id']
    p_name = plant.get('name') or ''
    p_coords = plant.get('coordinates')
    p_approx = is_approximate(p_coords)
    p_cap_gwh = plant.get('annualEnergyGWh') or 0
    p_op = plant.get('operator') or ''
    norm_p_name = norm_txt(p_name)
    norm_p_op = norm_txt(p_op)
    
    candidates_scored = []
    
    for pt in odre_points:
        coords = pt.get('coordonnees')
        if not coords or not coords.get('lat') or not coords.get('lon'):
            continue
            
        score = 0
        evidence = []
        
        # 1. Distance check (only if coordinates are NOT approximate placeholders)
        dist_km = None
        if not p_approx and p_coords:
            dist_km = haversine(p_coords[0], p_coords[1], coords['lat'], coords['lon'])
            if dist_km <= 1.0:
                score += 65
                evidence.append(f"{dist_km:.2f} km from ODRE injection point")
            elif dist_km <= 3.0:
                score += 50
                evidence.append(f"{dist_km:.2f} km from ODRE injection point")
            elif dist_km <= 8.0:
                score += 25
                evidence.append(f"{dist_km:.2f} km from ODRE injection point")
            elif dist_km <= 20.0:
                score += 10
                evidence.append(f"{dist_km:.2f} km from ODRE injection point")
                
        # 2. Commune match
        comm = pt.get('commune') or ''
        norm_comm = norm_txt(comm)
        if norm_comm and (norm_comm == norm_p_name or norm_comm in norm_p_name or norm_p_name in norm_comm):
            score += 35
            evidence.append(f"same commune: {comm}")
            
        # 3. Capacity consistency (GWh/an)
        pt_cap_gwh = pt.get('capacite_de_production_gwh_an') or 0
        if p_cap_gwh > 0 and pt_cap_gwh > 0:
            ratio = pt_cap_gwh / p_cap_gwh
            if 0.70 <= ratio <= 1.40:
                score += 20
                evidence.append(f"capacity matches: {p_cap_gwh:.1f} GWh/yr ≈ {pt_cap_gwh:.1f} GWh/yr (ratio {ratio:.2f})")
            elif 0.50 <= ratio <= 2.00:
                score += 10
                evidence.append(f"capacity plausible: {p_cap_gwh:.1f} GWh/yr vs {pt_cap_gwh:.1f} GWh/yr")
                
        # 4. Project name word overlap
        proj_name = pt.get('nom_du_projet') or ''
        norm_proj = norm_txt(proj_name)
        shared = [w for w in norm_p_op.split() if len(w) >= 4 and w in norm_proj and w not in ['energie', 'biogaz', 'france']]
        if shared:
            score += 25
            evidence.append(f"project name overlap: {', '.join(shared)}")
            
        pit = pt.get('ndeg_de_pitd_pitp')
        tso = pt.get('grx_demandeur') or 'GRDF'
        if pit:
            evidence.append(f"ODRE Point {pit} ({tso})")
            
        if score >= 40:
            candidates_scored.append({
                '_pt': pt,
                '_score': score,
                '_dist': dist_km,
                'evidence': evidence,
            })
            
    candidates_scored.sort(key=lambda x: x['_score'], reverse=True)
    
    status = 'NO_MATCH'
    best_cand = None
    top_candidates = []
    
    if len(candidates_scored) == 1:
        if candidates_scored[0]['_score'] >= 45:
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
        pt = c['_pt']
        raw_proj = pt.get('nom_du_projet') or ''
        commune = pt.get('commune') or ''
        pit = pt.get('ndeg_de_pitd_pitp') or 'ODRE'
        coords = pt.get('coordonnees') or {}
        cap_gwh = pt.get('capacite_de_production_gwh_an')
        tso = pt.get('grx_demandeur') or 'GRDF'
        
        op_name = extract_operator_name(raw_proj, commune)
        
        reg_id = f"Point {pit} ({tso})"
        
        return {
            'operatorName': op_name,
            'operatorRegisterId': reg_id,
            'unitId': pit,
            'town': commune,
            'coordinates': [coords.get('lat'), coords.get('lon')] if coords.get('lat') else None,
            'capacity': f"{cap_gwh:.1f} GWh/an" if cap_gwh else None,
            'evidence': c['evidence'],
            '_ptId': pt.get('id_unique_projet') or pit
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
pt_to_plants = {}
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('_ptId'):
        ptid = m['best']['_ptId']
        pt_to_plants.setdefault(ptid, []).append(m['plantId'])

dup_count = 0
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best']:
        ptid = m['best'].pop('_ptId', None)
        if ptid:
            others = [pid for pid in pt_to_plants.get(ptid, []) if pid != m['plantId']]
            if others:
                dup_count += 1
                m['best']['evidence'].append(f"matched to same ODRE point as {', '.join(others)} (duplicate census record)")
    if m.get('candidates'):
        for c in m['candidates']:
            c.pop('_ptId', None)

print(f"\n=== FRANCE MATCHING SUMMARY ===")
print(f"Total French Plants: {len(fr_plants)}")
print(f"MATCHED:    {matched_count} (including {dup_count} duplicate census records)")
print(f"AMBIGUOUS:  {ambiguous_count}")
print(f"NO_MATCH:   {no_match_count}")
print(f"Centroid placeholder plants that matched: {centroid_plants_matched}")

out_data = {
    "countryCode": "FR",
    "source": "Open Data Réseaux Énergies (ODRE points d'injection biométhane) & NaTran",
    "checkedAt": "2026-09-26",
    "results": matches_out
}

os.makedirs('data/registration_matches', exist_ok=True)
with open('data/registration_matches/fr.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)

print("Saved France matches to data/registration_matches/fr.json")
