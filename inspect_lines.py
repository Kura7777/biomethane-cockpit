import pymupdf, json

doc = pymupdf.open('GIE_EBA_BIO_2026_A0_FULL_115.pdf')
page = doc[0]
page_dict = page.get_text('dict')

plant_spans = []
for b in page_dict['blocks']:
    if b.get('lines'):
        for l in b['lines']:
            line_text = ''.join(s['text'] for s in l['spans']).strip()
            if not line_text: continue
            
            # Extract span metadata
            first_span = l['spans'][0]
            font = first_span['font']
            size = round(first_span['size'], 1)
            color = first_span['color']
            bbox = l['bbox'] # (x0, y0, x1, y1)
            
            plant_spans.append({
                'text': line_text,
                'font': font,
                'size': size,
                'color': color,
                'bbox': [round(v, 1) for v in bbox]
            })

print(f'Total lines extracted: {len(plant_spans)}')

# Group by font/size
by_font = {}
for p in plant_spans:
    key = f"{p['font']}_{p['size']}_{p['color']}"
    by_font.setdefault(key, []).append(p)

for k, items in sorted(by_font.items(), key=lambda x: len(x[1]), reverse=True)[:10]:
    print(f'\n=== Font Key: {k} (Total: {len(items)}) ===')
    for item in items[:15]:
        print(f"  [{item['bbox'][0]}, {item['bbox'][1]}]: {item['text']}")
