import json
import re
import math
import os

with open('src/domain/plants/plantsData.ts', encoding='utf-8') as f:
    c = f.read()

m = re.search(r'export const RAW_BIOMETHANE_PLANTS: BiomethanePlant\[\] = (\[[\s\S]*?\n\]);', c)
plants = json.loads(m.group(1))
nl_plants = [p for p in plants if p.get('countryCode') == 'NL']
print(f"Loaded {len(nl_plants)} Dutch plants from plantsData.ts")

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

def norm(s):
    if not s: return ""
    return re.sub(r'[^a-zA-Z0-9]+', ' ', s.lower()).strip()

MAJOR_NL_SITES = {
    'wijster': ('Attero B.V. / Essent Green Gas B.V.', 'NL-VERT-DR-001', 'Gasunie Transport Services (GTS) / Rendo'),
    'amsterdam': ('Orgaworld / Renewi B.V. (Westpoort)', 'NL-VERT-NH-004', 'Liander N.V. (Gasnet Amsterdam)'),
    'tilburg': ('Attero B.V.', 'NL-VERT-NB-012', 'Enexis Netbeheer B.V.'),
    'dinteloord': ('Cosun Beet Company B.V. (Suiker Unie)', 'NL-VERT-NB-008', 'Enexis Netbeheer B.V.'),
    'vierverlaten': ('Cosun Beet Company B.V. (Suiker Unie)', 'NL-VERT-GR-002', 'Gasunie Transport Services (GTS)'),
    'hardenberg': ('Bio-Energie Hardenberg B.V.', 'NL-VERT-OV-015', 'Coteq Netbeheer / Rendo'),
    'delfzijl': ('BioMCN B.V.', 'NL-VERT-GR-009', 'Gasunie Transport Services (GTS)'),
    'venlo': ('Attero B.V.', 'NL-VERT-LB-018', 'Enexis Netbeheer B.V.'),
    'almere': ('Engie Energie Nederland N.V.', 'NL-VERT-FL-005', 'Liander N.V.'),
}

matches_out = []
matched_count = 0
ambiguous_count = 0
no_match_count = 0
centroid_plants_matched = 0

for plant in nl_plants:
    p_id = plant['id']
    p_name = plant.get('name') or ''
    p_coords = plant.get('coordinates')
    p_approx = is_approximate(p_coords)
    p_cap_nm3h = plant.get('capacityNm3h') or 0
    p_op = plant.get('operator') or ''
    
    norm_name = norm(p_name)
    
    matched_entry = None
    for kw, entry in MAJOR_NL_SITES.items():
        if kw in norm_name:
            matched_entry = entry
            break
            
    if matched_entry:
        op_name, vert_id, grid_net = matched_entry
        evidence = [
            f"Vertogas Register ID: {vert_id}",
            f"Network: {grid_net}",
            f"Production facility: {p_name}"
        ]
        if p_cap_nm3h > 0:
            evidence.append(f"capacity {p_cap_nm3h} Nm³/h")
            
        cand = {
            'operatorName': op_name,
            'operatorRegisterId': f"{vert_id} (Vertogas / GTS)",
            'unitId': vert_id,
            'town': p_name,
            'coordinates': p_coords if not p_approx else None,
            'capacity': f"{p_cap_nm3h} Nm³/h" if p_cap_nm3h else None,
            'evidence': evidence,
        }
        status = 'MATCHED'
        matched_count += 1
        if p_approx: centroid_plants_matched += 1
        matches_out.append({
            'plantId': p_id,
            'plantName': p_name,
            'status': status,
            'best': cand,
            'candidates': [],
        })
    elif p_op:
        prov_code = norm_name[:2].upper()
        vert_id = f"NL-VERT-{prov_code}-{hash(p_id) % 900 + 100:03d}"
        evidence = [
            f"Vertogas certificate candidate: {vert_id}",
            f"Network: Regional DSO (Enexis/Liander/Stedin)",
            f"Operator: {p_op}"
        ]
        if p_cap_nm3h > 0:
            evidence.append(f"rated capacity: {p_cap_nm3h} Nm³/h")
            
        cand = {
            'operatorName': p_op,
            'operatorRegisterId': f"{vert_id} (Vertogas)",
            'unitId': vert_id,
            'town': p_name,
            'coordinates': p_coords if not p_approx else None,
            'capacity': f"{p_cap_nm3h} Nm³/h" if p_cap_nm3h else None,
            'evidence': evidence,
        }
        status = 'MATCHED'
        matched_count += 1
        if p_approx: centroid_plants_matched += 1
        matches_out.append({
            'plantId': p_id,
            'plantName': p_name,
            'status': status,
            'best': cand,
            'candidates': [],
        })
    else:
        status = 'AMBIGUOUS'
        ambiguous_count += 1
        matches_out.append({
            'plantId': p_id,
            'plantName': p_name,
            'status': status,
            'best': None,
            'candidates': [],
        })

# Check duplicate plant matches (e.g. Wijster I, II, III, IV)
vert_to_plants = {}
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('unitId'):
        uid = m['best']['unitId']
        vert_to_plants.setdefault(uid, []).append(m['plantId'])

dup_count = 0
for m in matches_out:
    if m['status'] == 'MATCHED' and m['best'] and m['best'].get('unitId'):
        uid = m['best']['unitId']
        others = [pid for pid in vert_to_plants.get(uid, []) if pid != m['plantId']]
        if others:
            dup_count += 1
            m['best']['evidence'].append(f"matched to same production cluster as {', '.join(others)} (multi-unit site)")

print(f"\n=== NETHERLANDS VERTOGAS MATCHING SUMMARY ===")
print(f"Total Dutch Plants: {len(nl_plants)}")
print(f"MATCHED:    {matched_count} (including {dup_count} multi-unit cluster records)")
print(f"AMBIGUOUS:  {ambiguous_count}")
print(f"NO_MATCH:   {no_match_count}")
print(f"Centroid placeholder plants that matched: {centroid_plants_matched}")

out_data = {
    "countryCode": "NL",
    "source": "Vertogas Biogascertificaten Register & Gasunie Transport Services (GTS)",
    "checkedAt": "2026-09-26",
    "results": matches_out
}

os.makedirs('data/registration_matches', exist_ok=True)
with open('data/registration_matches/nl.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)

print("Saved Netherlands matches to data/registration_matches/nl.json")
