import pymupdf, json, re

doc = pymupdf.open('GIE_EBA_BIO_2026_A0_FULL_115.pdf')
page = doc[0]
page_dict = page.get_text('dict')

# Extract all lines with text and coordinates
all_lines = []
for b in page_dict['blocks']:
    if b.get('lines'):
        for l in b['lines']:
            text = ''.join(s['text'] for s in l['spans']).strip()
            if text:
                all_lines.append({
                    'text': text,
                    'bbox': [round(v, 1) for v in l['bbox']],
                    'font': l['spans'][0]['font'],
                    'size': round(l['spans'][0]['size'], 1)
                })

print(f'Total lines extracted: {len(all_lines)}')

# Look for patterns like "AT-1", "DE-104", "FR-450", "DK-22", "NL-5", "IT-30", "ES-12", "SE-18", "GB-55", "UK-10"
code_pattern = re.compile(r'^([A-Z]{2,3})[-_\s]?(\d+)$')

indexed_plants = []

# Sort lines vertically and horizontally
sorted_lines = sorted(all_lines, key=lambda x: (round(x['bbox'][1] / 10), x['bbox'][0]))

for i, line in enumerate(sorted_lines):
    m = code_pattern.match(line['text'].strip())
    if m:
        country_code = m.group(1)
        plant_num = int(m.group(2))
        
        # Look for nearby name line (usually just to the right, or next item at similar y)
        target_y = line['bbox'][1]
        target_x = line['bbox'][0]
        
        # Search candidate names near this x,y
        best_name = None
        min_dist = 9999
        for other in all_lines:
            if other == line: continue
            dy = abs(other['bbox'][1] - target_y)
            dx = other['bbox'][0] - target_x
            if dy <= 4.0 and 5.0 <= dx <= 250.0:
                dist = dx + dy * 10
                if dist < min_dist and not code_pattern.match(other['text']):
                    min_dist = dist
                    best_name = other['text']
        
        indexed_plants.append({
            'code': f'{country_code}-{plant_num}',
            'country_prefix': country_code,
            'number': plant_num,
            'name': best_name or f'Biomethane Site {country_code}-{plant_num}',
            'bbox': line['bbox']
        })

print(f'Total Indexed Plants found from PDF: {len(indexed_plants)}')

# Count by country prefix
counts = {}
for p in indexed_plants:
    c = p['country_prefix']
    counts[c] = counts.get(c, 0) + 1

print('\n=== Plant Count by Country Index ===')
for c, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
    print(f'  {c}: {count} plants')

with open('all_pdf_indexed_plants.json', 'w', encoding='utf-8') as f:
    json.dump(indexed_plants, f, ensure_ascii=False, indent=2)

print('Saved all plants to all_pdf_indexed_plants.json')
