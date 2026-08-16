import zipfile, xml.etree.ElementTree as ET, json

xlsx_path = 'European Biomethane Plants - Complete Pan-European Registry (All 1,975+ Facilities).xlsx'
z = zipfile.ZipFile(xlsx_path)

# Parse workbook.xml
wb_tree = ET.fromstring(z.read('xl/workbook.xml'))
ns = {'main': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
sheets = [s.attrib['name'] for s in wb_tree.findall('.//main:sheet', ns)]
print('Sheets in workbook:', sheets)

# Parse shared strings
strings = []
if 'xl/sharedStrings.xml' in z.namelist():
    ss_tree = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in ss_tree.findall('.//main:si', ns):
        text = ''.join(t.text for t in si.findall('.//main:t', ns) if t.text)
        strings.append(text)

print(f'Total shared strings: {len(strings)}')

for i, sheet_name in enumerate(sheets, 1):
    sheet_xml = f'xl/worksheets/sheet{i}.xml'
    s_tree = ET.fromstring(z.read(sheet_xml))
    rows = s_tree.findall('.//main:row', ns)
    print(f'\n=== SHEET {i}: {sheet_name} (Total rows: {len(rows)}) ===')
    if rows:
        # Print header
        r0 = rows[0]
        header = []
        for c in r0.findall('main:c', ns):
            v = c.find('main:v', ns)
            t = c.attrib.get('t')
            val = ''
            if v is not None and v.text:
                val = strings[int(v.text)] if t == 's' and int(v.text) < len(strings) else v.text
            header.append(val)
        print('Header:', header)
        
        # Sample row
        if len(rows) > 1:
            r1 = rows[1]
            row1 = []
            for c in r1.findall('main:c', ns):
                v = c.find('main:v', ns)
                t = c.attrib.get('t')
                val = ''
                if v is not None and v.text:
                    val = strings[int(v.text)] if t == 's' and int(v.text) < len(strings) else v.text
                row1.append(val)
            print('Sample row 1:', row1)
