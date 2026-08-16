import json

with open('all_pdf_indexed_plants.json', 'r', encoding='utf-8') as f:
    plants = json.load(f)

print(f'Loaded {len(plants)} plants.')
print('\nSample 25 plants across Europe:')
for p in plants[::80]:
    print(f"  [{p['code']}]: {p['name']} (y: {p['bbox'][1]})")
