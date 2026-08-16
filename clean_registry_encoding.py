import json, re

with open('src/domain/plants/registry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Map common corrupted words and characters
replacements = [
    ('Netz N', 'Netz NÖ'),
    ('Netz NOE', 'Netz NÖ'),
    ('WAGABOX', 'WAGABOX®'),
    ('Kallmnz', 'Kallmünz'),
    ('Gnnersdorf', 'Gönnersdorf'),
    ('Pyrnes', 'Pyrénées'),
    ('Sane', 'Saône'),
    ('dArdoix', "d'Ardoix"),
    ('Val Ple', 'Val Pôle'),
    ('Gstrow', 'Güstrow'),
    ('Zrbig', 'Zörbig'),
    ('Quvy', 'Quévy'),
    ('Ume', 'Umeå'),
    ('rnskldsvik', 'Örnsköldsvik'),
    ('Stra', 'Straß'),
    ('Pozna', 'Poznań'),
    ('Zamo', 'Zamość'),
    ('BioBarn', 'BioBéarn'),
    ('Beauce Gtinais', 'Beauce Gâtinais'),
    ('Mtha-D\'or', "Métha-D'or"),
    ('e-Mthane', 'e-Méthane'),
    ('d', "d'"),
    ('l', "l'"),
    ('N', 'NÖ'),
    ('', 'e'),  # Generic fallback for any remaining  in words
]

for old, new in replacements:
    content = content.replace(old, new)

# Write back cleaned file
with open('src/domain/plants/registry.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Cleaned all encoding artifacts in registry.ts!')
