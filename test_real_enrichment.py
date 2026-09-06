import json, time, os, requests

with open('all_pdf_indexed_plants.json', 'r', encoding='utf-8') as f:
    plants = json.load(f)

non_fr = [p for p in plants if p['country_prefix'] != 'FR']
print(f'Total non-FR plants: {len(non_fr)}')

headers = {'User-Agent': 'BiomethaneResearchBot/1.0 (research@biomethane-cockpit.org)'}

country_names = {
    'DE': 'Germany', 'IT': 'Italy', 'UK': 'United Kingdom', 'NL': 'Netherlands',
    'SE': 'Sweden', 'DK': 'Denmark', 'CH': 'Switzerland', 'FI': 'Finland',
    'ES': 'Spain', 'AT': 'Austria', 'BE': 'Belgium', 'NO': 'Norway',
    'CZ': 'Czech Republic', 'PT': 'Portugal', 'EE': 'Estonia', 'LV': 'Latvia',
    'LT': 'Lithuania', 'UA': 'Ukraine', 'SK': 'Slovakia', 'HU': 'Hungary',
    'IS': 'Iceland', 'IE': 'Ireland', 'LU': 'Luxembourg', 'PL': 'Poland', 'LI': 'Liechtenstein'
}

def clean_name(name):
    name = name.split('/')[0].split('(')[0].strip()
    return name

print("Testing 10 sample non-FR plants geocoding...")
for p in non_fr[:10]:
    c_code = p['country_prefix']
    c_name = country_names.get(c_code, '')
    q = f"{clean_name(p['name'])}, {c_name}"
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {'q': q, 'format': 'json', 'limit': 1}
        r = requests.get(url, headers=headers, params=params, timeout=10)
        data = r.json()
        if data:
            print(f"MATCH: {p['code']} ({p['name']}) -> Lat: {data[0]['lat']}, Lon: {data[0]['lon']} ({data[0]['display_name'][:50]})")
        else:
            print(f"NOT FOUND: {p['code']} ({p['name']})")
    except Exception as e:
        print(f"ERROR: {p['code']} - {e}")
    time.sleep(1)
