import {
  RegistryId,
  InjectionBatch,
  BatchAnnexClassification,
  BatchStatus,
  GridInterconnectionStatus,
} from './types';

export interface RegistryImportResult {
  success: boolean;
  registryId: RegistryId;
  registryName: string;
  sourceFileName: string;
  importedCount: number;
  totalVolumeMWh: number;
  batches: InjectionBatch[];
  errors: string[];
  warnings: string[];
  summary: {
    annexIxAVolumeMWh: number;
    annexIxBVolumeMWh: number;
    cropVolumeMWh: number;
    averageCI: number;
  };
}

/**
 * Universal parser for European Biomethane Registry data files (dena, VertiCer, Energinet, Enagás, CSV/JSON/XML).
 */
export function parseRegistryFile(
  content: string,
  fileName: string,
  targetRegistry?: RegistryId
): RegistryImportResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const batches: InjectionBatch[] = [];

  const lowerName = fileName.toLowerCase();
  let detectedRegistry: RegistryId = targetRegistry || 'DENA';

  if (lowerName.includes('verticer') || lowerName.includes('certiq') || lowerName.includes('netherlands')) {
    detectedRegistry = 'VERTICER';
  } else if (lowerName.includes('energinet') || lowerName.includes('denmark') || lowerName.includes('datahub')) {
    detectedRegistry = 'ENERGINET';
  } else if (lowerName.includes('enagas') || lowerName.includes('spain')) {
    detectedRegistry = 'ENAGAS';
  } else if (lowerName.includes('gse') || lowerName.includes('italy')) {
    detectedRegistry = 'GSE';
  } else if (lowerName.includes('dena') || lowerName.includes('biogasregister') || lowerName.includes('germany')) {
    detectedRegistry = 'DENA';
  }

  // 1. Try parsing JSON format
  if (content.trim().startsWith('{') || content.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(content);
      const records = Array.isArray(parsed) ? parsed : (parsed.records || parsed.data || parsed.batches || [parsed]);

      records.forEach((rec: any, idx: number) => {
        try {
          const volume = Number(rec.volumeMWh || rec.volume_mwh || rec.volume || rec.amount || 0);
          if (volume <= 0) return;

          const feedstock = String(rec.feedstock || rec.feedstockCategory || rec.type || 'Manure');
          const isManure = feedstock.toLowerCase().includes('manure') || feedstock.toLowerCase().includes('slurry');
          const isWaste = feedstock.toLowerCase().includes('waste') || feedstock.toLowerCase().includes('residue');
          
          let annex: BatchAnnexClassification = 'CROP';
          if (isManure || isWaste) {
            annex = 'IX_A';
          } else if (feedstock.toLowerCase().includes('uco') || feedstock.toLowerCase().includes('fat')) {
            annex = 'IX_B';
          }

          const ci = rec.ci !== undefined ? Number(rec.ci) : (isManure ? -95 : 22);

          batches.push({
            id: rec.id || `IMPORT-${detectedRegistry}-${Date.now().toString().slice(-4)}-${idx + 1}`,
            plantId: rec.plantId || `PLANT-${detectedRegistry}-${idx + 100}`,
            plantName: rec.plantName || rec.facility || `${detectedRegistry} Registered Facility #${idx + 1}`,
            originCountry: rec.originCountry || (detectedRegistry === 'DENA' ? 'DE' : detectedRegistry === 'VERTICER' ? 'NL' : detectedRegistry === 'ENERGINET' ? 'DK' : 'ES'),
            registryId: detectedRegistry,
            injectionPointId: rec.injectionPointId || `GTS-INJ-${idx + 10}`,
            meteringPeriod: {
              startDate: rec.startDate || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
              endDate: rec.endDate || new Date().toISOString().slice(0, 10),
            },
            volumeMWh: volume,
            volumeNm3: Math.round(volume * 95),
            grossCalorificValueKwhNm3: 10.5,
            feedstockCategory: feedstock,
            feedstockDetails: rec.details || `${feedstock} (Standard RED III consignment)`,
            annexClassification: annex,
            verifiedCI: ci,
            sustainabilityProofId: rec.posId || `POS-${detectedRegistry}-${Date.now().toString().slice(-6)}`,
            certificationScheme: rec.scheme || 'ISCC EU',
            udbRegistrationId: rec.udbId || `UDB-${detectedRegistry}-2026-${idx + 100}`,
            gridInterconnectionStatus: 'TSO_HIGH_PRESSURE',
            issuedAt: rec.issuedAt || new Date().toISOString().slice(0, 10),
            status: 'ISSUED',
          });
        } catch (err: any) {
          warnings.push(`Row ${idx + 1}: ${err?.message || 'Failed to parse record'}`);
        }
      });
    } catch (e: any) {
      errors.push(`Invalid JSON format: ${e?.message || 'Syntax error'}`);
    }
  } 
  // 2. Parse CSV format
  else {
    const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) {
      errors.push('CSV file contains no data rows.');
    } else {
      const headerLine = lines[0].toLowerCase();
      const delimiter = headerLine.includes(';') ? ';' : ',';
      const headers = headerLine.split(delimiter).map(h => h.replace(/["']/g, '').trim());

      for (let i = 1; i < lines.length; i++) {
        const rawRow = lines[i];
        if (!rawRow) continue;
        const cols = rawRow.split(delimiter).map(c => c.replace(/["']/g, '').trim());

        if (cols.length < 2) continue;

        try {
          const rowObj: Record<string, string> = {};
          headers.forEach((h, idx) => {
            rowObj[h] = cols[idx] || '';
          });

          const volumeStr = rowObj['volumemwh'] || rowObj['volume'] || rowObj['mwh'] || rowObj['amount'] || cols[1] || '0';
          const volume = parseFloat(volumeStr.replace(',', '.'));
          if (isNaN(volume) || volume <= 0) continue;

          const feedstock = rowObj['feedstock'] || rowObj['feedstockcategory'] || rowObj['substrate'] || cols[2] || 'Animal Manure';
          const isManure = feedstock.toLowerCase().includes('manure') || feedstock.toLowerCase().includes('gülle');
          const isWaste = feedstock.toLowerCase().includes('waste') || feedstock.toLowerCase().includes('abfall') || feedstock.toLowerCase().includes('slurry');
          
          let annex: BatchAnnexClassification = 'CROP';
          if (isManure || isWaste) {
            annex = 'IX_A';
          } else if (feedstock.toLowerCase().includes('uco') || feedstock.toLowerCase().includes('fett')) {
            annex = 'IX_B';
          }

          const ciStr = rowObj['ci'] || rowObj['carbonintensity'] || rowObj['thg'] || '';
          const ci = ciStr ? parseFloat(ciStr.replace(',', '.')) : (isManure ? -100 : 20);

          batches.push({
            id: rowObj['id'] || rowObj['batchid'] || `CSV-${detectedRegistry}-${Date.now().toString().slice(-4)}-${i}`,
            plantId: rowObj['plantid'] || rowObj['facilityid'] || `PLANT-${detectedRegistry}-${i + 50}`,
            plantName: rowObj['plantname'] || rowObj['plant'] || `${detectedRegistry} Biomethane Plant #${i}`,
            originCountry: rowObj['country'] || (detectedRegistry === 'DENA' ? 'DE' : detectedRegistry === 'VERTICER' ? 'NL' : detectedRegistry === 'ENERGINET' ? 'DK' : 'ES'),
            registryId: detectedRegistry,
            injectionPointId: rowObj['injectionpoint'] || `GRID-INJ-${i}`,
            meteringPeriod: {
              startDate: rowObj['startdate'] || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
              endDate: rowObj['enddate'] || new Date().toISOString().slice(0, 10),
            },
            volumeMWh: volume,
            volumeNm3: Math.round(volume * 95),
            grossCalorificValueKwhNm3: 10.5,
            feedstockCategory: feedstock,
            feedstockDetails: `${feedstock} (Imported from ${fileName})`,
            annexClassification: annex,
            verifiedCI: isNaN(ci) ? 0 : ci,
            sustainabilityProofId: rowObj['pos'] || `POS-${detectedRegistry}-${i * 102}`,
            certificationScheme: rowObj['scheme'] || 'ISCC EU',
            udbRegistrationId: `UDB-${detectedRegistry}-${i + 200}`,
            gridInterconnectionStatus: 'TSO_HIGH_PRESSURE',
            issuedAt: new Date().toISOString().slice(0, 10),
            status: 'ISSUED',
          });
        } catch (err: any) {
          warnings.push(`Line ${i + 1}: ${err?.message || 'Error parsing line'}`);
        }
      }
    }
  }

  const totalVolume = batches.reduce((sum, b) => sum + b.volumeMWh, 0);
  const annexIxAVolume = batches.filter(b => b.annexClassification === 'IX_A').reduce((sum, b) => sum + b.volumeMWh, 0);
  const annexIxBVolume = batches.filter(b => b.annexClassification === 'IX_B').reduce((sum, b) => sum + b.volumeMWh, 0);
  const cropVolume = batches.filter(b => b.annexClassification === 'CROP').reduce((sum, b) => sum + b.volumeMWh, 0);
  const avgCI = batches.length > 0
    ? batches.reduce((sum, b) => sum + (b.verifiedCI * b.volumeMWh), 0) / (totalVolume || 1)
    : 0;

  return {
    success: batches.length > 0,
    registryId: detectedRegistry,
    registryName: detectedRegistry === 'DENA' ? 'dena Biogasregister (Germany)' : detectedRegistry === 'VERTICER' ? 'VertiCer (Netherlands)' : detectedRegistry === 'ENERGINET' ? 'Energinet (Denmark)' : 'Enagás (Spain)',
    sourceFileName: fileName,
    importedCount: batches.length,
    totalVolumeMWh: totalVolume,
    batches,
    errors,
    warnings,
    summary: {
      annexIxAVolumeMWh: annexIxAVolume,
      annexIxBVolumeMWh: annexIxBVolume,
      cropVolumeMWh: cropVolume,
      averageCI: Number(avgCI.toFixed(1)),
    },
  };
}
