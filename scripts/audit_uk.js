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
const rows = parseCSV(fs.readFileSync(csvPath, 'utf8'));

const uk = rows.filter(r => r[2] === 'GB' || r[2] === 'UK');
console.log('Total UK plants:', uk.length);
const cats = {};
uk.forEach(r => {
  const cat = r[5];
  cats[cat] = (cats[cat] || 0) + 1;
});
console.log('UK feedstock categories:', cats);
