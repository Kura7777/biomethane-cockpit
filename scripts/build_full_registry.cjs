const fs = require('fs');
const path = require('path');

// Regulatory Constants from calculator.ts
const FUELEU_TARGET_2025 = 89.3368;
const FUELEU_TARGET_2030 = 85.6904;
const FUELEU_BASELINE_VLSFO_CI = 91.16;
const FUELEU_BASELINE_MGO_CI = 91.16;
const FUELEU_FOSSIL_LNG_CI = 74.50;
const FUELEU_STATUTORY_PENALTY_PER_TONNE = 2400;

const LHV_VLSFO_MJ_PER_TONNE = 41000;
const LHV_MGO_MJ_PER_TONNE = 42700;
const LHV_LNG_MJ_PER_TONNE = 49100;
const LHV_BIO_LNG_MJ_PER_TONNE = 49100;
const MJ_PER_MWH = 3600;

function calculateDeficitMetrics(vlsfoT, mgoT, lngT) {
  const vlsfoMj = vlsfoT * LHV_VLSFO_MJ_PER_TONNE;
  const mgoMj = mgoT * LHV_MGO_MJ_PER_TONNE;
  const lngMj = lngT * LHV_LNG_MJ_PER_TONNE;

  const totalEnergyMj = vlsfoMj + mgoMj + lngMj;
  const totalEnergyMwh = Math.round(totalEnergyMj / MJ_PER_MWH);

  const totalGhgGrams = vlsfoMj * FUELEU_BASELINE_VLSFO_CI + mgoMj * FUELEU_BASELINE_MGO_CI + lngMj * FUELEU_FOSSIL_LNG_CI;
  const actualGhgie = Number((totalGhgGrams / totalEnergyMj).toFixed(2));

  const complianceBalance2025Tco2e = Number((((FUELEU_TARGET_2025 - actualGhgie) * totalEnergyMj) / 1000000).toFixed(1));
  const complianceBalance2030Tco2e = Number((((FUELEU_TARGET_2030 - actualGhgie) * totalEnergyMj) / 1000000).toFixed(1));

  const absDeficitGrams2025 = Math.abs(complianceBalance2025Tco2e) * 1000000;
  const vlsfoEqTonnes2025 = absDeficitGrams2025 / (actualGhgie * LHV_VLSFO_MJ_PER_TONNE);
  const penalty2025Y1 = Math.round(vlsfoEqTonnes2025 * FUELEU_STATUTORY_PENALTY_PER_TONNE);
  const penalty2025Y2 = Math.round(penalty2025Y1 * 1.1);

  const absDeficitGrams2030 = Math.abs(complianceBalance2030Tco2e) * 1000000;
  const vlsfoEqTonnes2030 = absDeficitGrams2030 / (actualGhgie * LHV_VLSFO_MJ_PER_TONNE);
  const penalty2030Y1 = Math.round(vlsfoEqTonnes2030 * FUELEU_STATUTORY_PENALTY_PER_TONNE);

  const deltaCiNeg100 = FUELEU_TARGET_2025 - (-100);
  const requiredBioEnergyMj = absDeficitGrams2025 / deltaCiNeg100;
  const bioLngReqNeg100T = Number((requiredBioEnergyMj / LHV_BIO_LNG_MJ_PER_TONNE).toFixed(1));
  const bioLngReqNeg100Mwh = Math.round(requiredBioEnergyMj / MJ_PER_MWH);

  const bioLngReqZeroT = Number((absDeficitGrams2025 / FUELEU_TARGET_2025 / LHV_BIO_LNG_MJ_PER_TONNE).toFixed(1));

  const bioLngPremiumCost = bioLngReqNeg100Mwh * 65;
  const clientSavingsPhysical = Math.max(0, penalty2025Y1 - bioLngPremiumCost);
  const deskMarginPhysical = bioLngReqNeg100Mwh * 15;

  const poolDeficitCost = Math.abs(complianceBalance2025Tco2e) * 465;
  const clientSavingsPooling = Math.max(0, penalty2025Y1 - poolDeficitCost);
  const deskMarginPooling = Math.round(Math.abs(complianceBalance2025Tco2e) * 30);

  return {
    total_energy_mwh: totalEnergyMwh,
    actual_ghgie: actualGhgie,
    compliance_balance_2025_tco2e: complianceBalance2025Tco2e,
    penalty_2025_y1_eur: penalty2025Y1,
    penalty_2025_y2_eur: penalty2025Y2,
    compliance_balance_2030_tco2e: complianceBalance2030Tco2e,
    penalty_2030_y1_eur: penalty2030Y1,
    bio_lng_required_neg100_t: bioLngReqNeg100T,
    bio_lng_required_neg100_mwh: bioLngReqNeg100Mwh,
    bio_lng_required_zero_t: bioLngReqZeroT,
    client_savings_physical_eur: clientSavingsPhysical,
    desk_margin_physical_eur: deskMarginPhysical,
    client_savings_pooling_eur: clientSavingsPooling,
    desk_margin_pooling_eur: deskMarginPooling,
  };
}

