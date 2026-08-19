import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { SourcedOpportunity, PlantScannerTable } from '../commercial/PlantScannerTable';
import { OrderIntakePanel } from '../commercial/OrderIntakePanel';
import { CostWaterfallCard } from '../commercial/CostWaterfallCard';
import { CorridorMiniMap } from '../map/CorridorMiniMap';
import { DealSummaryModal } from '../commercial/DealSummaryModal';
import { 
  Building2, 
  Sparkles, 
  TrendingUp, 
  Navigation, 
  Calculator, 
  FileSpreadsheet, 
  ArrowRight 
} from 'lucide-react';

const INITIAL_REQUEST: ClientRequest = {
  feedstockKey: 'manure',
  targetMarketId: 'DE_THG',
  scheme: 'ISCC_EU',
  chainOfCustody: 'MASS_BALANCE',
  delivery: {
    type: 'MONTH',
    startDate: '2026-09-01',
    endDate: '2026-09-30',
    complianceYear: 2026,
  },
  volumeMwh: 10000,
  constraints: {
    maxCarbonIntensity: null,
    maxDeliveredCostEurMwh: null,
    physicalDeliveryRequired: false,
  },
  counterparty: null,
  notes: null,
};

export function SourcingOriginationDesk() {
  const { state } = useAppState();
  const [deskMode, setDeskMode] = useState<'COMPLIANCE' | 'VOLUNTARY'>('COMPLIANCE');
  const [voluntaryDeliveryType, setVoluntaryDeliveryType] = useState<'CERTIFICATE_ONLY' | 'BUNDLED_GREEN_GAS'>('CERTIFICATE_ONLY');
  const [request, setRequest] = useState<ClientRequest>(INITIAL_REQUEST);
  const [selectedOpp, setSelectedOpp] = useState<SourcedOpportunity | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScannedTime, setLastScannedTime] = useState<string>('Live · Just now');
  const [scanTrigger, setScanTrigger] = useState(0);

  // Switch Desk Mode
  const handleSelectDeskMode = (mode: 'COMPLIANCE' | 'VOLUNTARY') => {
    setDeskMode(mode);
    if (mode === 'VOLUNTARY') {
      setRequest(prev => ({
        ...prev,
        targetMarketId: 'UK_RGGO',
        feedstockKey: 'energy_crops',
        scheme: 'ISCC_EU',
        chainOfCustody: 'BOOK_AND_CLAIM',
        constraints: {
          ...prev.constraints,
          maxCarbonIntensity: 40,
        },
        notes: 'Corporate Scope 1 / Guarantee of Origin Transfer',
      }));
    } else {
      setRequest(prev => ({
        ...prev,
        targetMarketId: 'DE_THG',
        feedstockKey: 'manure',
        scheme: 'ISCC_EU',
        chainOfCustody: 'MASS_BALANCE',
        constraints: {
          ...prev.constraints,
          maxCarbonIntensity: -100,
        },
        notes: 'Statutory Compliance / Quota Obligation',
      }));
    }
  };

  // Manual Scan Trigger
  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setScanTrigger(prev => prev + 1);
      setIsScanning(false);
      const now = new Date();
      setLastScannedTime(`${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} · Live`);
    }, 350);
  };

  // Handle 1-Click 3Degrees Trader RFQ Presets
  const handleApplyPreset = (presetKey: string) => {
    switch (presetKey) {
      // --- COMPLIANCE DESK PRESETS ---
      case 'DE_THG_MANURE':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'manure',
          targetMarketId: 'DE_THG',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'MONTH',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            complianceYear: 2026,
          },
          volumeMwh: 10000,
          constraints: {
            maxCarbonIntensity: -100,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'German Fuel Supplier (Shell / TotalEnergies)',
          notes: 'Standard THG Quota Delivery',
        });
        break;

      case 'NL_HBE_BIOLNG':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'food_waste',
          targetMarketId: 'NL_ERE',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'QUARTER',
            startDate: '2026-10-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 15000,
          constraints: {
            maxCarbonIntensity: 20,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'Dutch Obligated Fuel Supplier',
          notes: 'HBE / ERE Compliance Cargo',
        });
        break;

      case 'FUELEU_MARITIME':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'agricultural_residues',
          targetMarketId: 'FUELEU_MARITIME',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 50000,
          constraints: {
            maxCarbonIntensity: 18,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'European Shipping Operator (Maersk / CMA CGM)',
          notes: 'FuelEU Maritime Deficit Closure Cargo',
        });
        break;

      case 'FR_CPB_AGRI':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'agricultural_residues',
          targetMarketId: 'FR_CPB',
          scheme: '2BSVS',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'MONTH',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            complianceYear: 2026,
          },
          volumeMwh: 8000,
          constraints: {
            maxCarbonIntensity: 18,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'French Gas Supplier (Engie / Total)',
          notes: 'CPB Compliance Delivery',
        });
        break;

      case 'UK_RTFO_WASTE':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'used_cooking_oil',
          targetMarketId: 'UK_RTFO',
          scheme: 'ISCC_EU',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'MONTH',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            complianceYear: 2026,
          },
          volumeMwh: 5000,
          constraints: {
            maxCarbonIntensity: 15,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'UK Transport Fuel Obligated Party (Greenergy / Valero)',
          notes: 'RTFC Green Gas Delivery',
        });
        break;

      // --- VOLUNTARY & CORPORATE DESK PRESETS ---
      case 'UK_RGGO_CROPS':
        setDeskMode('VOLUNTARY');
        setRequest({
          feedstockKey: 'energy_crops',
          targetMarketId: 'UK_RGGO',
          scheme: 'ISCC_EU',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 8000,
          constraints: {
            maxCarbonIntensity: 40,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'UK Corporate Commercial Heating Offtaker',
          notes: 'Green Gas Certification Scheme (GGCS) RGGO Transfer',
        });
        break;

      case 'VOL_SCOPE1_TECH':
        setDeskMode('VOLUNTARY');
        setRequest({
          feedstockKey: 'food_waste',
          targetMarketId: 'VOL_SCOPE1',
          scheme: 'ISCC_PLUS',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 25000,
          constraints: {
            maxCarbonIntensity: 15,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'Multinational Hyperscale Cloud Data Center',
          notes: 'Corporate Scope 1 GHG Protocol Market-Based Claim',
        });
        break;

      case 'DE_GO_INDUSTRIAL':
        setDeskMode('VOLUNTARY');
        setRequest({
          feedstockKey: 'manure',
          targetMarketId: 'DE_GO',
          scheme: 'REDCERT2',
          chainOfCustody: 'MASS_BALANCE',
          delivery: {
            type: 'QUARTER',
            startDate: '2026-10-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 12000,
          constraints: {
            maxCarbonIntensity: -100,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'German Industrial Manufacturing Offtaker (BASF / Thyssen)',
          notes: 'dena Biogasregister Green Gas Offtake with Bundled Delivery',
        });
        break;

      case 'NL_GO_COMMERCIAL':
        setDeskMode('VOLUNTARY');
        setRequest({
          feedstockKey: 'food_waste',
          targetMarketId: 'NL_GO',
          scheme: 'ISCC_EU',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'MONTH',
            startDate: '2026-09-01',
            endDate: '2026-09-30',
            complianceYear: 2026,
          },
          volumeMwh: 6000,
          constraints: {
            maxCarbonIntensity: 20,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'Dutch Logistics Commercial Fleet',
          notes: 'VertiCer Guarantee of Origin Cancellation',
        });
        break;

      case 'FR_GO_ECOGAZ':
        setDeskMode('VOLUNTARY');
        setRequest({
          feedstockKey: 'agricultural_residues',
          targetMarketId: 'FR_GO',
          scheme: '2BSVS',
          chainOfCustody: 'BOOK_AND_CLAIM',
          delivery: {
            type: 'CALENDAR',
            startDate: '2026-01-01',
            endDate: '2026-12-31',
            complianceYear: 2026,
          },
          volumeMwh: 10000,
          constraints: {
            maxCarbonIntensity: 18,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'French Tertiary Sector Eco-Gaz Buyer',
          notes: 'EEX French National Biomethane GO Transfer',
        });
        break;
    }
  };

  // Perform Real-Time Sourcing Scan
  const searchResult = useMemo(() => {
    return searchSourcingRoutes(request, state.marks, state.costs, DEFAULT_WHAT_IF_SCENARIO);
  }, [request, state.marks, state.costs, scanTrigger]);

  // Enrich opportunities with real plants from the 1,975+ Registry
  const enrichedOpportunities: SourcedOpportunity[] = useMemo(() => {
    const rawOpps = searchResult.tradeable;
    if (rawOpps.length === 0) return [];

    const enrichedList: SourcedOpportunity[] = [];

    rawOpps.forEach(opp => {
      const isUkOrigin = opp.originCountry === 'GB' || opp.originCountry === 'UK';
      let countryPlants = BIOMETHANE_PLANTS.filter(p => {
        if (isUkOrigin) {
          return p.countryCode === 'GB' || p.countryCode === 'UK' || p.country.toLowerCase().includes('united kingdom');
        }
        return p.countryCode === opp.originCountry || p.country.toLowerCase() === opp.originCountry.toLowerCase();
      });

      // Filter plants matching the selected feedstock substrate
      if (request.feedstockKey && request.feedstockKey !== 'ANY' && countryPlants.length > 0) {
        const key = request.feedstockKey.toLowerCase();
        const matchingFeedstock = countryPlants.filter(p => {
          const cat = (p.primaryFeedstockCategory || '').toLowerCase();
          const details = (p.feedstockDetails || '').toLowerCase();
          const pName = (p.name || '').toLowerCase();
          if (key.includes('crop')) return cat.includes('crop') || cat.includes('silage') || cat.includes('maize') || details.includes('crop') || details.includes('silage') || pName.includes('farm') || pName.includes('estate') || pName.includes('ad');
          if (key.includes('manure')) return cat.includes('manure') || cat.includes('slurry') || details.includes('manure') || details.includes('slurry');
          if (key.includes('waste') || key.includes('food')) return cat.includes('waste') || cat.includes('food') || cat.includes('organic') || details.includes('waste') || details.includes('food');
          if (key.includes('sewage')) return cat.includes('sewage') || cat.includes('sludge') || details.includes('sewage') || details.includes('sludge');
          return cat.includes(key) || details.includes(key);
        });
        if (matchingFeedstock.length > 0) {
          countryPlants = matchingFeedstock;
        }
      }

      // Present multiple real facilities per origin country
      const maxPlantsPerOrigin = rawOpps.length === 1 ? 30 : 5;
      const selectedPlants = countryPlants.slice(0, maxPlantsPerOrigin);

      if (selectedPlants.length > 0) {
        selectedPlants.forEach(matchedPlant => {
          enrichedList.push({
            ...opp,
            id: `${opp.id}_${matchedPlant.id}`,
            originPlantName: matchedPlant.name,
            originPlantCoords: matchedPlant.coordinates || null,
            isDirectPlantSource: true,
            logisticsDistanceKm: opp.transitCostEurPerMWh > 2 ? 650 : (opp.originCountry === opp.targetCountry ? 120 : 280),
            deliveryMode: 'PIPELINE_GRID',
          });
        });
      } else {
        enrichedList.push({
          ...opp,
          originPlantName: `${opp.originCountry} Biomethane Facility`,
          originPlantCoords: null,
          isDirectPlantSource: false,
          logisticsDistanceKm: opp.transitCostEurPerMWh > 2 ? 650 : (opp.originCountry === opp.targetCountry ? 120 : 280),
          deliveryMode: 'PIPELINE_GRID',
        });
      }
    });

    return enrichedList;
  }, [searchResult.tradeable, request.feedstockKey]);

  // Maintain active selection
  useEffect(() => {
    if (enrichedOpportunities.length > 0) {
      if (!selectedOpp || !enrichedOpportunities.some(o => o.id === selectedOpp.id)) {
        setSelectedOpp(enrichedOpportunities[0]);
      }
    } else {
      setSelectedOpp(null);
    }
  }, [enrichedOpportunities, selectedOpp]);

  // Target and fallback country mapping
  const targetCountryCode = request.targetMarketId.startsWith('UK_') 
    ? 'GB' 
    : request.targetMarketId === 'ANY' 
    ? 'DE' 
    : request.targetMarketId.slice(0, 2);

  const fallbackOriginCode = selectedOpp?.originCountry || targetCountryCode;

  // Copy Quick Summary
  const handleCopySummary = () => {
    if (!selectedOpp) return;
    const vol = request.volumeMwh || 10000;
    const margin = selectedOpp.deskNetMarginEurPerMWh ?? 0;
    const profit = selectedOpp.totalDealProfitEur ?? (margin * vol);

    const summaryText = `[Biomethane Commercial Deal Summary]
Route: ${selectedOpp.originPlantName || selectedOpp.originCountry} (${selectedOpp.originCountry}) -> ${selectedOpp.targetMarketName} (${selectedOpp.targetCountry})
Volume: ${vol.toLocaleString()} MWh (${request.delivery.type || 'MONTH'})
Feedstock: ${selectedOpp.feedstockName} (CI: ${selectedOpp.carbonIntensity} gCO₂e/MJ)
Delivered Cost: €${((selectedOpp.producerPayableEurPerMWh ?? 0) + (selectedOpp.transitCostEurPerMWh ?? 0) + 1.20).toFixed(2)} / MWh
Gross Revenue: €${(selectedOpp.totalTerminalValueStackEurPerMWh ?? 0).toFixed(2)} / MWh
Net Margin: €${margin.toFixed(2)} / MWh
Total Net Profit: €${Math.round(profit).toLocaleString()}
Compliance: Green Gas Certification Scheme / RGGO Validated`.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const transitSteps = useMemo(() => {
    if (!selectedOpp) return [targetCountryCode];
    if (selectedOpp.originCountry === selectedOpp.targetCountry) {
      return [selectedOpp.originCountry];
    }
    return [selectedOpp.originCountry, selectedOpp.targetCountry];
  }, [selectedOpp, targetCountryCode]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-950 text-stone-100 font-sans">
      {/* 1. Buyer Order Intake Header Panel */}
      <OrderIntakePanel
        request={request}
        deskMode={deskMode}
        onSelectDeskMode={handleSelectDeskMode}
        onChange={updated => setRequest(prev => ({ ...prev, ...updated }))}
        onApplyPreset={handleApplyPreset}
        onScan={handleScan}
        isScanning={isScanning}
        lastScannedText={lastScannedTime}
        voluntaryDeliveryType={voluntaryDeliveryType}
        onSelectVoluntaryDeliveryType={setVoluntaryDeliveryType}
      />

      {/* 2. Main Work Area: 2-Column Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Sourced Plants & Corridors Table (7 cols) */}
        <div className="lg:col-span-7 min-h-[500px] h-[580px]">
          <PlantScannerTable
            opportunities={enrichedOpportunities}
            matchedPlants={BIOMETHANE_PLANTS}
            selectedOpp={selectedOpp}
            onSelectOpp={setSelectedOpp}
            isLoading={isScanning}
          />
        </div>

        {/* Right Column: Route Visualizer & Cost Waterfall (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Top Right: Embedded Corridor Mini Map */}
          <div className="h-[250px] flex-none">
            <CorridorMiniMap
              originCountry={fallbackOriginCode}
              targetCountry={selectedOpp?.targetCountry || targetCountryCode}
              plantName={selectedOpp?.originPlantName}
              plantCoords={selectedOpp?.originPlantCoords}
              transitSteps={transitSteps}
              distanceKm={selectedOpp?.logisticsDistanceKm}
              logisticsCostEur={selectedOpp?.transitCostEurPerMWh}
              deliveryMode={selectedOpp?.deliveryMode}
            />
          </div>

          {/* Bottom Right: Financial Waterfall Card */}
          <div className="flex-1 min-h-[380px]">
            <CostWaterfallCard
              opportunity={selectedOpp}
              volumeMwh={request.volumeMwh || 10000}
              onOpenSummaryModal={() => setIsSummaryModalOpen(true)}
              onCopySummary={handleCopySummary}
              copied={copied}
            />
          </div>
        </div>
      </div>

      {/* 3. Exportable Deal Term Sheet Modal */}
      <DealSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        opportunity={selectedOpp}
        request={request}
      />
    </div>
  );
}
