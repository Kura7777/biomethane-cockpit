import re

filepath = 'scripts/generate_gb_research.ts'
with open(filepath, 'r', encoding='utf-8') as f:
    text = f.read()

# Let's split into plants or replace accurately per plant block
# We can find plant block by matching from `plantId: '...'` to the next `plantId:` or `];`

def get_block(txt, pid):
    start = txt.find(f"plantId: '{pid}'")
    if start == -1:
        raise ValueError(f"plant {pid} not found")
    # find previous '{'
    block_start = txt.rfind('{', 0, start)
    # find next plant or end
    next_start = txt.find("plantId: 'plant_uk_", start + 1)
    if next_start == -1:
        next_start = txt.find("];", start)
    block_end = txt.rfind('},', start, next_start) + 2
    return txt[block_start:block_end]

# 1. plant_uk_68: SC491828 -> 09101997, Scotland -> England & Wales
b68 = get_block(text, 'plant_uk_68')
b68_new = b68.replace('SC491828', '09101997').replace('Companies House (Scotland)', 'Companies House (England & Wales)').replace('Companies House (Scotland).', 'Companies House (England & Wales).')
text = text.replace(b68, b68_new, 1)

# 2. plant_uk_24: 08885911 -> 07964362
b24 = get_block(text, 'plant_uk_24')
b24_new = b24.replace('08885911', '07964362')
text = text.replace(b24, b24_new, 1)

# 3. plant_uk_81: 08885911 -> 07964362
b81 = get_block(text, 'plant_uk_81')
b81_new = b81.replace('08885911', '07964362')
text = text.replace(b81, b81_new, 1)

# 4. plant_uk_6: 08738361 -> SC491828, England & Wales -> Scotland
b6 = get_block(text, 'plant_uk_6')
b6_new = b6.replace('08738361', 'SC491828').replace('Companies House (England & Wales)', 'Companies House (Scotland)').replace('Companies House (England & Wales).', 'Companies House (Scotland).')
text = text.replace(b6, b6_new, 1)

# 5. plant_uk_47: 08676392 -> 08885911
b47 = get_block(text, 'plant_uk_47')
b47_new = b47.replace('08676392', '08885911')
text = text.replace(b47, b47_new, 1)

# 6. plant_uk_127: 07854815 -> 07207977
b127 = get_block(text, 'plant_uk_127')
b127_new = b127.replace('07854815', '07207977')
text = text.replace(b127, b127_new, 1)

# 7. Severn Trent Green Power Limited: plant_uk_30, 35, 38, 57, 90: 07470495 -> 04501557
for st_id in ['plant_uk_30', 'plant_uk_35', 'plant_uk_38', 'plant_uk_57', 'plant_uk_90']:
    bst = get_block(text, st_id)
    bst_new = bst.replace('07470495', '04501557')
    text = text.replace(bst, bst_new, 1)

# 8. plant_uk_43: 07519967 -> 10285991
b43 = get_block(text, 'plant_uk_43')
b43_new = b43.replace('07519967', '10285991')
text = text.replace(b43, b43_new, 1)

# 9. plant_uk_12: Severn Trent Green Power (Andigestion) Limited, 04987002 -> 01847506
b12 = get_block(text, 'plant_uk_12')
b12_new = b12.replace('Andigestion Limited', 'Severn Trent Green Power (Andigestion) Limited').replace('04987002', '01847506')
text = text.replace(b12, b12_new, 1)

# 10. plant_uk_70: 04501557 -> 07854815
b70 = get_block(text, 'plant_uk_70')
b70_new = b70.replace('04501557', '07854815')
text = text.replace(b70, b70_new, 1)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated scripts/generate_gb_research.ts successfully!")
