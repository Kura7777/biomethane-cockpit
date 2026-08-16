import pymupdf, json, re

doc = pymupdf.open('GIE_EBA_BIO_2026_A0_FULL_115.pdf')
page = doc[0]

# Extract all text words and blocks with positions and font sizes
words = page.get_text('words') # (x0, y0, x1, y1, word, block_no, line_no, word_no)
blocks = page.get_text('blocks')

print(f'Total words in PDF: {len(words)}')
print(f'Total blocks in PDF: {len(blocks)}')

# Let's inspect different font sizes and layers to see how plant labels are styled
# In PyMuPDF, get_text('dict') gives spans with font name, size, color, flags
page_dict = page.get_text('dict')

font_counts = {}
for b in page_dict['blocks']:
    if b.get('lines'):
        for l in b['lines']:
            for s in l['spans']:
                f_key = (s['font'], round(s['size'], 1), s['color'])
                font_counts[f_key] = font_counts.get(f_key, 0) + 1

print('Top fonts and sizes used on the map:')
for k, count in sorted(font_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f'  Font: {k[0]}, Size: {k[1]}, Color: {k[2]} -> Count: {count}')