// Read existing 63 targets
const existingPath = path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.json');
const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf8'));

// Split into existing deficit (49) and existing surplus (14)
const existingDeficits = existingData.filter(d => d.compliance_balance_2025_tco2e < 0);
const existingSurpluses = existingData.filter(d => d.compliance_balance_2025_tco2e >= 0);

console.log(`Loaded ${existingDeficits.length} existing deficits and ${existingSurpluses.length} existing surpluses.`);

// 21 New Tier 3 companies
const newTier3Defs = [
  {
    parent_name: "Unifeeder",
    headquarters: "Aarhus, Denmark",
    segment: "Container Liner",
    vessels_in_scope: 28,
    vlsfo_tonnes: 26000,
    mgo_tonnes: 4500,
    lng_tonnes: 0,
    strategy_suffix: "Europe's Largest Feeder Network / Critical Intra-EU Hub Connections",
    key_executive: "Jesper Kristensen (Group CEO) / Martin Gaard Christiansen (CCO)",
    primary_bunkering_hubs: "Rotterdam, Hamburg, Antwerp, Aarhus, Gdansk",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Bunker Procurement & Feeder Decarbonization Division",
    keyContactRole: "Head of Commercial Feedering & Fuel Sourcing",
    hqAddress: "Lyshøjen 8, 8200 Aarhus N, Denmark",
    switchboardPhone: "+45 88 83 00 00",
    contactDomain: "unifeeder.com",
  },
  {
    parent_name: "Samskip",
    headquarters: "Rotterdam, Netherlands",
    segment: "Container Liner",
    vessels_in_scope: 22,
    vlsfo_tonnes: 24000,
    mgo_tonnes: 3800,
    lng_tonnes: 0,
    strategy_suffix: "Multimodal Feeder Specialist / North Sea & Baltic Sea Routes",
    key_executive: "Kari-Pekka Laaksonen (CEO) / Erik Hofmeester (Head of Fleet)",
    primary_bunkering_hubs: "Rotterdam, Duisburg, Hull, Oslo, Reykjavik",
    callingRegion: "ARA_HUB",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Multimodal Decarbonization & Vessel Operations",
    keyContactRole: "Director Fleet Management & Sustainable Fuels",
    hqAddress: "Waalhaven O.z. 81, 3087 BM Rotterdam, Netherlands",
    switchboardPhone: "+31 88 400 1000",
    contactDomain: "samskip.com",
  },
  {
    parent_name: "Royal Wagenborg (Wagenborg Shipping)",
    headquarters: "Delfzijl, Netherlands",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 32,
    vlsfo_tonnes: 22000,
    mgo_tonnes: 4000,
    lng_tonnes: 0,
    strategy_suffix: "Ice-Classed Multipurpose Coaster Titan / Baltic & North Sea Forestry Lifeline",
    key_executive: "Egbert Vuursteen (CEO) / Stefan Wagenborg (Executive Director)",
    primary_bunkering_hubs: "Delfzijl, Rotterdam, Hamburg, Antwerp, Hull",
    callingRegion: "ARA_HUB",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Technical Fleet Management & Environmental Sourcing",
    keyContactRole: "Managing Director Shipping & Fleet Efficiency Lead",
    hqAddress: "Marktstraat 10, 9934 CG Delfzijl, Netherlands",
    switchboardPhone: "+31 596 636 911",
    contactDomain: "wagenborg.com",
  },
  {
    parent_name: "Wilson ASA",
    headquarters: "Bergen, Norway",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 35,
    vlsfo_tonnes: 21000,
    mgo_tonnes: 3500,
    lng_tonnes: 0,
    strategy_suffix: "Largest European Short-Sea Bulker Fleet / High Intra-EU Port Density",
    key_executive: "Oyvind Gjerde (CEO) / Thorbjorn Dalsoren (CFO)",
    primary_bunkering_hubs: "Bergen, Rotterdam, Antwerp, Hamburg, Hull",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Commercial Short-Sea Operations & Fuel Desk",
    keyContactRole: "Commercial Director & Bunkering Lead",
    hqAddress: "Bradbenken 1, 5003 Bergen, Norway",
    switchboardPhone: "+47 55 57 80 00",
    contactDomain: "wilsonship.no",
  },
  {
    parent_name: "Arklow Shipping",
    headquarters: "Arklow, Ireland / Rotterdam",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 26,
    vlsfo_tonnes: 19000,
    mgo_tonnes: 3200,
    lng_tonnes: 0,
    strategy_suffix: "Modern Eco-Design Short-Sea Fleet / UK-Continent Industrial Lifeline",
    key_executive: "James Tyrrell (Managing Director) / Richard Burgess (Operations Director)",
    primary_bunkering_hubs: "Rotterdam, Antwerp, Dublin, Belfast, Cork",
    callingRegion: "UK_CONTINENT",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Marine Operations & Fleet Fuel Efficiency",
    keyContactRole: "General Manager Operations & Green Fuels Lead",
    hqAddress: "North Quay, Arklow, Co. Wicklow, Ireland",
    switchboardPhone: "+353 402 39901",
    contactDomain: "asl.ie",
  },
  {
    parent_name: "Spliethoff Group",
    headquarters: "Amsterdam, Netherlands",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 24,
    vlsfo_tonnes: 18000,
    mgo_tonnes: 3000,
    lng_tonnes: 0,
    strategy_suffix: "Heavy-Lift & Forest Products Specialist / High Voyage Versatility",
    key_executive: "Michael van den Heuvel (CFO) / Arne Hubregtse (Executive Board)",
    primary_bunkering_hubs: "Amsterdam, Rotterdam, Antwerp, Zeebrugge",
    callingRegion: "ARA_HUB",
    tradeLane: "TRANSATLANTIC",
    targetDepartment: "Fleet Technical Services & Environmental Compliance",
    keyContactRole: "Director Technical Department & Fuel Efficiency",
    hqAddress: "Radarweg 36, 1042 AA Amsterdam, Netherlands",
    switchboardPhone: "+31 20 448 8400",
    contactDomain: "spliethoff.com",
  },
  {
    parent_name: "WEC Lines",
    headquarters: "Rotterdam, Netherlands",
    segment: "Container Liner",
    vessels_in_scope: 16,
    vlsfo_tonnes: 17000,
    mgo_tonnes: 2500,
    lng_tonnes: 0,
    strategy_suffix: "Iberian Peninsula & UK-Continent Feeder Backbone",
    key_executive: "Caesar Luikenaar (Managing Director) / Paul Frowijn (Commercial Lead)",
    primary_bunkering_hubs: "Rotterdam, Bilbao, Leixoes, Montoir, Casablanca",
    callingRegion: "WEST_MED",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Short Sea Liner Operations & Bunkering",
    keyContactRole: "Operations Director & Bunker Procurement Lead",
    hqAddress: "Albert Plesmanweg 59, 3088 GB Rotterdam, Netherlands",
    switchboardPhone: "+31 10 491 3333",
    contactDomain: "weclines.com",
  },
  {
    parent_name: "CLdN Ro-Ro (Cobelfret)",
    headquarters: "Luxembourg City, Luxembourg",
    segment: "European Ferry & Ro-Ro",
    vessels_in_scope: 18,
    vlsfo_tonnes: 16000,
    mgo_tonnes: 2200,
    lng_tonnes: 0,
    strategy_suffix: "High-Frequency North Sea Ro-Ro Freight Corridors",
    key_executive: "Florent Maes (CEO) / Gary Walker (Chief Operating Officer)",
    primary_bunkering_hubs: "Zeebrugge, Rotterdam, London, Dublin, Gothenburg",
    callingRegion: "ARA_HUB",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Maritime Technology & Fleet Decarbonization",
    keyContactRole: "Chief Technology Officer & Marine Fuels Lead",
    hqAddress: "3-7 Rue Schiller, 2519 Luxembourg City, Luxembourg",
    switchboardPhone: "+352 26 25 81",
    contactDomain: "cldn.com",
  },
  {
    parent_name: "Briese Schiffahrt",
    headquarters: "Leer, Germany",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 20,
    vlsfo_tonnes: 15000,
    mgo_tonnes: 2000,
    lng_tonnes: 0,
    strategy_suffix: "Major German Multipurpose Coaster & Project Cargo Fleet",
    key_executive: "Wilke Briese (Managing Director) / Raymond Fisch (VP Operations)",
    primary_bunkering_hubs: "Leer, Hamburg, Bremen, Rotterdam, Antwerp",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Ship Management & Fuel Management Desk",
    keyContactRole: "Director Ship Management & Bunkering Desk",
    hqAddress: "Hafenstrasse 12, 26789 Leer, Germany",
    switchboardPhone: "+49 491 925 200",
    contactDomain: "briese.de",
  },
  {
    parent_name: "BG Freight Line (Peel Ports)",
    headquarters: "Rotterdam, Netherlands",
    segment: "Container Liner",
    vessels_in_scope: 15,
    vlsfo_tonnes: 14000,
    mgo_tonnes: 2000,
    lng_tonnes: 0,
    strategy_suffix: "Key Irish Sea & UK-Continent Feeder Linkages",
    key_executive: "Koert Luitwieler (CEO) / John Foley (Director of Operations)",
    primary_bunkering_hubs: "Rotterdam, Liverpool, Dublin, Belfast, Antwerp",
    callingRegion: "UK_CONTINENT",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Fleet Operations & Channel Bunkering Desk",
    keyContactRole: "Operations Director & Fuel Transition Manager",
    hqAddress: "Waalhaven Z.z. 19, 3089 JH Rotterdam, Netherlands",
    switchboardPhone: "+31 10 491 6300",
    contactDomain: "bgfreightline.com",
  },
  {
    parent_name: "X-Press Feeders Europe (Eastaway)",
    headquarters: "Hamburg, Germany / Singapore",
    segment: "Container Liner",
    vessels_in_scope: 14,
    vlsfo_tonnes: 13000,
    mgo_tonnes: 1800,
    lng_tonnes: 0,
    strategy_suffix: "Pan-European Feeder Network / Active Green Corridor Trialist",
    key_executive: "Shmuel Yoskovitz (CEO) / Alex Hartnoll (Director of Projects)",
    primary_bunkering_hubs: "Hamburg, Rotterdam, Algeciras, Valencia, Barcelona",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Green Feeder Operations & Sustainable Bunkering",
    keyContactRole: "Director European Services & Alternative Fuels Lead",
    hqAddress: "Grosse Elbstrasse 145b, 22767 Hamburg, Germany",
    switchboardPhone: "+49 40 380 3790",
    contactDomain: "x-pressfeeders.com",
  },
  {
    parent_name: "Furetank Rederi",
    headquarters: "Donsö, Sweden",
    segment: "Chemical Tanker",
    vessels_in_scope: 10,
    vlsfo_tonnes: 12000,
    mgo_tonnes: 1500,
    lng_tonnes: 0,
    strategy_suffix: "Vinga Series Eco-Tankers / Dual-Fuel Pioneer Requiring Bio-LNG",
    key_executive: "Lars Höglund (CEO) / Per-Anders Höglund (Deputy CEO)",
    primary_bunkering_hubs: "Gothenburg, Rotterdam, Skagen, Brofjorden",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Green Fleet Operations & Bio-LNG Bunkering Desk",
    keyContactRole: "Managing Director & Clean Marine Fuel Lead",
    hqAddress: "Donsö Hamnväg 22, 430 82 Donsö, Sweden",
    switchboardPhone: "+46 31 97 36 80",
    contactDomain: "furetank.se",
  },
  {
    parent_name: "Terntank Rederi",
    headquarters: "Skagen, Denmark / Gothenburg",
    segment: "Chemical Tanker",
    vessels_in_scope: 10,
    vlsfo_tonnes: 11000,
    mgo_tonnes: 1400,
    lng_tonnes: 0,
    strategy_suffix: "Clean Coastal Chemical & Product Fleet / Baltic Environmental Leader",
    key_executive: "Tryggve Möller (CEO) / Annika Kristensson (Chairman)",
    primary_bunkering_hubs: "Skagen, Gothenburg, Rotterdam, Porvoo",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Clean Tanker Operations & Bunkering Desk",
    keyContactRole: "Operations Manager & Energy Transition Lead",
    hqAddress: "Vestre Strandvej 10, 9990 Skagen, Denmark",
    switchboardPhone: "+45 98 44 26 88",
    contactDomain: "terntank.com",
  },
  {
    parent_name: "Boeckmans Belgie",
    headquarters: "Antwerp, Belgium",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 12,
    vlsfo_tonnes: 10000,
    mgo_tonnes: 1300,
    lng_tonnes: 0,
    strategy_suffix: "Belgian Short-Sea Coaster Leader / Flexible Steel & Agri Shuttle",
    key_executive: "Pierre Boeckmans (Managing Director) / Walter van Mechelen (Operations)",
    primary_bunkering_hubs: "Antwerp, Rotterdam, Zeebrugge, Dunkirk",
    callingRegion: "ARA_HUB",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Commercial Fleet Desk & Chartering",
    keyContactRole: "Chartering Manager & Bunker Procurement",
    hqAddress: "Korte Gasthuisstraat 18, 2000 Antwerp, Belgium",
    switchboardPhone: "+32 3 206 70 00",
    contactDomain: "boeckmans.be",
  },
  {
    parent_name: "Carisbrooke Shipping",
    headquarters: "Cowes, Isle of Wight, UK",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 12,
    vlsfo_tonnes: 9000,
    mgo_tonnes: 1200,
    lng_tonnes: 0,
    strategy_suffix: "British Short-Sea Bulker Specialist / UK-Continent Trades",
    key_executive: "Helen Tveitan de Jong (CEO) / Mark Sinclair (Technical Director)",
    primary_bunkering_hubs: "Southampton, Rotterdam, Antwerp, Felixstowe",
    callingRegion: "UK_CONTINENT",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Ship Management & Fuel Transition Team",
    keyContactRole: "Chief Executive Officer & Fleet Technical Director",
    hqAddress: "38 Medina Road, Cowes, Isle of Wight PO31 7DA, United Kingdom",
    switchboardPhone: "+44 1983 284 000",
    contactDomain: "carisbrooke.co",
  },
  {
    parent_name: "JR Shipping",
    headquarters: "Harlingen, Netherlands",
    segment: "Container Liner",
    vessels_in_scope: 11,
    vlsfo_tonnes: 8500,
    mgo_tonnes: 1100,
    lng_tonnes: 0,
    strategy_suffix: "Dutch Feeder & Container Feedering Specialist / High European Exposure",
    key_executive: "Jan Reier Arends (Managing Director) / Sander Schakelaar (Director)",
    primary_bunkering_hubs: "Harlingen, Rotterdam, Hamburg, Bremerhaven",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Fleet Technical Management & Bunker Optimization",
    keyContactRole: "Managing Owner & Director of Vessel Operations",
    hqAddress: "Korte Lijnbaan 25, 8861 NR Harlingen, Netherlands",
    switchboardPhone: "+31 517 418 039",
    contactDomain: "jrshipping.nl",
  },
  {
    parent_name: "Navig8 Group",
    headquarters: "London, United Kingdom",
    segment: "Chemical Tanker",
    vessels_in_scope: 10,
    vlsfo_tonnes: 8000,
    mgo_tonnes: 1000,
    lng_tonnes: 0,
    strategy_suffix: "Handy Chemical & Product Tanker Commercial Pool Manager",
    key_executive: "Nicolas Busch (CEO) / Gary Brocklesby (Chairman)",
    primary_bunkering_hubs: "Rotterdam, Antwerp, Gibraltar, Malta",
    callingRegion: "ARA_HUB",
    tradeLane: "ME_AFRICA_EU_LIQUID",
    targetDepartment: "Commercial Pool Operations & Marine Fuels",
    keyContactRole: "Head of Commercial Pools & Bunkering Services",
    hqAddress: "24 Savile Row, London W1S 2ES, United Kingdom",
    switchboardPhone: "+44 20 7409 6800",
    contactDomain: "navig8group.com",
  },
  {
    parent_name: "Bore Ltd (Rettig Group)",
    headquarters: "Helsinki, Finland",
    segment: "European Ferry & Ro-Ro",
    vessels_in_scope: 9,
    vlsfo_tonnes: 7500,
    mgo_tonnes: 950,
    lng_tonnes: 0,
    strategy_suffix: "Specialised Baltic Ro-Ro & Forest Products Fleet",
    key_executive: "Hakan Modig (CEO) / Jorgen Mansnerus (VP Marine Management)",
    primary_bunkering_hubs: "Helsinki, Zeebrugge, Rostock, Turku",
    callingRegion: "BALTIC_NORDIC",
    tradeLane: "BALTIC_NORDIC_ROPAX",
    targetDepartment: "Marine Management & Energy Saving Fleet",
    keyContactRole: "Chief Executive Officer & VP Marine Operations",
    hqAddress: "Kruunuvuorenkatu 5, 00160 Helsinki, Finland",
    switchboardPhone: "+358 9 618 830",
    contactDomain: "borefleet.com",
  },
  {
    parent_name: "Ibaizabal Group",
    headquarters: "Bilbao, Spain",
    segment: "Product Tanker",
    vessels_in_scope: 8,
    vlsfo_tonnes: 7000,
    mgo_tonnes: 850,
    lng_tonnes: 0,
    strategy_suffix: "Spanish Coastal & Regional Bunkering Shuttle Fleet",
    key_executive: "Alejandro Aznar (Chairman) / Jorge Aznar (Managing Director)",
    primary_bunkering_hubs: "Bilbao, Algeciras, Valencia, Barcelona",
    callingRegion: "WEST_MED",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Fleet Technical Division & Bunker Management",
    keyContactRole: "Managing Director & Head of Fleet Operations",
    hqAddress: "Calle Rodriguez Arias 15, 48011 Bilbao, Spain",
    switchboardPhone: "+34 94 425 2100",
    contactDomain: "ibaizabal.org",
  },
  {
    parent_name: "Universal Africa Lines (UAL)",
    headquarters: "Capelle aan den IJssel, Netherlands",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 7,
    vlsfo_tonnes: 6000,
    mgo_tonnes: 800,
    lng_tonnes: 0,
    strategy_suffix: "Niche Breakbulk & Project Cargo Shuttle Operator",
    key_executive: "Harald Maas (Director) / Roger Hermans (Commercial Director)",
    primary_bunkering_hubs: "Rotterdam, Antwerp, Las Palmas, Aberdeen",
    callingRegion: "ARA_HUB",
    tradeLane: "TRANSATLANTIC",
    targetDepartment: "Liner Fleet Operations & Fuel Desk",
    keyContactRole: "Managing Director & Operations Manager",
    hqAddress: "Rivium 1e Straat 42, 2909 LE Capelle aan den IJssel, Netherlands",
    switchboardPhone: "+31 10 288 8800",
    contactDomain: "ualnet.com",
  },
  {
    parent_name: "Rhenus Maritime Services",
    headquarters: "Duisburg, Germany",
    segment: "General Cargo / Coaster",
    vessels_in_scope: 8,
    vlsfo_tonnes: 5000,
    mgo_tonnes: 600,
    lng_tonnes: 0,
    strategy_suffix: "Sea-River & Short-Sea Coaster Pioneer / Rhine-European Corridors",
    key_executive: "Thomas Maassen (Managing Director) / Dirk Gemmer (CEO Rhenus Transport)",
    primary_bunkering_hubs: "Duisburg, Rotterdam, Antwerp, Bremen, Hamburg",
    callingRegion: "ARA_HUB",
    tradeLane: "INTRA_EU_FEEDER",
    targetDepartment: "Short-Sea Shipping & Sea-River Fleet",
    keyContactRole: "Managing Director Short-Sea Fleet & Sustainable Logistics",
    hqAddress: "Alte Ruhrorter Strasse 40-42, 47119 Duisburg, Germany",
    switchboardPhone: "+49 203 804 0",
    contactDomain: "rhenus.group",
  },
];

