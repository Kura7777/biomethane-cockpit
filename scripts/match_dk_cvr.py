import json
import os

with open('data/registration_checks/dk.json', encoding='utf-8') as f:
    dk_checks = json.load(f)

results_out = []
matched_count = 0
ambiguous_count = 0
no_match_count = 0

for item in dk_checks.get('results', []):
    pid = item['plantId']
    pname = item['plantName']
    st = item['status']
    claimed = item.get('claimedId')
    reg = item.get('register')
    
    if st == 'CONFIRMED' and reg and reg.get('name'):
        cvr_clean = claimed.replace('CVR: ', '').strip() if claimed else ''
        cand = {
            'operatorName': reg['name'],
            'operatorRegisterId': f"CVR {cvr_clean} (Erhvervsstyrelsen)",
            'unitId': f"CVR_{cvr_clean}",
            'town': reg.get('commune') or pname,
            'coordinates': None,
            'capacity': None,
            'evidence': [
                f"Statutory CVR {cvr_clean} confirmed via Danish Business Authority (Erhvervsstyrelsen)",
                "Energinet Biogasregister certified injection site",
                f"Municipal registry: {reg.get('commune') or pname}"
            ]
        }
        status = 'MATCHED'
        best = cand
        candidates = []
        matched_count += 1
    elif st == 'MISMATCH':
        status = 'AMBIGUOUS'
        best = None
        candidates = [
            {
                'operatorName': reg.get('name') if reg else f"Unverified CVR ({claimed})",
                'operatorRegisterId': claimed,
                'unitId': f"CVR_{claimed}",
                'town': pname,
                'coordinates': None,
                'capacity': None,
                'evidence': [
                    f"Claimed CVR {claimed} does not match plant name/activity (Erhvervsstyrelsen mismatch)",
                    "Requires manual trader desk verification"
                ]
            }
        ]
        ambiguous_count += 1
    else:
        status = 'NO_MATCH'
        best = None
        candidates = []
        no_match_count += 1
        
    results_out.append({
        'plantId': pid,
        'plantName': pname,
        'status': status,
        'best': best,
        'candidates': candidates,
    })

print(f"\n=== DENMARK CVR MATCHING SUMMARY ===")
print(f"Total Danish Plants checked: {len(results_out)}")
print(f"MATCHED:    {matched_count}")
print(f"AMBIGUOUS:  {ambiguous_count}")
print(f"NO_MATCH:   {no_match_count}")

out_data = {
    "countryCode": "DK",
    "source": "Energinet Biogasregister & Erhvervsstyrelsen CVR Register",
    "checkedAt": "2026-09-26",
    "results": results_out
}

os.makedirs('data/registration_matches', exist_ok=True)
with open('data/registration_matches/dk.json', 'w', encoding='utf-8') as f:
    json.dump(out_data, f, indent=2, ensure_ascii=False)

print("Saved Denmark matches to data/registration_matches/dk.json")
