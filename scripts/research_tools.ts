export async function checkVies(vatNumber: string): Promise<any> {
  const clean = vatNumber.replace(/^ES/i, '').trim();
  const url = `https://ec.europa.eu/taxation_customs/vies/rest-api/ms/ES/vat/${clean}`;
  try {
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (!res.ok) return { isValid: false, error: `HTTP ${res.status}` };
    return await res.json();
  } catch (err: any) {
    return { isValid: false, error: err.message };
  }
}

export async function geocodeOsm(address: string): Promise<[number, number] | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'BiomethaneDeskCockpitResearch/1.0 (origin-desk@biomethane.internal)'
      }
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.length > 0) {
      return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
  } catch {
    return null;
  }
}

if (process.argv[2] === 'vies') {
  checkVies(process.argv[3]).then(d => console.log(JSON.stringify(d, null, 2)));
} else if (process.argv[2] === 'geo') {
  geocodeOsm(process.argv[3]).then(d => console.log(JSON.stringify(d)));
}