const newTier3Items = newTier3Defs.map(def => {
  const calc = calculateDeficitMetrics(def.vlsfo_tonnes, def.mgo_tonnes, def.lng_tonnes);

  const penM = (calc.penalty_2025_y1_eur / 1e6).toFixed(1);
  const saveM = (calc.client_savings_physical_eur / 1e6).toFixed(1);
  const gwhBio = (calc.bio_lng_required_neg100_mwh / 1000).toFixed(1);

  const pitch = `With ${def.vessels_in_scope} EU-scope vessels creating a €${penM}M FuelEU penalty exposure in 2025, ${def.parent_name} faces direct compliance liabilities under Regulation (EU) 2023/1805. Our desk structures tailored delivery of ${gwhBio} GWh ISCC-certified manure Bio-LNG (-100 CI) or bilateral Article 21 pooling allocations, unlocking €${saveM}M in net client penalty avoidance.`;

  return {
    rank: 0, // will assign sequentially
    parent_name: def.parent_name,
    headquarters: def.headquarters,
    segment: def.segment,
    vessels_in_scope: def.vessels_in_scope,
    strategy_tier: `Tier 3: Regional & Feeder Deficit (<€2M / year) · ${def.strategy_suffix}`,
    vlsfo_tonnes: def.vlsfo_tonnes,
    mgo_tonnes: def.mgo_tonnes,
    lng_tonnes: def.lng_tonnes,
    total_energy_mwh: calc.total_energy_mwh,
    actual_ghgie: calc.actual_ghgie,
    compliance_balance_2025_tco2e: calc.compliance_balance_2025_tco2e,
    penalty_2025_y1_eur: calc.penalty_2025_y1_eur,
    penalty_2025_y2_eur: calc.penalty_2025_y2_eur,
    compliance_balance_2030_tco2e: calc.compliance_balance_2030_tco2e,
    penalty_2030_y1_eur: calc.penalty_2030_y1_eur,
    bio_lng_required_neg100_t: calc.bio_lng_required_neg100_t,
    bio_lng_required_neg100_mwh: calc.bio_lng_required_neg100_mwh,
    bio_lng_required_zero_t: calc.bio_lng_required_zero_t,
    client_savings_physical_eur: calc.client_savings_physical_eur,
    desk_margin_physical_eur: calc.desk_margin_physical_eur,
    client_savings_pooling_eur: calc.client_savings_pooling_eur,
    desk_margin_pooling_eur: calc.desk_margin_pooling_eur,
    key_executive: def.key_executive,
    primary_bunkering_hubs: def.primary_bunkering_hubs,
    callingRegion: def.callingRegion,
    tradeLane: def.tradeLane,
    targetDepartment: def.targetDepartment,
    keyContactRole: def.keyContactRole,
    hqAddress: def.hqAddress,
    switchboardPhone: def.switchboardPhone,
    contactDomain: def.contactDomain,
    outreachPitch: pitch,
  };
});

