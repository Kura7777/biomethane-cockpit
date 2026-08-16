import pymupdf, json, math

doc = pymupdf.open('GIE_EBA_BIO_2026_A0_FULL_115.pdf')
page = doc[0]
blocks = page.get_text('blocks')

plant_names = []
for b in blocks:
    txt = b[4].strip()
    lines = [l.strip() for l in txt.split('\n') if l.strip()]
    for l in lines:
        if 3 <= len(l) <= 45 and not l.isupper() and not any(k in l.lower() for k in ['http', 'sea', 'ocean', 'bay', 'gulf', 'channel', 'peninsula', 'island', 'association', 'figure', 'source', 'member', 'europe', 'commission', 'infrastructure', 'avenue', 'rue d']):
            plant_names.append({'name': l, 'x': round(b[0], 1), 'y': round(b[1], 1)})

print(f'Candidate plant/asset names extracted: {len(plant_names)}')

with open('gie_pdf_names.json', 'w', encoding='utf-8') as f:
    json.dump(plant_names, f, ensure_ascii=False, indent=2)

print('Saved to gie_pdf_names.json')
