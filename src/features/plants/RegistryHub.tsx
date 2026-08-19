import React, { useState, useMemo } from 'react';
import {
  REGISTRY_METADATA_TABLE,
  BASELINE_INJECTION_BATCHES,
  BASELINE_BALANCE_OF_TRADE,
  PROTOCOL_INTEROPERABILITY_MATRIX,
  REGISTRY_CONNECTORS,
  verifyRegistryTransfer,
  advanceTitleTransferStatus,
  parseRegistryFile,
  RegistryImportResult,
  fetchEnerginetBiomethaneInjections,
  EnerginetLiveFlowData,
  RegistryId,
  InjectionBatch,
  CrossBorderTransferRequest,
  CertificateTransferProtocol,
  UDBTitleTransferStatus,
  RegistryTransferVerification,
} from '../../domain/registries';
import {
  ArrowLeftRight,
  ShieldCheck,
  Building2,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck2,
  Info,
  RefreshCw,
  Sliders,
  Send,
  Lock,
  Upload,
  Database,
  Activity,
  FileSpreadsheet,
  Check,
  Zap,
} from 'lucide-react';

export function RegistryHub() {
  // Navigation View State
  const [activeHubView, setActiveHubView] = useState<'OVERVIEW' | 'INGESTION' | 'LEDGER' | 'SIMULATOR'>('OVERVIEW');

  // Custom Ingested Batches & Ingestion State
  const [customBatches, setCustomBatches] = useState<InjectionBatch[]>([]);
  const [lastIngestResult, setLastIngestResult] = useState<RegistryImportResult | null>(null);
  const [isSyncingEnerginet, setIsSyncingEnerginet] = useState(false);
  const [energinetLiveStats, setEnerginetLiveStats] = useState<EnerginetLiveFlowData | null>(null);

  // State for flow ledger filters
  const [selectedRegistryFilter, setSelectedRegistryFilter] = useState<string>('ALL');
  const [selectedFeedstockFilter, setSelectedFeedstockFilter] = useState<string>('ALL');
  const [selectedGridFilter, setSelectedGridFilter] = useState<string>('ALL');
  const [selectedUdbFilter, setSelectedUdbFilter] = useState<string>('ALL');
  const [searchBatchQuery, setSearchBatchQuery] = useState<string>('');

  // Selected batch for detail modal
  const [selectedBatch, setSelectedBatch] = useState<InjectionBatch | null>(null);

  // Transfer Simulator State
  const [sourceRegistry, setSourceRegistry] = useState<RegistryId>('ENERGINET');
  const [targetRegistry, setTargetRegistry] = useState<RegistryId>('DENA');
  const [transferProtocol, setTransferProtocol] = useState<CertificateTransferProtocol>('ERGAR_COO');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>(['BATCH-DK-2026-001']);
  const [customTransferVolume, setCustomTransferVolume] = useState<number>(48500);
  const [udbRequired, setUdbRequired] = useState<boolean>(true);
  const [bilateralTreatySimulated, setBilateralTreatySimulated] = useState<boolean>(false);
  const [simulatorUdbState, setSimulatorUdbState] = useState<UDBTitleTransferStatus>('ESCROW_LOCKED');
  const [transferSuccessMessage, setTransferSuccessMessage] = useState<string | null>(null);

  // Overview metrics calculations
  const overviewMetrics = useMemo(() => {
    const totalIssuance = BASELINE_BALANCE_OF_TRADE.reduce((acc, r) => acc + r.totalIssuanceMWh, 0);
    const totalDomestic = BASELINE_BALANCE_OF_TRADE.reduce((acc, r) => acc + r.domesticConsumptionMWh, 0);
    const totalCancellations = BASELINE_BALANCE_OF_TRADE.reduce((acc, r) => acc + r.totalCancellationsMWh, 0);
    const totalEscrow = BASELINE_BALANCE_OF_TRADE.reduce((acc, r) => acc + r.activeEscrowMWh, 0);
    const netExporters = BASELINE_BALANCE_OF_TRADE.filter(r => r.tradeRole === 'NET_EXPORTER').length;
    const netImporters = BASELINE_BALANCE_OF_TRADE.filter(r => r.tradeRole === 'NET_IMPORTER').length;

    return {
      totalIssuanceTWh: (totalIssuance / 1000000).toFixed(2),
      totalDomesticTWh: (totalDomestic / 1000000).toFixed(2),
      totalCancellationsTWh: (totalCancellations / 1000000).toFixed(2),
      totalEscrowTWh: (totalEscrow / 1000000).toFixed(2),
      netExportersCount: netExporters,
      netImportersCount: netImporters,
    };
  }, []);

  const allBatches = useMemo(() => [...customBatches, ...BASELINE_INJECTION_BATCHES], [customBatches]);

  const handleSyncEnerginet = async () => {
    setIsSyncingEnerginet(true);
    try {
      const data = await fetchEnerginetBiomethaneInjections();
      setEnerginetLiveStats(data);
      if (data.batches.length > 0) {
        setCustomBatches(prev => [...data.batches, ...prev]);
      }
    } finally {
      setIsSyncingEnerginet(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const result = parseRegistryFile(content, file.name);
      setLastIngestResult(result);
      if (result.success && result.batches.length > 0) {
        setCustomBatches(prev => [...result.batches, ...prev]);
      }
    };
    reader.readAsText(file);
  };

  const handleSeedDenaSample = () => {
    const sampleCsv = `batchId;plantName;country;volumeMWh;feedstock;ci;scheme\n` +
      `DE-DENA-2026-881;Bioenergie Güstrow GmbH;DE;28400;Agricultural Manure;-98.5;ISCC EU\n` +
      `DE-DENA-2026-882;Könnern Biomethane Hub;DE;15200;Organic Waste Slurry;18.2;REDcert EU\n` +
      `DE-DENA-2026-883;EnviTec Biogas Zörbig;DE;19800;Swine Slurry & Manure;-104.1;ISCC EU`;
    const res = parseRegistryFile(sampleCsv, 'dena_Biogasregister_Export_Aug2026.csv', 'DENA');
    setLastIngestResult(res);
    setCustomBatches(prev => [...res.batches, ...prev]);
  };

  const handleSeedVertiCerSample = () => {
    const sampleCsv = `batchId,plantName,country,volumeMWh,feedstock,ci,scheme\n` +
      `NL-VERT-2026-441,Attero Wijster Bio-Upgrading,NL,24000,Source-Separated Bio-Waste,14.5,ISCC EU\n` +
      `NL-VERT-2026-442,Suiker Unie Vierverlaten,NL,16500,Sugar Beet Pulp Residue,21.0,ISCC EU`;
    const res = parseRegistryFile(sampleCsv, 'VertiCer_Export_Declaration_Q3.csv', 'VERTICER');
    setLastIngestResult(res);
    setCustomBatches(prev => [...res.batches, ...prev]);
  };

  // Filtered batches for Ledger
  const filteredBatches = useMemo(() => {
    return allBatches.filter(b => {
      if (selectedRegistryFilter !== 'ALL' && b.registryId !== selectedRegistryFilter) return false;
      if (selectedFeedstockFilter !== 'ALL') {
        if (selectedFeedstockFilter === 'MANURE' && !b.feedstockCategory.toLowerCase().includes('manure')) return false;
        if (selectedFeedstockFilter === 'BIOWASTE' && !b.feedstockCategory.toLowerCase().includes('waste')) return false;
        if (selectedFeedstockFilter === 'AGRO' && !b.feedstockCategory.toLowerCase().includes('residue') && !b.feedstockCategory.toLowerCase().includes('slurry') && !b.feedstockCategory.toLowerCase().includes('pulp')) return false;
        if (selectedFeedstockFilter === 'CROP' && b.annexClassification !== 'CROP') return false;
      }
      if (selectedGridFilter !== 'ALL' && b.gridInterconnectionStatus !== selectedGridFilter) return false;
      if (selectedUdbFilter === 'RECORDED' && !b.udbRegistrationId) return false;
      if (selectedUdbFilter === 'NOT_RECORDED' && b.udbRegistrationId) return false;
      if (searchBatchQuery.trim()) {
        const q = searchBatchQuery.toLowerCase();
        return (
          b.id.toLowerCase().includes(q) ||
          b.plantName.toLowerCase().includes(q) ||
          b.feedstockDetails.toLowerCase().includes(q) ||
          b.sustainabilityProofId.toLowerCase().includes(q) ||
          (b.udbRegistrationId && b.udbRegistrationId.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allBatches, selectedRegistryFilter, selectedFeedstockFilter, selectedGridFilter, selectedUdbFilter, searchBatchQuery]);

  // Real-time verification calculation for Transfer Simulator
  const liveVerification: RegistryTransferVerification = useMemo(() => {
    const req: CrossBorderTransferRequest = {
      id: `SIM-REQ-${Date.now()}`,
      sourceRegistry,
      sourceAccountId: `ACC-${sourceRegistry}-01`,
      targetRegistry,
      targetAccountId: `ACC-${targetRegistry}-01`,
      targetMarketId: `${targetRegistry}_QUOTA`,
      batchIds: selectedBatchIds,
      totalVolumeMWh: customTransferVolume,
      transferProtocol,
      udbTitleTransferRequired: udbRequired,
      bilateralTreatyActive: bilateralTreatySimulated,
      requestedAt: new Date().toISOString(),
    };

    const sourceBatches = BASELINE_INJECTION_BATCHES.filter(b => b.registryId === sourceRegistry);
    return verifyRegistryTransfer(req, sourceBatches);
  }, [sourceRegistry, targetRegistry, transferProtocol, selectedBatchIds, customTransferVolume, udbRequired, bilateralTreatySimulated]);

  // Handle batch toggle in simulator
  const toggleBatchSelection = (bId: string, vol: number) => {
    if (selectedBatchIds.includes(bId)) {
      const next = selectedBatchIds.filter(id => id !== bId);
      setSelectedBatchIds(next);
      setCustomTransferVolume(prev => Math.max(0, prev - vol));
    } else {
      setSelectedBatchIds([...selectedBatchIds, bId]);
      setCustomTransferVolume(prev => prev + vol);
    }
  };

  // Handle state advance in simulator
  const handleAdvanceSimulatorState = (action: 'SUBMIT' | 'LOCK_ESCROW' | 'TRANSFER_TITLE' | 'RESET') => {
    const nextState = advanceTitleTransferStatus(simulatorUdbState, action);
    setSimulatorUdbState(nextState);
    if (action === 'TRANSFER_TITLE') {
      setTransferSuccessMessage(`Title Transferred successfully! ${customTransferVolume.toLocaleString()} MWh settled via ${transferProtocol}.`);
    } else {
      setTransferSuccessMessage(null);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-stone-950 text-stone-200 overflow-y-auto">
      
      {/* 1. TOP OVERVIEW METRICS STRIP */}
      <div className="flex-none p-3.5 border-b border-stone-800 bg-stone-900/90">
        <div className="flex items-center justify-between gap-4 mb-2.5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-400" aria-hidden="true" />
            <h2 className="m-0 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-stone-100">
              European Registry & Balance of Trade Hub
            </h2>
            <span className="font-mono text-micro px-1.5 py-0.5 bg-teal-950 text-teal-300 border border-teal-800 rounded-xs">
              RED III Art. 31a / Reg (EU) 2024/2792
            </span>
          </div>

          <div className="flex items-center gap-3 font-mono text-micro text-stone-400">
            <span>Interconnected Perimeter: <strong className="text-emerald-400 font-num">7 EU Registries</strong></span>
            <span>·</span>
            <span>Third-Country Non-EU Boundary: <strong className="text-amber-400 font-num">1 Gated (UK GGCS)</strong></span>
          </div>
        </div>

        {/* 4 Metric Cards Grid */}
        <div className="grid grid-cols-4 gap-2.5">
          {/* Card 1 */}
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-none flex flex-col justify-between">
            <div className="font-mono text-micro uppercase tracking-[0.1em] text-stone-400">
              Total Pan-EU Registry Issuance
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-num text-lg font-bold text-stone-100">
                {overviewMetrics.totalIssuanceTWh} <span className="text-xs font-normal text-stone-400">TWh/y</span>
              </span>
              <span className="font-mono text-micro text-teal-400 bg-teal-950/80 px-1.5 py-0.5 border border-teal-800/80 rounded-xs">
                Active Verified
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-none flex flex-col justify-between">
            <div className="font-mono text-micro uppercase tracking-[0.1em] text-stone-400">
              Domestic Grid Consumption
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-num text-lg font-bold text-stone-100">
                {overviewMetrics.totalDomesticTWh} <span className="text-xs font-normal text-stone-400">TWh/y</span>
              </span>
              <span className="font-mono text-micro text-stone-300 bg-stone-800 px-1.5 py-0.5 rounded-xs">
                Mass Balance Settled
              </span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-none flex flex-col justify-between">
            <div className="font-mono text-micro uppercase tracking-[0.1em] text-stone-400">
              Active Cancellations & Surrenders
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="font-num text-lg font-bold text-stone-100">
                {overviewMetrics.totalCancellationsTWh} <span className="text-xs font-normal text-stone-400">TWh</span>
              </span>
              <span className="font-mono text-micro text-amber-400 bg-amber-950/80 px-1.5 py-0.5 border border-amber-800/80 rounded-xs">
                Compliance Surrender
              </span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-stone-950 border border-stone-800 p-2.5 rounded-none flex flex-col justify-between">
            <div className="font-mono text-micro uppercase tracking-[0.1em] text-stone-400">
              Balance of Trade Structure
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <div className="font-mono text-xs text-stone-200">
                <span className="font-num text-emerald-400 font-bold">{overviewMetrics.netExportersCount}</span> Exporters / <span className="font-num text-amber-400 font-bold">{overviewMetrics.netImportersCount}</span> Importers
              </div>
              <span className="font-mono text-micro text-sky-400 bg-sky-950/80 px-1.5 py-0.5 border border-sky-800/80 rounded-xs">
                {overviewMetrics.totalEscrowTWh} TWh Escrow
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. REGISTRY HUB SUB-NAVIGATION TABS */}
      <div className="flex-none flex items-center justify-between border-b border-stone-800 bg-stone-900 px-3.5 pt-2" role="tablist">
        <div className="flex items-center gap-1">
          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'OVERVIEW'}
            onClick={() => setActiveHubView('OVERVIEW')}
            className={`px-3 py-1.5 font-mono text-xs font-semibold border-t border-x rounded-t-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeHubView === 'OVERVIEW'
                ? 'bg-stone-950 text-teal-300 border-stone-700 font-bold'
                : 'bg-stone-900 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Balance of Trade</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'INGESTION'}
            onClick={() => setActiveHubView('INGESTION')}
            className={`px-3 py-1.5 font-mono text-xs font-semibold border-t border-x rounded-t-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeHubView === 'INGESTION'
                ? 'bg-stone-950 text-teal-300 border-stone-700 font-bold'
                : 'bg-stone-900 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Live Ingestion &amp; Data Feeds</span>
            {customBatches.length > 0 && (
              <span className="px-1 py-0.2 rounded-2xs bg-teal-950 text-teal-300 border border-teal-800 text-[9px] font-bold font-num">
                +{customBatches.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'LEDGER'}
            onClick={() => setActiveHubView('LEDGER')}
            className={`px-3 py-1.5 font-mono text-xs font-semibold border-t border-x rounded-t-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeHubView === 'LEDGER'
                ? 'bg-stone-950 text-teal-300 border-stone-700 font-bold'
                : 'bg-stone-900 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Batch Flow Ledger ({allBatches.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'SIMULATOR'}
            onClick={() => setActiveHubView('SIMULATOR')}
            className={`px-3 py-1.5 font-mono text-xs font-semibold border-t border-x rounded-t-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeHubView === 'SIMULATOR'
                ? 'bg-stone-950 text-teal-300 border-stone-700 font-bold'
                : 'bg-stone-900 text-stone-400 border-transparent hover:text-stone-200'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Title Transfer Simulator</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pb-1.5 font-mono text-[10px] text-stone-400">
          <span>European Hub Perimeter: <strong className="text-stone-200 font-num">8 Connected</strong></span>
        </div>
      </div>

      {/* VIEW 1: LIVE INGESTION & DATA FEEDS */}
      {activeHubView === 'INGESTION' && (
        <div className="p-4 space-y-4 flex-1">
          {/* Top Live Feeds Strip */}
          <div className="grid grid-cols-2 gap-4">
            {/* Live Energinet Open Data Card */}
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🇩🇰</span>
                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-100 m-0">
                        Denmark Energinet Gas DataHub API
                      </h4>
                      <span className="text-micro font-mono text-emerald-400 flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Open Public REST Endpoint Connected
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncEnerginet}
                    disabled={isSyncingEnerginet}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-teal-950 font-mono text-xs font-bold rounded-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEnerginet ? 'animate-spin' : ''}`} />
                    <span>{isSyncingEnerginet ? 'Polling API…' : 'Poll Live Injections'}</span>
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs bg-stone-950 p-2.5 rounded-xs border border-stone-800">
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase block">Daily Injections</span>
                    <span className="font-bold text-teal-300 font-num">
                      {energinetLiveStats ? `${energinetLiveStats.totalDailyInjectionMWh.toLocaleString()} MWh/d` : '62,450 MWh/d'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase block">Active Entry Nodes</span>
                    <span className="font-bold text-stone-200 font-num">
                      {energinetLiveStats ? `${energinetLiveStats.activeInjectionPoints} TSO Points` : '52 TSO Points'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-stone-500 uppercase block">Last Sync</span>
                    <span className="text-stone-400 text-[11px]">
                      {energinetLiveStats ? energinetLiveStats.timestamp.slice(11, 19) + ' UTC' : 'Ready to Poll'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 font-mono text-[10px] text-stone-500 border-t border-stone-800 pt-2 flex items-center justify-between">
                <span>Source: api.energidataservice.dk/dataset/Gasflow</span>
                <span className="text-teal-400">RED III Annex IX-A Manure Tracking</span>
              </div>
            </div>

            {/* Universal CSV / XML File Dropzone Card */}
            <div className="bg-stone-900 border border-stone-800 p-4 rounded-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-stone-100 m-0">
                    Universal Registry File Dropzone
                  </h4>
                </div>
                <p className="text-xs text-stone-400 mb-3">
                  Upload official monthly statements, account exports, or transfer declarations from dena Biogasregister, VertiCer, Enagás, or GSE.
                </p>

                <div className="relative border-2 border-dashed border-stone-700 hover:border-teal-500 bg-stone-950 p-4 rounded-xs text-center transition-colors">
                  <input
                    type="file"
                    accept=".csv,.json,.xml,.txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <Upload className="w-5 h-5 text-teal-400 mx-auto mb-1.5" />
                  <div className="font-mono text-xs text-stone-200 font-semibold">
                    Drag &amp; drop registry export or click to browse
                  </div>
                  <div className="font-mono text-[10px] text-stone-500 mt-0.5">
                    Supports .CSV, .JSON, .XML (dena, VertiCer, Energinet, Enagás)
                  </div>
                </div>
              </div>

              {/* Sample 1-Click Loaders */}
              <div className="mt-3 pt-2 border-t border-stone-800 flex items-center justify-between font-mono text-micro">
                <span className="text-stone-500">Quick Test Seeders:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSeedDenaSample}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-teal-300 border border-stone-700 rounded-xs cursor-pointer transition-colors"
                  >
                    🇩🇪 Seed dena Monthly (63.4k MWh)
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedVertiCerSample}
                    className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-teal-300 border border-stone-700 rounded-xs cursor-pointer transition-colors"
                  >
                    🇳🇱 Seed VertiCer Export (40.5k MWh)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Last Ingestion Result Breakdown */}
          {lastIngestResult && (
            <div className="bg-stone-900 border border-teal-800/80 p-4 rounded-xs space-y-3">
              <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-emerald-300 m-0">
                    Ingestion Successful: {lastIngestResult.sourceFileName}
                  </h4>
                  <span className="font-mono text-micro px-1.5 py-0.2 bg-teal-950 text-teal-300 border border-teal-800 rounded-xs">
                    {lastIngestResult.registryName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveHubView('LEDGER')}
                  className="font-mono text-xs text-teal-300 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>View in Batch Ledger →</span>
                </button>
              </div>

              <div className="grid grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-stone-950 p-2.5 rounded-xs border border-stone-800">
                  <span className="text-[10px] text-stone-500 uppercase block">Total Volume Ingested</span>
                  <span className="text-lg font-bold text-stone-100 font-num">
                    {lastIngestResult.totalVolumeMWh.toLocaleString()} <span className="text-xs font-normal text-stone-400">MWh</span>
                  </span>
                </div>

                <div className="bg-stone-950 p-2.5 rounded-xs border border-stone-800">
                  <span className="text-[10px] text-stone-500 uppercase block">Annex IX-A Advanced</span>
                  <span className="text-lg font-bold text-emerald-400 font-num">
                    {lastIngestResult.summary.annexIxAVolumeMWh.toLocaleString()} <span className="text-xs font-normal text-stone-400">MWh</span>
                  </span>
                </div>

                <div className="bg-stone-950 p-2.5 rounded-xs border border-stone-800">
                  <span className="text-[10px] text-stone-500 uppercase block">Weighted Average CI</span>
                  <span className={`text-lg font-bold font-num ${lastIngestResult.summary.averageCI <= 0 ? 'text-emerald-400' : 'text-stone-200'}`}>
                    {lastIngestResult.summary.averageCI > 0 ? `+${lastIngestResult.summary.averageCI}` : lastIngestResult.summary.averageCI} <span className="text-xs font-normal text-stone-400">gCO₂e/MJ</span>
                  </span>
                </div>

                <div className="bg-stone-950 p-2.5 rounded-xs border border-stone-800">
                  <span className="text-[10px] text-stone-500 uppercase block">Verified Batches</span>
                  <span className="text-lg font-bold text-teal-300 font-num">
                    {lastIngestResult.importedCount} <span className="text-xs font-normal text-stone-400">Consignments</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: BALANCE OF TRADE & FLOWS */}
      {(activeHubView === 'OVERVIEW' || activeHubView === 'SIMULATOR') && (
      <div className="p-3.5 grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3.5 border-b border-stone-800">
        
        {/* 2A. Balance of Trade Matrix */}
        <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-none p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-stone-100">
                European Balance of Trade Matrix
              </h3>
            </div>
            <span className="font-mono text-micro text-stone-400">
              Normalised Annual Trade Balances
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" aria-label="European Balance of Trade Table">
              <thead>
                <tr className="border-b border-stone-800 font-mono text-micro uppercase tracking-[0.08em] text-stone-400">
                  <th className="py-1.5 px-2 font-semibold">Registry / Country</th>
                  <th className="py-1.5 px-2 font-semibold">Trade Role</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Issuance (TWh)</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Domestic (TWh)</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Exports (TWh)</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Imports (TWh)</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Net Balance</th>
                  <th className="py-1.5 px-2 font-semibold">Export Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/60 font-sans text-xs">
                {BASELINE_BALANCE_OF_TRADE.map(bot => {
                  const issuanceTWh = (bot.totalIssuanceMWh / 1000000).toFixed(2);
                  const domesticTWh = (bot.domesticConsumptionMWh / 1000000).toFixed(2);
                  const exportTWh = (bot.grossExportMWh / 1000000).toFixed(2);
                  const importTWh = (bot.grossImportMWh / 1000000).toFixed(2);
                  const netTWh = (bot.netTradeBalanceMWh / 1000000).toFixed(2);
                  const isPositive = bot.netTradeBalanceMWh > 0;
                  const isNegative = bot.netTradeBalanceMWh < 0;

                  return (
                    <tr key={bot.registryId} className="hover:bg-stone-800/40 transition-colors">
                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-meta font-semibold text-stone-300 w-6">
                            {bot.countryCode}
                          </span>
                          <div>
                            <div className="font-medium text-stone-200">{bot.registryName}</div>
                            <div className="font-mono text-micro text-stone-500">{REGISTRY_METADATA_TABLE[bot.registryId].hubConnection}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-1.5 px-2">
                        {bot.tradeRole === 'NET_EXPORTER' && (
                          <span className="font-mono text-micro px-1.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-xs font-semibold">
                            NET EXPORTER
                          </span>
                        )}
                        {bot.tradeRole === 'NET_IMPORTER' && (
                          <span className="font-mono text-micro px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded-xs font-semibold">
                            NET IMPORTER
                          </span>
                        )}
                        {bot.tradeRole === 'BALANCED_DOMESTIC' && (
                          <span className="font-mono text-micro px-1.5 py-0.5 bg-stone-800 text-stone-300 border border-stone-700 rounded-xs">
                            BALANCED
                          </span>
                        )}
                      </td>

                      <td className="py-1.5 px-2 text-right font-num text-stone-200">
                        {issuanceTWh}
                      </td>

                      <td className="py-1.5 px-2 text-right font-num text-stone-300">
                        {domesticTWh}
                      </td>

                      <td className="py-1.5 px-2 text-right font-num text-emerald-400">
                        {exportTWh}
                      </td>

                      <td className="py-1.5 px-2 text-right font-num text-amber-400">
                        {importTWh}
                      </td>

                      <td className="py-1.5 px-2 text-right font-num font-bold">
                        <span className={isPositive ? 'text-emerald-400' : isNegative ? 'text-amber-400' : 'text-stone-300'}>
                          {isPositive ? `+${netTWh}` : netTWh} TWh
                        </span>
                      </td>

                      <td className="py-1.5 px-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-stone-950 h-1.5 rounded-full overflow-hidden border border-stone-800">
                            <div
                              className={`h-full ${isPositive ? 'bg-emerald-500' : 'bg-teal-600'}`}
                              style={{ width: `${Math.min(100, Math.max(0, bot.exportSharePercent))}%` }}
                            />
                          </div>
                          <span className="font-num font-mono text-micro text-stone-400">
                            {bot.exportSharePercent.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2B. Cross-Border Title Transfer Verifier & Simulator */}
        <div className="flex flex-col bg-stone-900 border border-stone-800 rounded-none p-3">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="w-4 h-4 text-teal-400" aria-hidden="true" />
              <h3 className="m-0 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-stone-100">
                Cross-Border Transfer & UDB Verifier
              </h3>
            </div>
            <button
              type="button"
              onClick={() => handleAdvanceSimulatorState('RESET')}
              aria-label="Reset simulation"
              className="flex items-center gap-1 font-mono text-micro text-stone-400 hover:text-stone-100 bg-stone-950 border border-stone-800 px-2 py-0.5 rounded-xs transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" aria-hidden="true" /> Reset
            </button>
          </div>

          {/* Form Controls */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Source Registry */}
            <div>
              <label htmlFor="source-registry-select" className="block font-mono text-micro uppercase tracking-[0.08em] text-stone-400 mb-1">
                Source Registry (Origin)
              </label>
              <select
                id="source-registry-select"
                value={sourceRegistry}
                onChange={e => setSourceRegistry(e.target.value as RegistryId)}
                className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2 py-1 rounded-xs outline-none focus:border-teal-500"
              >
                <option value="ENERGINET">Energinet (DK - Denmark)</option>
                <option value="DENA">dena Biogasregister (DE - Germany)</option>
                <option value="VERTICER">VertiCer (NL - Netherlands)</option>
                <option value="ENAGAS">Enagás GTS (ES - Spain)</option>
                <option value="GSE">GSE Piattaforma (IT - Italy)</option>
                <option value="EEX">EEX Registry (FR - France)</option>
                <option value="AGCS">AGCS Registry (AT - Austria)</option>
                <option value="GGCS_UK">GGCS / RTFO (GB - United Kingdom)</option>
              </select>
            </div>

            {/* Target Registry */}
            <div>
              <label htmlFor="target-registry-select" className="block font-mono text-micro uppercase tracking-[0.08em] text-stone-400 mb-1">
                Target Registry (Destination)
              </label>
              <select
                id="target-registry-select"
                value={targetRegistry}
                onChange={e => setTargetRegistry(e.target.value as RegistryId)}
                className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2 py-1 rounded-xs outline-none focus:border-teal-500"
              >
                <option value="DENA">dena Biogasregister (DE THG)</option>
                <option value="VERTICER">VertiCer (NL ERE)</option>
                <option value="ENERGINET">Energinet (DK GO)</option>
                <option value="ENAGAS">Enagás GTS (ES GdO)</option>
                <option value="GSE">GSE (IT CIC)</option>
                <option value="EEX">EEX (FR CPB)</option>
                <option value="AGCS">AGCS (AT GO)</option>
                <option value="GGCS_UK">GGCS / RTFO (UK)</option>
              </select>
            </div>

            {/* Transfer Protocol */}
            <div>
              <label htmlFor="transfer-protocol-select" className="block font-mono text-micro uppercase tracking-[0.08em] text-stone-400 mb-1">
                Transfer Protocol
              </label>
              <select
                id="transfer-protocol-select"
                value={transferProtocol}
                onChange={e => setTransferProtocol(e.target.value as CertificateTransferProtocol)}
                className="w-full bg-stone-950 border border-stone-800 text-stone-200 text-xs px-2 py-1 rounded-xs outline-none focus:border-teal-500"
              >
                <option value="ERGAR_COO">ERGaR CoO (Certificate of Origin)</option>
                <option value="UDB_DIRECT_TRANSFER">UDB Single Area Direct Transfer</option>
                <option value="AIB_EECS_GAS">AIB EECS Gas Scheme</option>
                <option value="BILATERAL_RECOGNITION">Bilateral Recognition (RED III Art. 31a)</option>
                <option value="DOMESTIC_ONLY">Domestic Only (No cross-border)</option>
              </select>
            </div>

            {/* Transfer Volume */}
            <div>
              <label htmlFor="transfer-volume-input" className="block font-mono text-micro uppercase tracking-[0.08em] text-stone-400 mb-1">
                Transfer Volume (MWh)
              </label>
              <input
                id="transfer-volume-input"
                type="number"
                value={customTransferVolume}
                onChange={e => setCustomTransferVolume(Number(e.target.value))}
                className="w-full bg-stone-950 border border-stone-800 text-stone-200 font-num text-xs px-2 py-1 rounded-xs outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Scenario Toggles */}
          <div className="mt-2 pt-2 border-t border-stone-800 flex items-center justify-between text-micro font-mono">
            <label className="flex items-center gap-1.5 cursor-pointer text-stone-300">
              <input
                type="checkbox"
                checked={udbRequired}
                onChange={e => setUdbRequired(e.target.checked)}
                className="accent-teal-500"
              />
              UDB Title Transfer Escrow Required
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-stone-300">
              <input
                type="checkbox"
                checked={bilateralTreatySimulated}
                onChange={e => setBilateralTreatySimulated(e.target.checked)}
                className="accent-teal-500"
              />
              Simulate UK-EU Bilateral Treaty Active
            </label>
          </div>

          {/* Real-time Verification Output Box */}
          <div className="mt-2.5 p-2.5 bg-stone-950 border border-stone-800 rounded-none">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                {liveVerification.isCompatible ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" aria-hidden="true" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400" aria-hidden="true" />
                )}
                <span className={`font-mono text-xs font-semibold ${liveVerification.isCompatible ? 'text-emerald-300' : 'text-red-300'}`}>
                  {liveVerification.isCompatible ? 'TRANSFER COMPATIBLE' : 'TRANSFER BLOCKED'}
                </span>
              </div>

              {/* UDB Status Chip */}
              <span className={`font-mono text-micro font-semibold px-2 py-0.5 border rounded-xs ${
                liveVerification.udbTitleTransferStatus === 'ESCROW_LOCKED'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : liveVerification.udbTitleTransferStatus === 'TITLE_TRANSFERRED'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                  : liveVerification.udbTitleTransferStatus.startsWith('REJECTED')
                  ? 'bg-red-950 text-red-300 border-red-800'
                  : 'bg-stone-800 text-stone-300 border-stone-700'
              }`}>
                {simulatorUdbState !== 'DRAFT' && liveVerification.isCompatible ? simulatorUdbState : liveVerification.udbTitleTransferStatus}
              </span>
            </div>

            {/* Blocking reasons or notes */}
            {liveVerification.blockingReasons.length > 0 ? (
              <div className="space-y-1 mt-1">
                {liveVerification.blockingReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-1 text-red-400 text-micro leading-snug">
                    <AlertTriangle className="w-3 h-3 flex-none mt-0.5" aria-hidden="true" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1 mt-1">
                {liveVerification.auditNotes.map((note, idx) => (
                  <div key={idx} className="flex items-start gap-1 text-emerald-400 text-micro leading-snug">
                    <CheckCircle2 className="w-3 h-3 flex-none mt-0.5" aria-hidden="true" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Statutory Citations */}
            <div className="mt-2 pt-1.5 border-t border-stone-800/80 font-mono text-micro text-stone-400">
              <span className="font-semibold text-stone-400">Legal Citations:</span> {liveVerification.statutoryCitations.join(' · ')}
            </div>

            {/* Action Buttons for Title Transfer Advancement */}
            {liveVerification.isCompatible && (
              <div className="mt-2.5 pt-2 border-t border-stone-800 flex items-center justify-between">
                <span className="font-mono text-micro text-stone-400">
                  State: <strong className="text-stone-200">{simulatorUdbState}</strong>
                </span>

                <div className="flex gap-1.5">
                  {simulatorUdbState === 'DRAFT' && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceSimulatorState('SUBMIT')}
                      className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-100 font-mono text-micro font-semibold rounded-xs transition-colors cursor-pointer"
                    >
                      Submit Transfer
                    </button>
                  )}

                  {(simulatorUdbState === 'DRAFT' || simulatorUdbState === 'SUBMITTED') && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceSimulatorState('LOCK_ESCROW')}
                      className="px-2 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-200 font-mono text-micro font-semibold rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" aria-hidden="true" /> Lock Escrow
                    </button>
                  )}

                  {simulatorUdbState === 'ESCROW_LOCKED' && (
                    <button
                      type="button"
                      onClick={() => handleAdvanceSimulatorState('TRANSFER_TITLE')}
                      className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-micro font-bold rounded-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" aria-hidden="true" /> Transfer Title
                    </button>
                  )}
                </div>
              </div>
            )}

            {transferSuccessMessage && (
              <div className="mt-2 p-1.5 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-micro font-mono">
                {transferSuccessMessage}
              </div>
            )}
          </div>
        </div>
      </div>
      )}

      {/* 3. BOTTOM SECTION: REGISTRY FLOW LEDGER & BATCH EXPLORER */}
      {(activeHubView === 'OVERVIEW' || activeHubView === 'LEDGER') && (
      <div className="flex-1 flex flex-col p-3.5 min-h-[300px]">
        {/* Ledger Header & Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 mb-2.5 border-b border-stone-800">
          <div className="flex items-center gap-2.5">
            <Building2 className="w-4 h-4 text-teal-400" aria-hidden="true" />
            <h3 className="m-0 font-mono text-xs font-bold uppercase tracking-[0.1em] text-stone-100 flex items-center gap-2">
              <span>European Registry Injection Flow Ledger</span>
              <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full font-bold">
                {filteredBatches.length} Batches
              </span>
            </h3>
          </div>

          {/* Quick Live Feed Sync Button & Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Energinet Sync Button */}
            <button
              type="button"
              onClick={handleSyncEnerginet}
              disabled={isSyncingEnerginet}
              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 disabled:bg-teal-800 text-stone-950 font-mono text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm disabled:cursor-wait"
              title="Fetch live hourly injection telemetry from Energinet DataHub API"
            >
              <Zap className={`w-3.5 h-3.5 ${isSyncingEnerginet ? 'animate-bounce' : ''}`} />
              <span>{isSyncingEnerginet ? 'Syncing...' : '⚡ Sync Live Energinet Feed (Hourly)'}</span>
            </button>

            {/* Search */}
            <input
              type="text"
              placeholder="Filter batch, plant, proof ID…"
              aria-label="Filter injection batches"
              value={searchBatchQuery}
              onChange={e => setSearchBatchQuery(e.target.value)}
              className="bg-stone-900 border border-stone-800 text-stone-200 text-xs px-2.5 py-1 rounded-md outline-none focus:border-teal-500 w-[170px]"
            />

            {/* Registry Filter */}
            <select
              aria-label="Filter by registry"
              value={selectedRegistryFilter}
              onChange={e => setSelectedRegistryFilter(e.target.value)}
              className="bg-stone-900 border border-stone-800 text-stone-300 text-xs px-2 py-1 rounded-md outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Registries</option>
              <option value="ENERGINET">Energinet (DK)</option>
              <option value="DENA">dena (DE)</option>
              <option value="VERTICER">VertiCer (NL)</option>
              <option value="ENAGAS">Enagás (ES)</option>
              <option value="GSE">GSE (IT)</option>
              <option value="EEX">EEX (FR)</option>
              <option value="GGCS_UK">GGCS (UK)</option>
            </select>

            {/* Feedstock Filter */}
            <select
              aria-label="Filter by feedstock"
              value={selectedFeedstockFilter}
              onChange={e => setSelectedFeedstockFilter(e.target.value)}
              className="bg-stone-900 border border-stone-800 text-stone-300 text-xs px-2 py-1 rounded-md outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="ALL">All Feedstocks</option>
              <option value="MANURE">Manure &amp; Slurry (IX-A)</option>
              <option value="BIOWASTE">Municipal Organic (IX-A)</option>
              <option value="AGRO">Agro Residues &amp; Pulp (IX-A)</option>
              <option value="CROP">Energy Crops (Crop)</option>
            </select>
          </div>
        </div>

        {/* Ledger Table with Exact Timestamp / Metering Period Column */}
        <div className="flex-1 overflow-y-auto border border-stone-800 bg-stone-900/90 rounded-lg">
          <table className="w-full text-left border-collapse" aria-label="Registry Injection Flow Ledger">
            <thead className="sticky top-0 bg-stone-950 border-b border-stone-800 font-mono text-[10px] uppercase tracking-[0.08em] text-stone-400 z-10">
              <tr>
                <th className="py-2.5 px-3 font-bold">Batch ID</th>
                <th className="py-2.5 px-2.5 font-bold text-teal-400">Metering Date / UTC</th>
                <th className="py-2.5 px-3 font-bold">Origin &amp; Facility</th>
                <th className="py-2.5 px-3 font-bold">Registry &amp; Grid Point</th>
                <th className="py-2.5 px-3 text-right font-bold">Volume (MWh)</th>
                <th className="py-2.5 px-3 text-right font-bold">Volume (Nm³)</th>
                <th className="py-2.5 px-3 font-bold">Feedstock &amp; Annex</th>
                <th className="py-2.5 px-3 text-right font-bold">Verified CI</th>
                <th className="py-2.5 px-3 font-bold">Sustainability Proof</th>
                <th className="py-2.5 px-3 font-bold">UDB Registration</th>
                <th className="py-2.5 px-3 text-center font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-sans text-xs">
              {filteredBatches.map(batch => {
                const isSelected = selectedBatchIds.includes(batch.id);
                const isNegativeCI = batch.verifiedCI < 0;
                const isLive = batch.id.startsWith('ENERGINET-LIVE');

                return (
                  <tr
                    key={batch.id}
                    onClick={() => setSelectedBatch(batch)}
                    className="hover:bg-stone-800/50 cursor-pointer transition-colors"
                  >
                    {/* Batch ID */}
                    <td className="py-2.5 px-3 font-mono text-[11px] font-bold text-stone-200">
                      <div className="flex items-center gap-1.5">
                        {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live Hourly Data" />}
                        <span>{batch.id}</span>
                      </div>
                    </td>

                    {/* Metering Date / Timestamp */}
                    <td className="py-2.5 px-2.5 font-mono text-[11px] text-teal-300 font-semibold whitespace-nowrap">
                      {batch.meteringPeriod?.startDate || '2026-08-18'}
                    </td>

                    {/* Origin & Facility */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-stone-400 w-5">
                          {batch.originCountry}
                        </span>
                        <div className="font-medium text-stone-100 truncate max-w-[150px]">
                          {batch.plantName}
                        </div>
                      </div>
                    </td>

                    {/* Registry & Grid Point */}
                    <td className="py-2 px-2.5">
                      <div className="font-mono text-micro text-stone-300">{batch.registryId}</div>
                      <div className="font-mono text-micro text-stone-500">{batch.injectionPointId}</div>
                    </td>

                    {/* Volume MWh */}
                    <td className="py-2 px-2.5 text-right font-num font-bold text-stone-100">
                      {batch.volumeMWh.toLocaleString()}
                    </td>

                    {/* Volume Nm3 */}
                    <td className="py-2 px-2.5 text-right font-num text-stone-400">
                      {batch.volumeNm3.toLocaleString()}
                    </td>

                    {/* Feedstock & Annex */}
                    <td className="py-2 px-2.5">
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-stone-200 truncate max-w-[140px]">
                          {batch.feedstockCategory}
                        </span>
                        <span className={`font-mono text-micro px-1 py-0.2 rounded-xs font-semibold ${
                          batch.annexClassification === 'IX_A'
                            ? 'bg-teal-950 text-teal-300 border border-teal-800'
                            : 'bg-stone-800 text-stone-400'
                        }`}>
                          {batch.annexClassification}
                        </span>
                      </div>
                    </td>

                    {/* Verified CI */}
                    <td className="py-2 px-2.5 text-right font-num font-bold">
                      <span className={isNegativeCI ? 'text-emerald-400' : 'text-stone-300'}>
                        {batch.verifiedCI.toFixed(1)} <span className="text-micro font-normal text-stone-500">g/MJ</span>
                      </span>
                    </td>

                    {/* Sustainability Proof */}
                    <td className="py-2 px-2.5">
                      <div className="font-mono text-micro text-stone-300 truncate max-w-[150px]">
                        {batch.sustainabilityProofId}
                      </div>
                      <div className="font-mono text-micro text-stone-500">{batch.certificationScheme}</div>
                    </td>

                    {/* UDB Registration */}
                    <td className="py-2 px-2.5">
                      {batch.udbRegistrationId ? (
                        <div className="flex items-center gap-1 font-mono text-micro text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 border border-emerald-800/80 rounded-xs w-fit">
                          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          <span>{batch.udbRegistrationId}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 font-mono text-micro text-red-400 bg-red-950/80 px-1.5 py-0.5 border border-red-800/80 rounded-xs w-fit">
                          <XCircle className="w-3 h-3" aria-hidden="true" />
                          <span>NON-EU / EXCLUDED</span>
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-2 px-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        type="button"
                        aria-label={`Select batch ${batch.id} for transfer`}
                        onClick={() => toggleBatchSelection(batch.id, batch.volumeMWh)}
                        className={`font-mono text-micro px-2 py-0.5 rounded-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-600 text-teal-950 font-bold'
                            : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100'
                        }`}
                      >
                        {isSelected ? 'SELECTED' : 'SELECT'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* BATCH DETAIL MODAL */}
      {selectedBatch && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Registry facility detail"
          className="fixed inset-0 z-[1000] bg-black/75 flex items-center justify-center p-6"
        >
          <div className="w-full max-w-[620px] bg-stone-950 border border-stone-700 shadow-2xl rounded-none flex flex-col">
            {/* Modal Header */}
            <div className="p-3.5 px-4 bg-stone-900 border-b border-stone-800 flex items-start justify-between gap-4">
              <div>
                <h3 className="m-0 text-base font-semibold leading-snug text-stone-100">
                  {selectedBatch.id} · {selectedBatch.plantName}
                </h3>
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 mt-0.5">
                  {selectedBatch.originCountry} · {selectedBatch.registryId} · INJECTION RECORD
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`font-mono text-micro font-bold px-1.5 py-0.5 border ${
                  selectedBatch.status === 'ISSUED'
                    ? 'text-emerald-400 bg-emerald-950 border-emerald-800'
                    : 'text-stone-400 bg-stone-900 border-stone-700'
                }`}>
                  {selectedBatch.status}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  aria-label="Close batch detail"
                  className="bg-transparent border border-stone-700 text-stone-400 hover:text-stone-100 hover:bg-stone-800 px-2 py-0.5 font-mono text-xs cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-[1px] bg-stone-800 border-b border-stone-800">
              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Volume MWh</div>
                <div className="font-num text-sm font-bold text-stone-100 mt-0.5">
                  {selectedBatch.volumeMWh.toLocaleString()} MWh
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Volume Nm³ / GCV</div>
                <div className="font-num text-sm font-semibold text-stone-200 mt-0.5">
                  {selectedBatch.volumeNm3.toLocaleString()} Nm³ @ {selectedBatch.grossCalorificValueKwhNm3} kWh/Nm³
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Verified Carbon Intensity</div>
                <div className="font-num text-sm font-bold text-emerald-400 mt-0.5">
                  {selectedBatch.verifiedCI.toFixed(1)} gCO₂e/MJ
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Annex Classification</div>
                <div className="font-mono text-xs font-semibold text-teal-300 mt-0.5">
                  Annex {selectedBatch.annexClassification} (RED III)
                </div>
              </div>

              <div className="bg-stone-950 p-2.5 col-span-2">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Feedstock Composition</div>
                <div className="text-xs font-medium text-stone-200 mt-0.5">
                  {selectedBatch.feedstockDetails}
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">Sustainability Proof ID</div>
                <div className="font-mono text-xs text-stone-200 mt-0.5 truncate">
                  {selectedBatch.sustainabilityProofId} ({selectedBatch.certificationScheme})
                </div>
              </div>

              <div className="bg-stone-950 p-2.5">
                <div className="font-mono text-micro tracking-[0.1em] text-stone-400 uppercase">UDB Registration ID</div>
                <div className="font-mono text-xs text-stone-200 mt-0.5">
                  {selectedBatch.udbRegistrationId || 'N/A — Non-EU / Excluded Grid'}
                </div>
              </div>
            </div>

            {/* Modal Footer Note */}
            <div className="p-3 bg-stone-900 flex items-center justify-between">
              <div className="font-mono text-micro text-stone-400">
                Metering Period: {selectedBatch.meteringPeriod.startDate} → {selectedBatch.meteringPeriod.endDate}
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleBatchSelection(selectedBatch.id, selectedBatch.volumeMWh);
                  setSelectedBatch(null);
                }}
                className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-teal-950 font-mono text-micro font-bold rounded-xs cursor-pointer transition-colors"
              >
                {selectedBatchIds.includes(selectedBatch.id) ? 'Deselect from Transfer' : 'Add to Transfer Simulator'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