// Now clean up strategy_tier strings for existing deficit and surplus records to cleanly reflect Tier 1, Tier 2, Tier 4
const cleanedExistingDeficits = existingDeficits.map(item => {
  let tierPrefix = '';
  // Strip out old "Tier 1: ...", "Tier 2: ...", "Tier 3: ..." prefix
  const cleanedSuffix = item.strategy_tier.replace(/^Tier\s+[1234]:\s*/i, '');
  if (item.penalty_2025_y1_eur > 10000000) {
    tierPrefix = `Tier 1: Mega-Deficit (>€10M / year) · ${cleanedSuffix}`;
  } else if (item.penalty_2025_y1_eur >= 2000000) {
    tierPrefix = `Tier 2: Mid-Tier Compliance Buyer (€2M – €10M / year) · ${cleanedSuffix}`;
  } else {
    tierPrefix = `Tier 3: Regional & Feeder Deficit (<€2M / year) · ${cleanedSuffix}`;
  }

  return {
    ...item,
    rank: 0,
    strategy_tier: tierPrefix,
  };
});

const cleanedExistingSurpluses = existingSurpluses.map(item => {
  const cleanedSuffix = item.strategy_tier.replace(/^Tier\s+[1234]:\s*/i, '');
  return {
    ...item,
    rank: 0,
    strategy_tier: `Tier 4: Over-Compliant Article 21 Surplus Seller · ${cleanedSuffix}`,
  };
});

