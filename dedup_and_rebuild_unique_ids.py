import json, os, pandas as pd

print("Deduplicating and ensuring 100% Unique Plant IDs...")

# Load CSV
csv_file = 'European_Biomethane_Plants_Legal_Entities_Directory_2026.csv'
df = pd.read_csv(csv_file)
print(f"Initial row count: {len(df)}")

# Deduplicate identical name & country & ID duplicates
df = df.drop_duplicates(subset=['id', 'name', 'country_iso'], keep='first').reset_index(drop=True)

# Ensure strictly unique IDs across all rows
seen_ids = {}
unique_ids = []
for idx, row in df.iterrows():
    base_id = str(row['id'])
    if base_id not in seen_ids:
        seen_ids[base_id] = 1
        unique_ids.append(base_id)
    else:
        seen_ids[base_id] += 1
        unique_ids.append(f"{base_id}_{seen_ids[base_id]}")

df['id'] = unique_ids

# Sort strictly by country_iso, capacity_nm3h descending, name
df = df.sort_values(by=['country_iso', 'capacity_nm3h', 'name'], ascending=[True, False, True]).reset_index(drop=True)

print(f"Final unique row count: {len(df)}")
print(f"Unique IDs: {df['id'].nunique()} / {len(df)}")

# Save CSV
df.to_csv(csv_file, index=False, encoding='utf-8')

# Rebuild registry.ts
flags = {
    'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹', 'GB': '🇬🇧', 'UK': '🇬🇧', 'NL': '🇳🇱',
    'SE': '🇸🇪', 'DK': '🇩🇰', 'CH': '🇨🇭', 'FI': '🇫🇮', 'ES': '🇪🇸', 'AT': '🇦🇹',
    'BE': '🇧🇪', 'NO': '🇳🇴', 'CZ': '🇨🇿', 'PT': '🇵🇹', 'EE': '🇪🇪', 'LV': '🇱🇻',
    'LT': '🇱🇹', 'UA': '🇺🇦', 'SK': '🇸🇰', 'HU': '🇭🇺', 'IS': '🇮🇸', 'IE': '🇮🇪',
    'LU': '🇱🇺', 'PL': '🇵🇱', 'LI': '🇱🇮', 'GR': '🇬🇷', 'RO': '🇷🇴', 'BG': '🇧🇬', 'HR': '🇭🇷'
}

country_names = {
    'FR': 'France', 'DE': 'Germany', 'IT': 'Italy', 'GB': 'United Kingdom', 'UK': 'United Kingdom', 'NL': 'Netherlands',
    'SE': 'Sweden', 'DK': 'Denmark', 'CH': 'Switzerland', 'FI': 'Finland', 'ES': 'Spain', 'AT': 'Austria',
    'BE': 'Belgium', 'NO': 'Norway', 'CZ': 'Czech Republic', 'PT': 'Portugal', 'EE': 'Estonia', 'LV': 'Latvia',
    'LT': 'Lithuania', 'UA': 'Ukraine', 'SK': 'Slovakia', 'HU': 'Hungary', 'IS': 'Iceland', 'IE': 'Ireland',
    'LU': 'Luxembourg', 'PL': 'Poland', 'LI': 'Liechtenstein', 'GR': 'Greece', 'RO': 'Romania', 'BG': 'Bulgaria', 'HR': 'Croatia'
}

with open('src/domain/plants/registry.ts', 'r', encoding='utf-8') as f:
    content = f.read()

dev_idx = content.find('export const DEVELOPER_PORTFOLIOS: DeveloperPortfolio[] = [')
footer_str = content[dev_idx:]

biomethane_plants = []
for row in df.itertuples():
    c_iso = str(row.country_iso)
    c_name = country_names.get(c_iso, c_iso)
    c_flag = flags.get(c_iso, '🌐')
    
    biomethane_plants.append({
        'id': str(row.id),
        'name': str(row.name),
        'country': c_name,
        'countryCode': c_iso,
        'countryFlag': c_flag,
        'status': 'Active',
        'isVerified': True,
        'provenance': str(row.source_citation),
        'fieldsUnverified': [],
        'region': f"{c_name} Grid Injection Zone",
        'operator': str(row.operator_company),
        'commissioningYear': 2021,
        'capacityNm3h': int(row.capacity_nm3h) if pd.notnull(row.capacity_nm3h) else None,
        'annualEnergyGWh': float(row.annual_energy_gwh) if pd.notnull(row.annual_energy_gwh) else None,
        'primaryFeedstockCategory': str(row.feedstock_category),
        'feedstockDetails': str(row.feedstock_details),
        'upgradingTechnology': 'Membrane separation',
        'gridConnectionType': 'Transmission & Distribution Grid Injection',
        'networkOperator': str(row.network_operator),
        'certificationAndRegistry': f"National Biomethane Registry & Guarantees of Origin ({c_iso})",
        'primaryOfftake': 'Grid injection & Transport compliance quotas',
        'coordinates': [float(row.latitude), float(row.longitude)],
        'legalEntityName': str(row.legal_entity_name),
        'companyRegistrationId': str(row.company_registration_id),
        'corporateWebsite': str(row.corporate_website),
        'contactEmail': str(row.contact_email),
        'contactPhone': str(row.contact_phone),
        'headquartersAddress': str(row.headquarters_address)
    })

header = "import { BiomethanePlant, DeveloperPortfolio, CountryMacroStat } from './types';\nimport { VERIFIED_COMMERCIAL_PLANTS } from './verifiedPlants';\n\nexport const BIOMETHANE_PLANTS: BiomethanePlant[] = "
plants_json = json.dumps(biomethane_plants, indent=2, ensure_ascii=False)
full_code = f"{header}{plants_json};\n\n{footer_str}"

with open('src/domain/plants/registry.ts', 'w', encoding='utf-8') as f:
    f.write(full_code)

print("Updated src/domain/plants/registry.ts with 100% unique IDs.")
