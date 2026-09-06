import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  const rows = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const regex = /(?:\"([^\"]*(?:\"\"[^\"]*)*)\"|([^,]*))(?:,|$)/g;
    const values = [];
    let match;
    while ((match = regex.exec(line)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++;
      let val = match[1] !== undefined ? match[1].replace(/\"\"/g, '\"') : match[2];
      values.push(val);
      if (regex.lastIndex >= line.length) break;
    }
    rows.push(values);
  }
  return rows;
}

const csvPath = path.resolve(__dirname, '../European_Biomethane_Plants_Master_Registry_2026.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const rows = parseCSV(content);

console.log('Total data rows:', rows.length);

const summary = {
  total: rows.length,
  hasCapacityNm3h: 0,
  hasGWh: 0,
  hasFeedstockCat: 0,
  hasFeedstockDetails: 0,
  hasNetOperator: 0,
  hasOperatorComp: 0,
  hasCoords: 0,
  hasCitation: 0,
  countryCounts: {},
  feedstockCats: {},
};

rows.forEach((r, idx) => {
  const [id, name, country_iso, cap_nm3h, cap_gwh, feedstock_cat, feedstock_det, net_op, op_comp, lat, lon, source] = r;
  summary.countryCounts[country_iso] = (summary.countryCounts[country_iso] || 0) + 1;
  if (cap_nm3h && cap_nm3h.trim() && !isNaN(Number(cap_nm3h))) summary.hasCapacityNm3h++;
  if (cap_gwh && cap_gwh.trim() && !isNaN(Number(cap_gwh))) summary.hasGWh++;
  if (feedstock_cat && feedstock_cat.trim()) {
    summary.hasFeedstockCat++;
    summary.feedstockCats[feedstock_cat.trim()] = (summary.feedstockCats[feedstock_cat.trim()] || 0) + 1;
  }
  if (feedstock_det && feedstock_det.trim()) summary.hasFeedstockDetails++;
  if (net_op && net_op.trim()) summary.hasNetOperator++;
  if (op_comp && op_comp.trim()) summary.hasOperatorComp++;
  if (lat && lon && lat.trim() && lon.trim() && !isNaN(Number(lat)) && !isNaN(Number(lon))) summary.hasCoords++;
  if (source && source.trim()) summary.hasCitation++;
});

console.log('Summary:');
console.log(JSON.stringify(summary, null, 2));