// Combine all deficits (49 existing + 21 new = 70) and sort strictly descending by penalty_2025_y1_eur
const allDeficits = [...cleanedExistingDeficits, ...newTier3Items].sort((a, b) => b.penalty_2025_y1_eur - a.penalty_2025_y1_eur);

// Sort surpluses strictly descending by compliance_balance_2025_tco2e
const allSurpluses = [...cleanedExistingSurpluses].sort((a, b) => b.compliance_balance_2025_tco2e - a.compliance_balance_2025_tco2e);

console.log(`Total deficits: ${allDeficits.length}, Total surpluses: ${allSurpluses.length}`);

// Combine into final list and assign 1-indexed rank
const fullRegistry = [...allDeficits, ...allSurpluses];
fullRegistry.forEach((item, index) => {
  item.rank = index + 1;
});

console.log(`Assigned ranks 1 to ${fullRegistry.length}`);

// Audit the full registry
const phoneRegex = /^\+[0-9 ]+$/;
fullRegistry.forEach((c, idx) => {
  if (c.rank !== idx + 1) throw new Error(`Rank mismatch at ${idx}: ${c.rank}`);
  if (!c.parent_name) throw new Error(`Missing name at rank ${c.rank}`);
  if (c.vessels_in_scope <= 0) throw new Error(`Invalid vessels at rank ${c.rank}`);
  if (c.total_energy_mwh <= 0) throw new Error(`Invalid energy at rank ${c.rank}`);
  if (!Number.isFinite(c.compliance_balance_2025_tco2e)) throw new Error(`Non-finite balance at rank ${c.rank}`);
  if (!Number.isFinite(c.penalty_2025_y1_eur)) throw new Error(`Non-finite penalty at rank ${c.rank}`);
  if (!phoneRegex.test(c.switchboardPhone)) throw new Error(`Phone format invalid for ${c.parent_name}: ${c.switchboardPhone}`);
  if (!c.contactDomain.includes('.')) throw new Error(`Domain invalid for ${c.parent_name}: ${c.contactDomain}`);
  if (c.outreachPitch.length < 50) throw new Error(`Pitch too short for ${c.parent_name}`);

  if (c.penalty_2025_y1_eur > 0) {
    const penM = (c.penalty_2025_y1_eur / 1e6).toFixed(1);
    const penRound = Math.round(c.penalty_2025_y1_eur / 1e6);
    const hasPen = c.outreachPitch.includes(`€${penM}M`) || c.outreachPitch.includes(`€${penRound}M`);
    if (!hasPen) throw new Error(`Pitch penalty mismatch for ${c.parent_name}: ${c.outreachPitch}`);

    const saveM = (c.client_savings_physical_eur / 1e6).toFixed(1);
    const saveRound = Math.round(c.client_savings_physical_eur / 1e6);
    const hasSave = c.outreachPitch.includes(`€${saveM}M`) || c.outreachPitch.includes(`€${saveRound}M`);
    if (!hasSave) throw new Error(`Pitch savings mismatch for ${c.parent_name}: ${c.outreachPitch}`);
  } else {
    const surpKt = (c.compliance_balance_2025_tco2e / 1000).toFixed(1);
    const hasSurp = c.outreachPitch.includes(`+${surpKt} kt`);
    if (!hasSurp) throw new Error(`Pitch surplus mismatch for ${c.parent_name}: ${c.outreachPitch}`);
  }
});

