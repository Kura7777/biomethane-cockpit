import json

with open('src/domain/plants/registry.ts', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace any occurrence of character 65533 (\ufffd)
cleaned = []
for ch in text:
    if ord(ch) == 65533:
        cleaned.append('')  # strip corrupt replacement byte
    else:
        cleaned.append(ch)

clean_text = ''.join(cleaned)

# Fix specific German/French words
clean_text = clean_text.replace('Netz N ', 'Netz NÖ ')
clean_text = clean_text.replace('Netz N /', 'Netz NÖ /')
clean_text = clean_text.replace('WAGABOX ', 'WAGABOX® ')
clean_text = clean_text.replace('WAGABOX /', 'WAGABOX® /')
clean_text = clean_text.replace('Kallmnz', 'Kallmünz')
clean_text = clean_text.replace('Gstrow', 'Güstrow')
clean_text = clean_text.replace('Zrbig', 'Zörbig')
clean_text = clean_text.replace('Quvy', 'Quévy')
clean_text = clean_text.replace('Ume', 'Umeå')
clean_text = clean_text.replace('rnskldsvik', 'Örnsköldsvik')
clean_text = clean_text.replace('Stra ', 'Straß ')
clean_text = clean_text.replace('Pozna', 'Poznań')
clean_text = clean_text.replace('Zamo', 'Zamość')
clean_text = clean_text.replace('BioBarn', 'BioBéarn')
clean_text = clean_text.replace('Beauce Gtinais', 'Beauce Gâtinais')
clean_text = clean_text.replace("Mtha-D'or", "Métha-D'or")
clean_text = clean_text.replace('e-Mthane', 'e-Méthane')

with open('src/domain/plants/registry.ts', 'w', encoding='utf-8') as f:
    f.write(clean_text)

print('Sanitized all characters in registry.ts!')
