import re

def validate_swiss_uid(uid_str):
    digits = re.sub(r'\D', '', uid_str)
    if len(digits) != 9:
        return False
    weights = [5, 4, 3, 2, 7, 6, 5, 4]
    s = sum(int(d) * w for d, w in zip(digits[:8], weights))
    rem = s % 11
    check = (11 - rem) % 11
    if check == 10:
        return False
    return check == int(digits[8])

print("Axpo Biomasse AG (CHE-101.555.287):", validate_swiss_uid("CHE-101.555.287"))
print("Energie 360° AG (CHE-105.839.803):", validate_swiss_uid("CHE-105.839.803"))
print("SwissFarmerPower (CHE-113.336.622):", validate_swiss_uid("CHE-113.336.622"))
print("Biopower Nordwest (CHE-112.253.258):", validate_swiss_uid("CHE-112.253.258"))
print("Rhy Biogas AG (CHE-113.409.557):", validate_swiss_uid("CHE-113.409.557"))
print("ara region bern (CHE-108.395.607):", validate_swiss_uid("CHE-108.395.607"))
print("Viteos SA (CHE-113.989.623):", validate_swiss_uid("CHE-113.989.623"))
print("EcoBioVal Sàrl (CHE-400.002.455):", validate_swiss_uid("CHE-400.002.455"))
print("Biogas Zürich AG (CHE-265.350.305):", validate_swiss_uid("CHE-265.350.305"))
print("Kompogas Winterthur (CHE-113.671.233):", validate_swiss_uid("CHE-113.671.233"))
print("Kompogas Utzenstorf (CHE-112.494.477):", validate_swiss_uid("CHE-112.494.477"))
print("Bioenergie Tägerwilen (CHE-462.590.222):", validate_swiss_uid("CHE-462.590.222"))
print("Frutigland GmbH (CHE-247.506.118):", validate_swiss_uid("CHE-247.506.118"))
print("ProRheno AG (CHE-103.158.833):", validate_swiss_uid("CHE-103.158.833"))
print("Ecorecyclage SA (CHE-111.655.424):", validate_swiss_uid("CHE-111.655.424"))
print("BIMA Energie AG (CHE-385.331.576):", validate_swiss_uid("CHE-385.331.576"))
print("Recycling Energie AG (CHE-114.676.032):", validate_swiss_uid("CHE-114.676.032"))
print("Model AG (CHE-101.796.187):", validate_swiss_uid("CHE-101.796.187"))
print("SATOM SA (CHE-101.539.325):", validate_swiss_uid("CHE-101.539.325"))
print("Metanord SA (CHE-100.718.865):", validate_swiss_uid("CHE-100.718.865"))


candidate_uids = [
    ("Axpo Biomasse AG", "CHE-105.801.442"),
    ("Energie 360° AG", "CHE-105.839.803"),
    ("Säntis Energie AG", "CHE-107.828.187"),
    ("Localnet AG", "CHE-105.908.435"),
    ("Viteos SA", "CHE-112.443.076"),
    ("EcoBioVal Sàrl", "CHE-480.089.431"),
    ("Energie du Jura SA", "CHE-114.288.941"),
    ("Holdigaz SA", "CHE-105.940.669"),
    ("Holdinova SA", "CHE-112.164.654"),
    ("ewl energie wasser luzern ag", "CHE-109.329.071"),
    ("Bioenergie Frauenfeld AG", "CHE-341.055.437"),
    ("Schweizer Zucker AG", "CHE-105.955.195"),
    ("Groupe E SA", "CHE-107.765.176"),
    ("Frigaz SA", "CHE-105.824.960"),
    ("Biogasanlage Frutigland AG", "CHE-113.882.991"),
    ("SWG Stadtwerke Grenchen", "CHE-109.437.375"),
    ("ara region bern ag", "CHE-112.585.340"),
    ("Energie Wasser Bern", "CHE-109.057.854"),
    ("SwissFarmerPower Inwil AG", "CHE-112.871.933"),
    ("Epura SA", "CHE-114.580.498"),
    ("Ecorecyclage SA", "CHE-108.064.043"),
    ("Cosvegaz SA", "CHE-105.940.485"),
    ("Sinergy Infrastructure SA", "CHE-114.773.344"),
    ("MySTEP SA", "CHE-316.598.665"),
    ("SWL Energie AG", "CHE-105.879.366"),
    ("BIMA Energie AG", "CHE-114.498.421"),
    ("Recycling Energie AG", "CHE-114.417.882"),
    ("Regionalwerke AG Baden", "CHE-105.820.733"),
    ("Model AG", "CHE-105.961.577"),
    ("aare energie ag", "CHE-109.873.332"),
    ("Biopower Nordwestschweiz AG", "CHE-101.488.944"),
    ("Eniwa AG", "CHE-105.820.165"),
    ("Wyna Energie AG", "CHE-105.795.394"),
    ("Regiotherm AG", "CHE-103.585.291"),
    ("Gasversorgung Romanshorn AG", "CHE-105.845.295"),
    ("Energie Zürichsee Linth AG", "CHE-105.839.811"),
    ("WWZ Energie AG", "CHE-105.836.726"),
    ("Bioenergie Tägerwilen AG", "CHE-114.896.732"),
    ("Energie Thun AG", "CHE-109.437.288"),
    ("Kompogas Utzenstorf AG", "CHE-112.905.727"),
    ("Regio Energie Solothurn", "CHE-109.324.965"),
    ("Services Industriels de Genève", "CHE-108.954.611"),
    ("OIKEN SA", "CHE-288.751.785"),
    ("Rhy Biogas AG", "CHE-113.805.513"),
    ("IBB Energie AG", "CHE-105.820.709"),
    ("Kompogas Winterthur AG", "CHE-101.996.110"),
    ("Biogas Zürich AG", "CHE-115.655.485"),
    ("ProRheno AG", "CHE-105.845.242"),
    ("IWB Industrielle Werke Basel", "CHE-115.197.808"),
    ("Metanord SA", "CHE-105.981.859"),
    ("SATOM SA", "CHE-105.940.713"),
    ("Gaznat SA", "CHE-105.978.895"),
]

for name, uid in candidate_uids:
    valid, msg = check_swiss_uid(uid)
    print(f"{name:35s} | {uid} | Valid: {valid} ({msg})")


# Test on Winterthur and Zuchwil
for q in ["Winterthur Biogas Einspeisung ARA Hard Stadtwerk", "Zuchwil Biogas Einspeisung ARA Regio Energie Solothurn"]:
    print("Q:", q)
    for r in web_search(q):
        print(" -", r)
    time.sleep(1)


# End of test