console.log('✅ All 84 records passed verification audit perfectly!');

// Export to JSON
const jsonOutput = JSON.stringify(fullRegistry, null, 2);
fs.writeFileSync(path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.json'), jsonOutput, 'utf8');
console.log('Wrote data/fueleu_shipping_crm_targets.json');

// Export to CSV
const csvHeaders = [
  'rank',
  'parent_name',
  'headquarters',
  'segment',
  'vessels_in_scope',
  'strategy_tier',
  'vlsfo_tonnes',
  'mgo_tonnes',
  'lng_tonnes',
  'total_energy_mwh',
  'actual_ghgie',
  'compliance_balance_2025_tco2e',
  'penalty_2025_y1_eur',
  'penalty_2025_y2_eur',
  'compliance_balance_2030_tco2e',
  'penalty_2030_y1_eur',
  'bio_lng_required_neg100_t',
  'bio_lng_required_neg100_mwh',
  'bio_lng_required_zero_t',
  'client_savings_physical_eur',
  'desk_margin_physical_eur',
  'client_savings_pooling_eur',
  'desk_margin_pooling_eur',
  'key_executive',
  'primary_bunkering_hubs',
  'calling_region',
  'trade_lane',
  'target_department',
  'key_contact_role',
  'hq_address',
  'switchboard_phone',
  'contact_domain',
  'outreach_pitch',
];

const escapeCsv = (val) => {
  if (val === undefined || val === null) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
};

const csvRows = fullRegistry.map(c => [
  c.rank,
  escapeCsv(c.parent_name),
  escapeCsv(c.headquarters),
  escapeCsv(c.segment),
  c.vessels_in_scope,
  escapeCsv(c.strategy_tier),
  c.vlsfo_tonnes,
  c.mgo_tonnes,
  c.lng_tonnes,
  c.total_energy_mwh,
  c.actual_ghgie,
  c.compliance_balance_2025_tco2e,
  c.penalty_2025_y1_eur,
  c.penalty_2025_y2_eur,
  c.compliance_balance_2030_tco2e,
  c.penalty_2030_y1_eur,
  c.bio_lng_required_neg100_t,
  c.bio_lng_required_neg100_mwh,
  c.bio_lng_required_zero_t,
  c.client_savings_physical_eur,
  c.desk_margin_physical_eur,
  c.client_savings_pooling_eur,
  c.desk_margin_pooling_eur,
  escapeCsv(c.key_executive),
  escapeCsv(c.primary_bunkering_hubs),
  c.callingRegion,
  c.tradeLane,
  escapeCsv(c.targetDepartment),
  escapeCsv(c.keyContactRole),
  escapeCsv(c.hqAddress),
  escapeCsv(c.switchboardPhone),
  escapeCsv(c.contactDomain),
  escapeCsv(c.outreachPitch),
]);

const csvContent = [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n');
fs.writeFileSync(path.join(__dirname, '..', 'data', 'fueleu_shipping_crm_targets.csv'), csvContent, 'utf8');
console.log('Wrote data/fueleu_shipping_crm_targets.csv');

// Export to TypeScript
const tsContent = `import { ShippingCounterparty } from './types';

export const FUEL_EU_SHIPPING_COUNTERPARTIES: ShippingCounterparty[] = ${JSON.stringify(fullRegistry, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '..', 'src', 'domain', 'fueleu', 'shippingTargetsData.ts'), tsContent, 'utf8');
console.log('Wrote src/domain/fueleu/shippingTargetsData.ts');

console.log('✨ All files built and synchronized successfully!');
