import json

with open('gie_pdf_names.json', 'r', encoding='utf-8') as f:
    names = json.load(f)

print('Total extracted names:', len(names))
for item in names[100:150]:
    print(f"  {item['name']} (x: {item['x']}, y: {item['y']})")
