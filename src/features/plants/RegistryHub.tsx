import React, { useState, useMemo, useEffect } from 'react';
import {
  REGISTRY_METADATA_TABLE,
  BASELINE_INJECTION_BATCHES,
  BASELINE_BALANCE_OF_TRADE,
  verifyRegistryTransfer,
  advanceTitleTransferStatus,
  parseRegistryFile,
  RegistryImportResult,
  fetchEnerginetBiomethaneInjections,
  EnerginetLiveFlowData,
  fetchPanEuropeanTsoTelemetry,
  TsoNetworkMetrics,
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
  RefreshCw,
  Send,
  Lock,
  Upload,
  Database,
  Activity,
  FileSpreadsheet,
  Check,
  Zap,
  Radio,
  Clock,
  Globe2,
} from 'lucide-react';
import { showToast } from '../../app/DeskToastContainer';

export function RegistryHub() {
  // Navigation View State
  const [activeHubView, setActiveHubView] = useState<'OVERVIEW' | 'TELEMETRY' | 'INGESTION' | 'LEDGER' | 'SIMULATOR'>('OVERVIEW');

  // Custom Ingested Batches & Ingestion State
  const [customBatches, setCustomBatches] = useState<InjectionBatch[]>([]);
  const [lastIngestResult, setLastIngestResult] = useState<RegistryImportResult | null>(null);
  const [isSyncingEnerginet, setIsSyncingEnerginet] = useState(false);
  const [energinetLiveStats, setEnerginetLiveStats] = useState<EnerginetLiveFlowData | null>(null);

  // Live Flow Telemetry State
  const [tsoMetrics, setTsoMetrics] = useState<TsoNetworkMetrics | null>(null);
  const [isSyncingAllTso, setIsSyncingAllTso] = useState(false);
  const [autoPollInterval, setAutoPollInterval] = useState<number>(30); // in seconds, 0 = Off
  const [telemetrySearch, setTelemetrySearch] = useState('');
  const [telemetryCountryFilter, setTelemetryCountryFilter] = useState('ALL');
  const [telemetryGridFilter, setTelemetryGridFilter] = useState('ALL');
  const [lastTelemetrySync, setLastTelemetrySync] = useState<string>('');

  // State for flow ledger filters
  const [selectedRegistryFilter, setSelectedRegistryFilter] = useState<string>('ALL');
  const [selectedFeedstockFilter, setSelectedFeedstockFilter] = useState<string>('ALL');
  const [selectedGridFilter] = useState<string>('ALL');
  const [selectedUdbFilter] = useState<string>('ALL');
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

  const allRegistriesList = useMemo(() => Object.values(REGISTRY_METADATA_TABLE), []);

  // Fetch Live TSO Telemetry
  const syncTelemetryData = async () => {
    setIsSyncingAllTso(true);
    try {
      const data = await fetchPanEuropeanTsoTelemetry();
      setTsoMetrics(data);
      setLastTelemetrySync(new Date().toLocaleTimeString());
    } finally {
      setIsSyncingAllTso(false);
    }
  };

  // Initial Telemetry Fetch & Auto-poll
  useEffect(() => {
    syncTelemetryData();
  }, []);

  useEffect(() => {
    if (autoPollInterval <= 0) return;
    const interval = setInterval(() => {
      syncTelemetryData();
    }, autoPollInterval * 1000);
    return () => clearInterval(interval);
  }, [autoPollInterval]);

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
      totalRegistriesCount: BASELINE_BALANCE_OF_TRADE.length,
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
      showToast(`Energinet sync complete · ${data.activeInjectionPoints} TSO points updated`);
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
        showToast(`Imported ${result.importedCount} batches (${(result.totalVolumeMWh / 1000).toFixed(1)}k MWh)`);
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
    showToast('Loaded 3 sample dena batches (63.4k MWh)');
  };

  const handleSeedVertiCerSample = () => {
    const sampleCsv = `batchId,plantName,country,volumeMWh,feedstock,ci,scheme\n` +
      `NL-VERT-2026-441,Attero Wijster Bio-Upgrading,NL,24000,Source-Separated Bio-Waste,14.5,ISCC EU\n` +
      `NL-VERT-2026-442,Suiker Unie Vierverlaten,NL,16500,Sugar Beet Pulp Residue,21.0,ISCC EU`;
    const res = parseRegistryFile(sampleCsv, 'VertiCer_Export_Declaration_Q3.csv', 'VERTICER');
    setLastIngestResult(res);
    setCustomBatches(prev => [...res.batches, ...prev]);
    showToast('Loaded 2 sample VertiCer batches (40.5k MWh)');
  };

  // Filtered batches for Ledger
  const filteredBatches = useMemo(() => {
    return allBatches.filter(b => {
      if (selectedRegistryFilter !== 'ALL' && b.registryId !== selectedRegistryFilter) return false;
      if (selectedFeedstockFilter !== 'ALL') {
        if (selectedFeedstockFilter === 'MANURE' && !b.feedstockCategory.toLowerCase().includes('manure') && !b.feedstockCategory.toLowerCase().includes('slurry')) return false;
        if (selectedFeedstockFilter === 'BIOWASTE' && !b.feedstockCategory.toLowerCase().includes('waste') && !b.feedstockCategory.toLowerCase().includes('ofmsw')) return false;
        if (selectedFeedstockFilter === 'AGRO' && !b.feedstockCategory.toLowerCase().includes('residue') && !b.feedstockCategory.toLowerCase().includes('slurry') && !b.feedstockCategory.toLowerCase().includes('pulp') && !b.feedstockCategory.toLowerCase().includes('cive')) return false;
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

  // Filtered Telemetry Points
  const filteredTelemetryPoints = useMemo(() => {
    if (!tsoMetrics) return [];
    return tsoMetrics.points.filter(p => {
      if (telemetryCountryFilter !== 'ALL' && p.countryCode !== telemetryCountryFilter) return false;
      if (telemetryGridFilter !== 'ALL' && p.gridType !== telemetryGridFilter) return false;
      if (telemetrySearch.trim()) {
        const q = telemetrySearch.toLowerCase();
        return (
          p.nodeName.toLowerCase().includes(q) ||
          p.tsoName.toLowerCase().includes(q) ||
          p.tsoCode.toLowerCase().includes(q) ||
          p.feedstockCategory.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [tsoMetrics, telemetryCountryFilter, telemetryGridFilter, telemetrySearch]);

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
      const msg = `Title Transferred successfully · ${customTransferVolume.toLocaleString()} MWh settled via ${transferProtocol}`;
      setTransferSuccessMessage(msg);
      showToast(msg);
    } else {
      setTransferSuccessMessage(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
      
      {/* 1. TOP OVERVIEW METRICS STRIP */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '16px 18px',
          borderBottom: '2px solid var(--color-divider)',
          backgroundColor: 'var(--color-surface)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--color-accent)' }} aria-hidden="true" />
            <h3 className="ptitle">European Registry &amp; Balance of Trade Hub</h3>
            <span className="chip chip-a">RED III Art. 31a / Reg (EU) 2024/2792</span>
          </div>
          <div className="subttl" style={{ marginTop: '4px' }}>
            22 national mass balance registries · Single Area Direct transfers, ERGaR CoO, and Third-Country bilateral gateways
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px' }} className="mut">
          <span>Pan-EU Network: <strong style={{ color: 'var(--color-text)' }} className="num">{overviewMetrics.totalRegistriesCount} National Registries</strong></span>
          <span>·</span>
          <span>Interconnected EU Single Area: <strong style={{ color: 'var(--color-text)' }} className="num">19 Hubs</strong></span>
          <span>·</span>
          <span>Third-Country Gated: <strong style={{ color: 'var(--color-status-warn-text)' }} className="num">3 (UK / CH / NO)</strong></span>
        </div>
      </div>

      {/* 4 Metric Cards Strip */}
      <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}>
        <div>
          <div className="eyebrow">Total Pan-EU Registry Issuance</div>
          <div className="big num">
            {overviewMetrics.totalIssuanceTWh} <span style={{ fontSize: '14px', fontWeight: 400 }} className="dim">TWh/y</span>
          </div>
          <div className="subttl">22 Jurisdictions Verified</div>
        </div>

        <div>
          <div className="eyebrow">Domestic Grid Consumption</div>
          <div className="big num">
            {overviewMetrics.totalDomesticTWh} <span style={{ fontSize: '14px', fontWeight: 400 }} className="dim">TWh/y</span>
          </div>
          <div className="subttl">Mass Balance Settled</div>
        </div>

        <div>
          <div className="eyebrow">Active Cancellations &amp; Surrenders</div>
          <div className="big num">
            {overviewMetrics.totalCancellationsTWh} <span style={{ fontSize: '14px', fontWeight: 400 }} className="dim">TWh</span>
          </div>
          <div className="subttl">Compliance &amp; Voluntary Surrender</div>
        </div>

        <div>
          <div className="eyebrow">Balance of Trade Structure</div>
          <div className="big num">
            <span style={{ color: 'var(--color-status-pos-text)' }}>{overviewMetrics.netExportersCount}</span>
            <span style={{ fontSize: '16px', color: 'var(--color-dim)', margin: '0 4px' }}>/</span>
            <span style={{ color: 'var(--color-status-warn-text)' }}>{overviewMetrics.netImportersCount}</span>
            <span style={{ fontSize: '12px', fontWeight: 400, marginLeft: '6px' }} className="dim">Exp/Imp</span>
          </div>
          <div className="subttl">{overviewMetrics.totalEscrowTWh} TWh Active Escrow</div>
        </div>
      </div>

      {/* 2. REGISTRY HUB SUB-NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 18px',
          borderBottom: '1px solid var(--color-divider)',
          backgroundColor: 'var(--color-panel-header)',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'OVERVIEW'}
            onClick={() => setActiveHubView('OVERVIEW')}
            className={`chip ${activeHubView === 'OVERVIEW' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Scale style={{ width: '13px', height: '13px' }} />
            <span>Balance of Trade Matrix ({BASELINE_BALANCE_OF_TRADE.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'TELEMETRY'}
            onClick={() => setActiveHubView('TELEMETRY')}
            className={`chip ${activeHubView === 'TELEMETRY' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Radio style={{ width: '13px', height: '13px', color: 'var(--color-status-pos-text)' }} />
            <span>Live Flow Telemetry &amp; TSO Feeds</span>
            <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} />
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'INGESTION'}
            onClick={() => setActiveHubView('INGESTION')}
            className={`chip ${activeHubView === 'INGESTION' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Upload style={{ width: '13px', height: '13px' }} />
            <span>Ingestion &amp; Statements</span>
            {customBatches.length > 0 && (
              <span className="chip chip-pos" style={{ padding: '1px 4px', fontSize: '9px', fontWeight: 700 }}>
                +{customBatches.length}
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'LEDGER'}
            onClick={() => setActiveHubView('LEDGER')}
            className={`chip ${activeHubView === 'LEDGER' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Database style={{ width: '13px', height: '13px' }} />
            <span>Batch Flow Ledger ({allBatches.length})</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeHubView === 'SIMULATOR'}
            onClick={() => setActiveHubView('SIMULATOR')}
            className={`chip ${activeHubView === 'SIMULATOR' ? 'chip-a' : ''} cursor-pointer`}
            style={{ padding: '6px 12px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeftRight style={{ width: '13px', height: '13px' }} />
            <span>Title Transfer Simulator</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }} className="mut">
          <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} />
          <span>Live TSO Telemetry: <strong style={{ color: 'var(--color-text)' }} className="num">{tsoMetrics ? `${tsoMetrics.connectedTsoCount} Systems Online` : 'Connecting...'}</strong></span>
        </div>
      </div>

      {/* VIEW: LIVE FLOW TELEMETRY & MULTI-TSO FEEDS */}
      {activeHubView === 'TELEMETRY' && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Telemetry Controls & Live Velocity HUD */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Radio style={{ width: '16px', height: '16px', color: 'var(--color-status-pos-text)' }} />
                <h4 className="ptitle" style={{ fontSize: '15px' }}>
                  Pan-European Real-Time TSO Flow Telemetry
                </h4>
                <span className="chip chip-pos" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '5px', height: '5px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} />
                  REST / SCADA Synchronised
                </span>
              </div>

              {/* Sync Controls & Auto-Poll */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 8px',
                    border: '1px solid var(--color-divider)',
                    backgroundColor: 'var(--color-panel-header)',
                    fontSize: '12px',
                  }}
                >
                  <Clock style={{ width: '12px', height: '12px', color: 'var(--color-dim)' }} />
                  <span className="eyebrow" style={{ margin: 0 }}>Auto-Poll:</span>
                  <select
                    value={autoPollInterval}
                    onChange={e => setAutoPollInterval(Number(e.target.value))}
                    aria-label="Auto-poll interval"
                    className="input"
                    style={{ minHeight: '26px', padding: '2px 6px', fontSize: '12px', border: 'none', backgroundColor: 'transparent', fontWeight: 600 }}
                  >
                    <option value={15}>15s</option>
                    <option value={30}>30s</option>
                    <option value={60}>60s</option>
                    <option value={0}>Manual / Off</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={syncTelemetryData}
                  disabled={isSyncingAllTso}
                  className="btn btn-primary"
                  style={{ height: '32px', fontSize: '12px', padding: '4px 12px' }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncingAllTso ? 'animate-spin' : ''}`} />
                  <span>{isSyncingAllTso ? 'Syncing TSOs…' : 'Sync All TSOs'}</span>
                </button>
              </div>
            </div>

            {/* 4 Live Velocity Gauges */}
            <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: '1px solid var(--color-divider)' }}>
              <div>
                <div className="eyebrow">Pan-EU Injection Velocity</div>
                <div className="big num" style={{ color: 'var(--color-status-pos-text)' }}>
                  {tsoMetrics ? `${tsoMetrics.currentFlowVelocityMWhHour.toLocaleString()} MWh/h` : '4,850 MWh/h'}
                </div>
                <div className="subttl">
                  {tsoMetrics ? `≈ ${tsoMetrics.currentFlowVelocityNm3Hour.toLocaleString()} Nm³/h` : '≈ 458,000 Nm³/h'}
                </div>
              </div>

              <div>
                <div className="eyebrow">Total Daily Injection Run-Rate</div>
                <div className="big num">
                  {tsoMetrics ? `${tsoMetrics.totalDailyFlowMWh.toLocaleString()} MWh/d` : '116,400 MWh/d'}
                </div>
                <div className="subttl">Extrapolated 42.5 TWh/year</div>
              </div>

              <div>
                <div className="eyebrow">Monitored Injection Nodes</div>
                <div className="big num">
                  {tsoMetrics ? `${tsoMetrics.activeInjectionPoints} Points` : '1,975 Points'}
                </div>
                <div className="subttl">
                  {tsoMetrics?.connectedTsoCount || 8} TSO Systems Connected
                </div>
              </div>

              <div>
                <div className="eyebrow">Telemetry Latency &amp; Health</div>
                <div className="big num" style={{ color: 'var(--color-status-pos-text)' }}>
                  ⚡ {tsoMetrics?.averageLatencyMs || 38} ms
                </div>
                <div className="subttl">
                  Last Sync: {lastTelemetrySync || 'Just now'}
                </div>
              </div>
            </div>
          </div>

          {/* Connected TSO Telemetry Cards Strip */}
          {tsoMetrics && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '12px' }}>
              {tsoMetrics.feeds.map(feed => (
                <div
                  key={feed.tsoCode}
                  style={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-divider)',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="eyebrow" style={{ margin: 0, fontWeight: 700 }}>{feed.countryCode} · {feed.tsoCode}</span>
                      <span className="chip chip-pos" style={{ fontSize: '9px', padding: '1px 4px' }}>
                        {feed.status === 'ONLINE' ? 'LIVE' : 'SYNCED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {feed.tsoName}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: '10px',
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-divider)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '12px',
                    }}
                  >
                    <span className="dim">{feed.activeNodes} Nodes</span>
                    <span className="num" style={{ fontWeight: 700, color: 'var(--color-status-pos-text)' }}>
                      {feed.hourlyFlowMWh.toLocaleString()} MWh/h
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real-time Injection Flow Feed Table */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                borderBottom: '1px solid var(--color-divider)',
                paddingBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity style={{ width: '16px', height: '16px', color: 'var(--color-accent)' }} />
                <h4 className="ptitle" style={{ fontSize: '14px' }}>
                  Live Flow Telemetry Stream ({filteredTelemetryPoints.length} Streams)
                </h4>
              </div>

              {/* Filters */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="text"
                  placeholder="Filter node, TSO, feedstock…"
                  aria-label="Filter telemetry points"
                  value={telemetrySearch}
                  onChange={e => setTelemetrySearch(e.target.value)}
                  className="input"
                  style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '210px' }}
                />

                <select
                  value={telemetryCountryFilter}
                  onChange={e => setTelemetryCountryFilter(e.target.value)}
                  aria-label="Filter telemetry by country"
                  className="input"
                  style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '140px' }}
                >
                  <option value="ALL">All Countries</option>
                  <option value="DK">DK (Denmark)</option>
                  <option value="FR">FR (France)</option>
                  <option value="DE">DE (Germany)</option>
                  <option value="NL">NL (Netherlands)</option>
                  <option value="ES">ES (Spain)</option>
                  <option value="IT">IT (Italy)</option>
                  <option value="BE">BE (Belgium)</option>
                  <option value="SE">SE (Sweden)</option>
                  <option value="PL">PL (Poland)</option>
                  <option value="AT">AT (Austria)</option>
                  <option value="GB">GB (United Kingdom)</option>
                </select>

                <select
                  value={telemetryGridFilter}
                  onChange={e => setTelemetryGridFilter(e.target.value)}
                  aria-label="Filter telemetry by grid type"
                  className="input"
                  style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '170px' }}
                >
                  <option value="ALL">All Grid Types</option>
                  <option value="TSO_TRANSMISSION">TSO Transmission</option>
                  <option value="CROSS_BORDER_IP">Cross-Border IP</option>
                  <option value="DSO_DISTRIBUTION">DSO Distribution</option>
                </select>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" aria-label="Live Flow Telemetry Stream Table">
                <thead>
                  <tr>
                    <th>Node / Injection Point</th>
                    <th>Country &amp; TSO</th>
                    <th>Grid Type</th>
                    <th style={{ textAlign: 'right' }}>Flow (MWh/h)</th>
                    <th style={{ textAlign: 'right' }}>Flow (Nm³/h)</th>
                    <th>Feedstock Substrate</th>
                    <th style={{ textAlign: 'right' }}>Verified CI</th>
                    <th>Data Source</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTelemetryPoints.map(point => (
                    <tr key={point.id}>
                      <td style={{ fontWeight: 600 }}>
                        {point.nodeName}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="num" style={{ fontWeight: 700 }}>{point.countryCode}</span>
                          <span className="dim" style={{ fontSize: '12px' }}>{point.tsoName}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`chip ${
                          point.gridType === 'CROSS_BORDER_IP'
                            ? 'chip-warn'
                            : point.gridType === 'TSO_TRANSMISSION'
                            ? 'chip-a'
                            : ''
                        }`}>
                          {point.gridType === 'CROSS_BORDER_IP' ? 'CROSS-BORDER IP' : point.gridType === 'TSO_TRANSMISSION' ? 'TSO HIGH-PRESSURE' : 'DSO'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="num font-bold">
                        <span style={{ color: 'var(--color-status-pos-text)', fontWeight: 700 }}>
                          {point.flowRateMWhPerHour.toLocaleString()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }} className="num dim">
                        {point.flowRateNm3PerHour.toLocaleString()}
                      </td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {point.feedstockCategory}
                      </td>
                      <td style={{ textAlign: 'right' }} className="num">
                        <span style={{ fontWeight: 600, color: point.verifiedCI < 0 ? 'var(--color-status-pos-text)' : 'var(--color-text)' }}>
                          {point.verifiedCI > 0 ? `+${point.verifiedCI}` : point.verifiedCI} <span style={{ fontSize: '11px' }} className="dim">g/MJ</span>
                        </span>
                      </td>
                      <td style={{ fontSize: '12px' }} className="dim">
                        {point.source}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="chip chip-pos" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ width: '4px', height: '4px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} />
                          LIVE
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: LIVE INGESTION & DATA FEEDS */}
      {activeHubView === 'INGESTION' && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Top Live Feeds Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px' }}>
            {/* Live Energinet Open Data Card */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '24px' }}>🇩🇰</span>
                    <div>
                      <h4 className="ptitle" style={{ fontSize: '15px' }}>
                        Denmark Energinet Gas DataHub API
                      </h4>
                      <div className="subttl" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} />
                        <span>Open Public REST Endpoint Connected</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSyncEnerginet}
                    disabled={isSyncingEnerginet}
                    className="btn btn-primary"
                    style={{ fontSize: '12px', padding: '6px 12px', height: '32px' }}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingEnerginet ? 'animate-spin' : ''}`} />
                    <span>{isSyncingEnerginet ? 'Polling API…' : 'Poll Live Injections'}</span>
                  </button>
                </div>

                <div
                  className="cellrow"
                  style={{
                    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                    border: '1px solid var(--color-divider)',
                    marginTop: '14px',
                  }}
                >
                  <div>
                    <div className="eyebrow">Daily Injections</div>
                    <div className="big num" style={{ fontSize: '20px' }}>
                      {energinetLiveStats ? `${energinetLiveStats.totalDailyInjectionMWh.toLocaleString()}` : '62,450'} <span style={{ fontSize: '12px' }} className="dim">MWh/d</span>
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Active Entry Nodes</div>
                    <div className="big num" style={{ fontSize: '20px' }}>
                      {energinetLiveStats ? `${energinetLiveStats.activeInjectionPoints}` : '52'} <span style={{ fontSize: '12px' }} className="dim">TSO Points</span>
                    </div>
                  </div>
                  <div>
                    <div className="eyebrow">Last Sync</div>
                    <div className="big num" style={{ fontSize: '16px', marginTop: '6px' }}>
                      {energinetLiveStats ? energinetLiveStats.timestamp.slice(11, 19) + ' UTC' : 'Ready to Poll'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-divider)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
                className="dim"
              >
                <span>Source: api.energidataservice.dk/dataset/Gasflow</span>
                <span className="chip chip-a" style={{ fontSize: '9px' }}>RED III Annex IX-A Manure</span>
              </div>
            </div>

            {/* Universal CSV / XML File Dropzone Card */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <FileSpreadsheet style={{ width: '18px', height: '18px', color: 'var(--color-accent)' }} />
                  <h4 className="ptitle" style={{ fontSize: '15px' }}>
                    Universal Registry File Dropzone
                  </h4>
                </div>
                <p className="subttl" style={{ marginBottom: '12px' }}>
                  Upload official monthly statements, account exports, or transfer declarations from all 22 European registries.
                </p>

                <div
                  style={{
                    position: 'relative',
                    border: '2px dashed var(--color-divider)',
                    padding: '16px',
                    textAlign: 'center',
                    backgroundColor: 'var(--color-panel-header)',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="file"
                    accept=".csv,.json,.xml,.txt"
                    onChange={handleFileUpload}
                    style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                  />
                  <Upload style={{ width: '22px', height: '22px', color: 'var(--color-accent)', margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>
                    Drag &amp; drop registry export or click to browse
                  </div>
                  <div className="dim" style={{ fontSize: '11px', marginTop: '2px' }}>
                    Supports .CSV, .JSON, .XML (All 22 Pan-European Registries)
                  </div>
                </div>
              </div>

              {/* Sample 1-Click Loaders */}
              <div
                style={{
                  marginTop: '14px',
                  paddingTop: '10px',
                  borderTop: '1px solid var(--color-divider)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
              >
                <span className="dim">Quick Test Seeders:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleSeedDenaSample}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                  >
                    🇩🇪 Seed dena Monthly (63.4k MWh)
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedVertiCerSample}
                    className="btn btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 8px', height: '28px' }}
                  >
                    🇳🇱 Seed VertiCer Export (40.5k MWh)
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Last Ingestion Result Breakdown */}
          {lastIngestResult && (
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-divider)',
                  paddingBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Check style={{ width: '16px', height: '16px', color: 'var(--color-status-pos-text)' }} />
                  <h4 className="ptitle" style={{ fontSize: '14px', color: 'var(--color-status-pos-text)' }}>
                    Ingestion Successful: {lastIngestResult.sourceFileName}
                  </h4>
                  <span className="chip chip-a">
                    {lastIngestResult.registryName}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveHubView('LEDGER')}
                  className="btn btn-ghost"
                  style={{ fontSize: '12px' }}
                >
                  <span>View in Batch Ledger →</span>
                </button>
              </div>

              <div className="cellrow" style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: '1px solid var(--color-divider)' }}>
                <div>
                  <div className="eyebrow">Total Volume Ingested</div>
                  <div className="big num">
                    {lastIngestResult.totalVolumeMWh.toLocaleString()} <span style={{ fontSize: '13px' }} className="dim">MWh</span>
                  </div>
                </div>

                <div>
                  <div className="eyebrow">Annex IX-A Advanced</div>
                  <div className="big num" style={{ color: 'var(--color-status-pos-text)' }}>
                    {lastIngestResult.summary.annexIxAVolumeMWh.toLocaleString()} <span style={{ fontSize: '13px' }} className="dim">MWh</span>
                  </div>
                </div>

                <div>
                  <div className="eyebrow">Weighted Average CI</div>
                  <div className="big num" style={{ color: lastIngestResult.summary.averageCI <= 0 ? 'var(--color-status-pos-text)' : 'var(--color-text)' }}>
                    {lastIngestResult.summary.averageCI > 0 ? `+${lastIngestResult.summary.averageCI}` : lastIngestResult.summary.averageCI} <span style={{ fontSize: '13px' }} className="dim">gCO₂e/MJ</span>
                  </div>
                </div>

                <div>
                  <div className="eyebrow">Verified Batches</div>
                  <div className="big num">
                    {lastIngestResult.importedCount} <span style={{ fontSize: '13px' }} className="dim">Consignments</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW: BALANCE OF TRADE & PAN-EUROPEAN MATRIX & SIMULATOR */}
      {(activeHubView === 'OVERVIEW' || activeHubView === 'SIMULATOR') && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Top: 2-column Grid with Balance of Trade + Simulator */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(0, 1fr)', gap: '16px' }}>
            
            {/* 2A. Balance of Trade Matrix */}
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-divider)',
                  paddingBottom: '10px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale style={{ width: '16px', height: '16px', color: 'var(--color-accent)' }} aria-hidden="true" />
                  <h4 className="ptitle" style={{ fontSize: '14px' }}>
                    European Balance of Trade Matrix ({BASELINE_BALANCE_OF_TRADE.length} Jurisdictions)
                  </h4>
                </div>
                <span className="dim" style={{ fontSize: '11px' }}>
                  Audited Annual Trade Balances
                </span>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '440px', overflowY: 'auto' }}>
                <table className="table" aria-label="European Balance of Trade Table">
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr>
                      <th>Registry / Country</th>
                      <th>Trade Role</th>
                      <th style={{ textAlign: 'right' }}>Issuance (TWh)</th>
                      <th style={{ textAlign: 'right' }}>Domestic (TWh)</th>
                      <th style={{ textAlign: 'right' }}>Exports (TWh)</th>
                      <th style={{ textAlign: 'right' }}>Imports (TWh)</th>
                      <th style={{ textAlign: 'right' }}>Net Balance</th>
                      <th>Export Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {BASELINE_BALANCE_OF_TRADE.map(bot => {
                      const issuanceTWh = (bot.totalIssuanceMWh / 1000000).toFixed(2);
                      const domesticTWh = (bot.domesticConsumptionMWh / 1000000).toFixed(2);
                      const exportTWh = (bot.grossExportMWh / 1000000).toFixed(2);
                      const importTWh = (bot.grossImportMWh / 1000000).toFixed(2);
                      const netTWh = (bot.netTradeBalanceMWh / 1000000).toFixed(2);
                      const isPositive = bot.netTradeBalanceMWh > 0;
                      const isNegative = bot.netTradeBalanceMWh < 0;

                      return (
                        <tr key={bot.registryId}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className="num" style={{ fontWeight: 700, width: '24px' }}>
                                {bot.countryCode}
                              </span>
                              <div>
                                <div style={{ fontWeight: 600 }}>{bot.registryName}</div>
                                <div className="dim" style={{ fontSize: '11px' }}>{REGISTRY_METADATA_TABLE[bot.registryId]?.hubConnection || 'Gas Hub'}</div>
                              </div>
                            </div>
                          </td>

                          <td>
                            {bot.tradeRole === 'NET_EXPORTER' && (
                              <span className="chip chip-pos">
                                NET EXPORTER
                              </span>
                            )}
                            {bot.tradeRole === 'NET_IMPORTER' && (
                              <span className="chip chip-warn">
                                NET IMPORTER
                              </span>
                            )}
                            {bot.tradeRole === 'BALANCED_DOMESTIC' && (
                              <span className="chip">
                                BALANCED
                              </span>
                            )}
                          </td>

                          <td style={{ textAlign: 'right' }} className="num">
                            {issuanceTWh}
                          </td>

                          <td style={{ textAlign: 'right' }} className="num dim">
                            {domesticTWh}
                          </td>

                          <td style={{ textAlign: 'right', color: 'var(--color-status-pos-text)', fontWeight: 600 }} className="num">
                            {exportTWh}
                          </td>

                          <td style={{ textAlign: 'right', color: 'var(--color-status-warn-text)', fontWeight: 600 }} className="num">
                            {importTWh}
                          </td>

                          <td style={{ textAlign: 'right' }} className="num font-bold">
                            <span style={{ color: isPositive ? 'var(--color-status-pos-text)' : isNegative ? 'var(--color-status-warn-text)' : 'inherit' }}>
                              {isPositive ? `+${netTWh}` : netTWh} TWh
                            </span>
                          </td>

                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '48px', height: '6px', backgroundColor: 'var(--color-subtier)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    backgroundColor: isPositive ? 'var(--color-status-pos-text)' : 'var(--color-accent)',
                                    width: `${Math.min(100, Math.max(0, bot.exportSharePercent))}%`,
                                  }}
                                />
                              </div>
                              <span className="num dim" style={{ fontSize: '11px' }}>
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
            <div
              style={{
                backgroundColor: 'var(--color-surface)',
                border: '1px solid var(--color-divider)',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--color-divider)',
                  paddingBottom: '10px',
                  marginBottom: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ArrowLeftRight style={{ width: '16px', height: '16px', color: 'var(--color-accent)' }} aria-hidden="true" />
                  <h4 className="ptitle" style={{ fontSize: '14px' }}>
                    Cross-Border Transfer &amp; UDB Verifier
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => handleAdvanceSimulatorState('RESET')}
                  aria-label="Reset simulation"
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                >
                  <RefreshCw style={{ width: '12px', height: '12px' }} aria-hidden="true" /> Reset
                </button>
              </div>

              {/* Form Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px' }}>
                {/* Source Registry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="source-registry-select" className="eyebrow" style={{ margin: 0 }}>
                    Source Registry (Origin)
                  </label>
                  <select
                    id="source-registry-select"
                    value={sourceRegistry}
                    onChange={e => setSourceRegistry(e.target.value as RegistryId)}
                    className="input"
                    style={{ minHeight: '32px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    {allRegistriesList.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.countryCode} - {r.countryName})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Registry */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="target-registry-select" className="eyebrow" style={{ margin: 0 }}>
                    Target Registry (Destination)
                  </label>
                  <select
                    id="target-registry-select"
                    value={targetRegistry}
                    onChange={e => setTargetRegistry(e.target.value as RegistryId)}
                    className="input"
                    style={{ minHeight: '32px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    {allRegistriesList.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.countryCode} Quota / Hub)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transfer Protocol */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="transfer-protocol-select" className="eyebrow" style={{ margin: 0 }}>
                    Transfer Protocol
                  </label>
                  <select
                    id="transfer-protocol-select"
                    value={transferProtocol}
                    onChange={e => setTransferProtocol(e.target.value as CertificateTransferProtocol)}
                    className="input"
                    style={{ minHeight: '32px', padding: '4px 8px', fontSize: '12px' }}
                  >
                    <option value="ERGAR_COO">ERGaR CoO (Certificate of Origin)</option>
                    <option value="UDB_DIRECT_TRANSFER">UDB Single Area Direct Transfer</option>
                    <option value="AIB_EECS_GAS">AIB EECS Gas Scheme</option>
                    <option value="BILATERAL_RECOGNITION">Bilateral Recognition (RED III Art. 31a)</option>
                    <option value="DOMESTIC_ONLY">Domestic Only (No cross-border)</option>
                  </select>
                </div>

                {/* Transfer Volume */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label htmlFor="transfer-volume-input" className="eyebrow" style={{ margin: 0 }}>
                    Transfer Volume (MWh)
                  </label>
                  <input
                    id="transfer-volume-input"
                    type="number"
                    value={customTransferVolume}
                    onChange={e => setCustomTransferVolume(Number(e.target.value))}
                    className="input num"
                    style={{ minHeight: '32px', padding: '4px 8px', fontSize: '12px', fontWeight: 600 }}
                  />
                </div>
              </div>

              {/* Scenario Toggles */}
              <div
                style={{
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--color-divider)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={udbRequired}
                    onChange={e => setUdbRequired(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>UDB Title Transfer Escrow Required</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={bilateralTreatySimulated}
                    onChange={e => setBilateralTreatySimulated(e.target.checked)}
                    style={{ accentColor: 'var(--color-accent)' }}
                  />
                  <span>Simulate Non-EU Bilateral Treaty</span>
                </label>
              </div>

              {/* Real-time Verification Output Box */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  backgroundColor: 'var(--color-panel-header)',
                  border: '1px solid var(--color-divider)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {liveVerification.isCompatible ? (
                      <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--color-status-pos-text)' }} aria-hidden="true" />
                    ) : (
                      <XCircle style={{ width: '16px', height: '16px', color: 'var(--color-status-neg-text)' }} aria-hidden="true" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '12px', color: liveVerification.isCompatible ? 'var(--color-status-pos-text)' : 'var(--color-status-neg-text)' }}>
                      {liveVerification.isCompatible ? 'TRANSFER COMPATIBLE' : 'TRANSFER BLOCKED'}
                    </span>
                  </div>

                  {/* UDB Status Chip */}
                  <span className={`chip ${
                    liveVerification.udbTitleTransferStatus === 'ESCROW_LOCKED'
                      ? 'chip-warn'
                      : liveVerification.udbTitleTransferStatus === 'TITLE_TRANSFERRED'
                      ? 'chip-pos'
                      : liveVerification.udbTitleTransferStatus.startsWith('REJECTED')
                      ? 'chip-neg'
                      : ''
                  }`}>
                    {simulatorUdbState !== 'DRAFT' && liveVerification.isCompatible ? simulatorUdbState : liveVerification.udbTitleTransferStatus}
                  </span>
                </div>

                {/* Blocking reasons or notes */}
                {liveVerification.blockingReasons.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {liveVerification.blockingReasons.map((reason, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--color-status-neg-text)', fontSize: '11px' }}>
                        <AlertTriangle style={{ width: '13px', height: '13px', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {liveVerification.auditNotes.map((note, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', color: 'var(--color-status-pos-text)', fontSize: '11px' }}>
                        <CheckCircle2 style={{ width: '13px', height: '13px', flexShrink: 0, marginTop: '2px' }} aria-hidden="true" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Statutory Citations */}
                <div
                  style={{
                    paddingTop: '8px',
                    borderTop: '1px solid var(--color-divider)',
                    fontSize: '11px',
                  }}
                  className="dim"
                >
                  <span style={{ fontWeight: 600 }}>Legal Citations:</span> {liveVerification.statutoryCitations.join(' · ')}
                </div>

                {/* Action Buttons for Title Transfer Advancement */}
                {liveVerification.isCompatible && (
                  <div
                    style={{
                      paddingTop: '8px',
                      borderTop: '1px solid var(--color-divider)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ fontSize: '11px' }} className="mut">
                      State: <strong style={{ color: 'var(--color-text)' }}>{simulatorUdbState}</strong>
                    </span>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {simulatorUdbState === 'DRAFT' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSimulatorState('SUBMIT')}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                        >
                          Submit Transfer
                        </button>
                      )}

                      {(simulatorUdbState === 'DRAFT' || simulatorUdbState === 'SUBMITTED') && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSimulatorState('LOCK_ESCROW')}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                        >
                          <Lock style={{ width: '12px', height: '12px' }} aria-hidden="true" /> Lock Escrow
                        </button>
                      )}

                      {simulatorUdbState === 'ESCROW_LOCKED' && (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSimulatorState('TRANSFER_TITLE')}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '3px 10px', height: '26px' }}
                        >
                          <Send style={{ width: '12px', height: '12px' }} aria-hidden="true" /> Transfer Title
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {transferSuccessMessage && (
                  <div
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--color-status-pos-bg)',
                      border: '1px solid var(--color-status-pos-border)',
                      color: 'var(--color-status-pos-text)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {transferSuccessMessage}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Section: Pan-European Registry Network Matrix (All 22 Countries) */}
          <div
            style={{
              backgroundColor: 'var(--color-surface)',
              border: '1px solid var(--color-divider)',
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--color-divider)',
                paddingBottom: '10px',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Globe2 style={{ width: '16px', height: '16px', color: 'var(--color-accent)' }} />
                <h4 className="ptitle" style={{ fontSize: '14px' }}>
                  Pan-European Registry Network &amp; Direct Statutory Matrix (22 Jurisdictions)
                </h4>
              </div>
              <span className="dim" style={{ fontSize: '11px' }}>
                UDB Interoperability &amp; Regulatory Mandates
              </span>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '380px', overflowY: 'auto' }}>
              <table className="table" aria-label="Pan-European Registry Network Matrix">
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th>Country &amp; Registry</th>
                    <th>Statutory Operator</th>
                    <th>Trading Hub</th>
                    <th>Statutory Legal Basis</th>
                    <th>Protocols</th>
                    <th style={{ textAlign: 'center' }}>UDB Status</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allRegistriesList.map(meta => (
                    <tr key={meta.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="num" style={{ fontWeight: 700, width: '24px', color: 'var(--color-accent)' }}>
                            {meta.countryCode}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600 }}>{meta.name}</div>
                            <div className="dim" style={{ fontSize: '11px' }}>{meta.countryName}</div>
                          </div>
                        </div>
                      </td>

                      <td style={{ fontSize: '12px' }}>
                        {meta.operator}
                      </td>

                      <td className="dim" style={{ fontSize: '12px' }}>
                        {meta.hubConnection}
                      </td>

                      <td className="dim" style={{ fontSize: '11px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={meta.statutoryLegalBasis}>
                        {meta.statutoryLegalBasis}
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                          {meta.primaryProtocols.map(p => (
                            <span key={p} className="chip" style={{ fontSize: '9px', padding: '1px 4px' }}>
                              {p.replace('_TRANSFER', '').replace('_RECOGNITION', '')}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {meta.udbDirectIntegration ? (
                          <span className="chip chip-pos">
                            EU DIRECT (Art. 31a)
                          </span>
                        ) : (
                          <span className="chip chip-warn">
                            THIRD COUNTRY (Gated)
                          </span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSourceRegistry(meta.id);
                            setActiveHubView('SIMULATOR');
                          }}
                          className="btn btn-secondary"
                          style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
                        >
                          Simulate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. BOTTOM SECTION: REGISTRY FLOW LEDGER & BATCH EXPLORER */}
      {(activeHubView === 'OVERVIEW' || activeHubView === 'LEDGER') && (
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '300px', gap: '12px' }}>
          {/* Ledger Header & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              borderBottom: '1px solid var(--color-divider)',
              paddingBottom: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Building2 style={{ width: '16px', height: '16px', color: 'var(--color-accent)' }} aria-hidden="true" />
              <h4 className="ptitle" style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>European Registry Injection Flow Ledger</span>
                <span className="chip chip-a" style={{ fontWeight: 700 }}>
                  {filteredBatches.length} Batches
                </span>
              </h4>
            </div>

            {/* Quick Live Feed Sync Button & Filters */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
              {/* Live Energinet Sync Button */}
              <button
                type="button"
                onClick={handleSyncEnerginet}
                disabled={isSyncingEnerginet}
                className="btn btn-primary"
                style={{ fontSize: '12px', padding: '4px 10px', height: '30px' }}
                title="Fetch live hourly injection telemetry from Energinet DataHub API"
              >
                <Zap className={`w-3.5 h-3.5 ${isSyncingEnerginet ? 'animate-bounce' : ''}`} />
                <span>{isSyncingEnerginet ? 'Syncing...' : '⚡ Sync Live Energinet'}</span>
              </button>

              {/* Search */}
              <input
                type="text"
                placeholder="Filter batch, plant, proof ID…"
                aria-label="Filter injection batches"
                value={searchBatchQuery}
                onChange={e => setSearchBatchQuery(e.target.value)}
                className="input"
                style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '190px' }}
              />

              {/* Registry Filter */}
              <select
                aria-label="Filter by registry"
                value={selectedRegistryFilter}
                onChange={e => setSelectedRegistryFilter(e.target.value)}
                className="input"
                style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '150px' }}
              >
                <option value="ALL">All 22 Registries</option>
                {allRegistriesList.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.countryCode})
                  </option>
                ))}
              </select>

              {/* Feedstock Filter */}
              <select
                aria-label="Filter by feedstock"
                value={selectedFeedstockFilter}
                onChange={e => setSelectedFeedstockFilter(e.target.value)}
                className="input"
                style={{ minHeight: '30px', padding: '4px 8px', fontSize: '12px', width: '170px' }}
              >
                <option value="ALL">All Feedstocks</option>
                <option value="MANURE">Manure &amp; Slurry (IX-A)</option>
                <option value="BIOWASTE">Municipal Organic / OFMSW (IX-A)</option>
                <option value="AGRO">Agro Residues, Pulp &amp; CIVE (IX-A)</option>
                <option value="CROP">Energy Crops (Crop)</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-divider)', backgroundColor: 'var(--color-surface)' }}>
            <table className="table" aria-label="Registry Injection Flow Ledger">
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>Batch ID</th>
                  <th>Metering Date / UTC</th>
                  <th>Origin &amp; Facility</th>
                  <th>Registry &amp; Grid Point</th>
                  <th style={{ textAlign: 'right' }}>Volume (MWh)</th>
                  <th style={{ textAlign: 'right' }}>Volume (Nm³)</th>
                  <th>Feedstock &amp; Annex</th>
                  <th style={{ textAlign: 'right' }}>Verified CI</th>
                  <th>Sustainability Proof</th>
                  <th>UDB Registration</th>
                  <th style={{ textAlign: 'center' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredBatches.map(batch => {
                  const isSelected = selectedBatchIds.includes(batch.id);
                  const isNegativeCI = batch.verifiedCI < 0;
                  const isLive = batch.id.startsWith('ENERGINET-LIVE');

                  return (
                    <tr
                      key={batch.id}
                      onClick={() => setSelectedBatch(batch)}
                      style={{ cursor: 'pointer' }}
                    >
                      {/* Batch ID */}
                      <td style={{ fontWeight: 700 }} className="num">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {isLive && <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--color-status-pos-text)', display: 'inline-block' }} title="Live Hourly Data" />}
                          <span>{batch.id}</span>
                        </div>
                      </td>

                      {/* Metering Date / Timestamp */}
                      <td className="num dim" style={{ whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {batch.meteringPeriod?.startDate || '2026-08-18'}
                      </td>

                      {/* Origin & Facility */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="num dim" style={{ fontWeight: 700, width: '20px' }}>
                            {batch.originCountry}
                          </span>
                          <div style={{ fontWeight: 600, maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {batch.plantName}
                          </div>
                        </div>
                      </td>

                      {/* Registry & Grid Point */}
                      <td>
                        <div style={{ fontWeight: 600 }}>{batch.registryId}</div>
                        <div className="dim" style={{ fontSize: '11px' }}>{batch.injectionPointId}</div>
                      </td>

                      {/* Volume MWh */}
                      <td style={{ textAlign: 'right', fontWeight: 700 }} className="num">
                        {batch.volumeMWh.toLocaleString()}
                      </td>

                      {/* Volume Nm3 */}
                      <td style={{ textAlign: 'right' }} className="num dim">
                        {batch.volumeNm3.toLocaleString()}
                      </td>

                      {/* Feedstock & Annex */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px' }}>
                            {batch.feedstockCategory}
                          </span>
                          <span className={`chip ${batch.annexClassification === 'IX_A' ? 'chip-a' : ''}`} style={{ fontSize: '9px', padding: '1px 3px' }}>
                            {batch.annexClassification}
                          </span>
                        </div>
                      </td>

                      {/* Verified CI */}
                      <td style={{ textAlign: 'right' }} className="num font-bold">
                        <span style={{ color: isNegativeCI ? 'var(--color-status-pos-text)' : 'inherit' }}>
                          {batch.verifiedCI.toFixed(1)} <span className="dim" style={{ fontSize: '11px', fontWeight: 400 }}>g/MJ</span>
                        </span>
                      </td>

                      {/* Sustainability Proof */}
                      <td>
                        <div className="dim" style={{ fontSize: '11px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {batch.sustainabilityProofId}
                        </div>
                        <div className="dim" style={{ fontSize: '10px' }}>{batch.certificationScheme}</div>
                      </td>

                      {/* UDB Registration */}
                      <td>
                        {batch.udbRegistrationId ? (
                          <div className="chip chip-pos" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 style={{ width: '12px', height: '12px' }} aria-hidden="true" />
                            <span>{batch.udbRegistrationId}</span>
                          </div>
                        ) : (
                          <div className="chip chip-neg" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <XCircle style={{ width: '12px', height: '12px' }} aria-hidden="true" />
                            <span>NON-EU / EXCLUDED</span>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          aria-label={`Select batch ${batch.id} for transfer`}
                          onClick={() => toggleBatchSelection(batch.id, batch.volumeMWh)}
                          className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ fontSize: '11px', padding: '3px 8px', height: '26px' }}
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
          className="scrim"
          style={{ alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setSelectedBatch(null)}
        >
          <div
            className="panel"
            style={{ width: '100%', maxWidth: '640px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: '14px 18px',
                backgroundColor: 'var(--color-panel-header)',
                borderBottom: '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: '16px',
              }}
            >
              <div>
                <h3 className="ptitle" style={{ fontSize: '16px' }}>
                  {selectedBatch.id} · {selectedBatch.plantName}
                </h3>
                <div className="dim" style={{ fontSize: '12px', marginTop: '2px' }}>
                  {selectedBatch.originCountry} · {selectedBatch.registryId} · INJECTION RECORD
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className={`chip ${selectedBatch.status === 'ISSUED' ? 'chip-pos' : ''}`}>
                  {selectedBatch.status}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedBatch(null)}
                  aria-label="Close batch detail"
                  className="btn btn-secondary"
                  style={{ padding: '2px 8px', height: '26px', fontSize: '12px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '1px',
                backgroundColor: 'var(--color-divider)',
              }}
            >
              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">Volume MWh</div>
                <div className="big num" style={{ fontSize: '18px', marginTop: '2px' }}>
                  {selectedBatch.volumeMWh.toLocaleString()} MWh
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">Volume Nm³ / GCV</div>
                <div className="num" style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                  {selectedBatch.volumeNm3.toLocaleString()} Nm³ @ {selectedBatch.grossCalorificValueKwhNm3} kWh/Nm³
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">Verified Carbon Intensity</div>
                <div className="big num" style={{ fontSize: '18px', color: 'var(--color-status-pos-text)', marginTop: '2px' }}>
                  {selectedBatch.verifiedCI.toFixed(1)} gCO₂e/MJ
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">Annex Classification</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '4px' }}>
                  Annex {selectedBatch.annexClassification} (RED III)
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px', gridColumn: 'span 2' }}>
                <div className="eyebrow">Feedstock Composition</div>
                <div style={{ fontSize: '13px', fontWeight: 500, marginTop: '4px' }}>
                  {selectedBatch.feedstockDetails}
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">Sustainability Proof ID</div>
                <div className="dim" style={{ fontSize: '12px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {selectedBatch.sustainabilityProofId} ({selectedBatch.certificationScheme})
                </div>
              </div>

              <div style={{ backgroundColor: 'var(--color-surface)', padding: '12px 16px' }}>
                <div className="eyebrow">UDB Registration ID</div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  {selectedBatch.udbRegistrationId || 'N/A — Non-EU / Excluded Grid'}
                </div>
              </div>
            </div>

            {/* Modal Footer Note */}
            <div
              style={{
                padding: '12px 18px',
                backgroundColor: 'var(--color-panel-header)',
                borderTop: '1px solid var(--color-divider)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div className="dim" style={{ fontSize: '11px' }}>
                Metering Period: {selectedBatch.meteringPeriod.startDate} → {selectedBatch.meteringPeriod.endDate}
              </div>
              <button
                type="button"
                onClick={() => {
                  toggleBatchSelection(selectedBatch.id, selectedBatch.volumeMWh);
                  setSelectedBatch(null);
                }}
                className={`btn ${selectedBatchIds.includes(selectedBatch.id) ? 'btn-secondary' : 'btn-primary'}`}
                style={{ fontSize: '12px', padding: '6px 14px' }}
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
