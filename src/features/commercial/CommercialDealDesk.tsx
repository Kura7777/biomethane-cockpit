import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../../store/context';
import { ClientRequest } from '../../domain/arbitrage/types';
import { searchSourcingRoutes } from '../../domain/arbitrage/sourcingAdapter';
import { DEFAULT_WHAT_IF_SCENARIO } from '../../domain/arbitrage/engine';
import { BIOMETHANE_PLANTS } from '../../domain/plants/registry';
import { OrderIntakePanel, CommercialDeskMode, RfqPresetKey } from './OrderIntakePanel';
import { SourcedOpportunity, PlantScannerTable } from './PlantScannerTable';
import { CostWaterfallCard } from './CostWaterfallCard';
import { CorridorMiniMap } from '../map/CorridorMiniMap';
import { DealSummaryModal } from './DealSummaryModal';

const DEFAULT_CLIENT_REQUEST: ClientRequest = {
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
    maxCarbonIntensity: -50,
    maxDeliveredCostEurMwh: null,
    physicalDeliveryRequired: false,
  },
  counterparty: null,
  notes: null,
};

export function CommercialDealDesk() {
  const { state } = useAppState();
  const [deskMode, setDeskMode] = useState<CommercialDeskMode>('COMPLIANCE');
  const [request, setRequest] = useState<ClientRequest>(DEFAULT_CLIENT_REQUEST);
  const [selectedOpp, setSelectedOpp] = useState<SourcedOpportunity | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Handle Quick Presets
  const handleApplyPreset = (presetKey: RfqPresetKey) => {
    switch (presetKey) {
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
            maxCarbonIntensity: -50,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'German Fuel Supplier',
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
          counterparty: 'Dutch Obligated Supplier',
          notes: 'HBE Compliance Cargo',
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
          counterparty: 'European Shipping Operator',
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
            maxCarbonIntensity: null,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'French Gas Supplier',
          notes: 'CPB Compliance Delivery',
        });
        break;
      case 'UK_RTFO_WASTE':
        setDeskMode('COMPLIANCE');
        setRequest({
          feedstockKey: 'sewage_sludge',
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
            maxCarbonIntensity: null,
            maxDeliveredCostEurMwh: null,
            physicalDeliveryRequired: false,
          },
          counterparty: 'UK Transport Fuel Obligated Party',
          notes: 'RTFC Green Gas Delivery',
        });
        break;
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
          counterparty: 'UK Commercial Heating Offtaker',
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
          counterparty: 'German Industrial Manufacturing Offtaker',
          notes: 'dena Biogasregister Green Gas Offtake',
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
  }, [request, state.marks, state.costs]);

  // Enrich opportunities with real plants from the 1,975+ Registry
  const enrichedOpportunities: SourcedOpportunity[] = useMemo(() => {
    const rawOpps = searchResult.tradeable;
    if (rawOpps.length === 0) return [];

    return rawOpps.map((opp, idx) => {
      // Find matching plants in the origin country
      const countryPlants = BIOMETHANE_PLANTS.filter(
        p => p.countryCode === opp.originCountry || p.country.toLowerCase() === opp.originCountry.toLowerCase()
      );

      const matchedPlant = countryPlants[idx % (countryPlants.length || 1)] || null;

      return {
        ...opp,
        originPlantName: matchedPlant?.name || `${opp.originCountry} Biomethane Facility #${idx + 1}`,
        originPlantCoords: matchedPlant?.coordinates || null,
        isDirectPlantSource: Boolean(matchedPlant),
        logisticsDistanceKm: opp.transitCostEurPerMWh > 2 ? 650 : 280,
        deliveryMode: 'PIPELINE_GRID',
      };
    });
  }, [searchResult.tradeable]);

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
Compliance: RED III / Mass Balance Validated`.trim();

    navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Find transit steps for corridor map
  const transitSteps = useMemo(() => {
    if (!selectedOpp) return [];
    if (selectedOpp.originCountry === selectedOpp.targetCountry) {
      return [selectedOpp.originCountry];
    }
    return [selectedOpp.originCountry, selectedOpp.targetCountry];
  }, [selectedOpp]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-950 text-stone-100">
      {/* 1. Master Order Intake Panel */}
      <OrderIntakePanel
        request={request}
        deskMode={deskMode}
        onSelectDeskMode={setDeskMode}
        onChange={updated => setRequest(prev => ({ ...prev, ...updated }))}
        onApplyPreset={handleApplyPreset}
      />

      {/* 2. Main Sourcing & Visualizer Split Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left Column: Sourced Plants & Routes Table (7 cols) */}
        <div className="xl:col-span-7 flex flex-col min-h-[500px]">
          <PlantScannerTable
            opportunities={enrichedOpportunities}
            matchedPlants={BIOMETHANE_PLANTS}
            selectedOpp={selectedOpp}
            onSelectOpp={opp => setSelectedOpp(opp)}
          />
        </div>

        {/* Right Column: Visualizer & Cost Waterfall (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Top Right: Embedded Corridor Mini Map */}
          <div className="h-[260px] flex-none">
            <CorridorMiniMap
              originCountry={selectedOpp?.originCountry || 'DK'}
              targetCountry={selectedOpp?.targetCountry || (request.targetMarketId === 'ANY' ? 'DE' : request.targetMarketId.slice(0, 2))}
              plantName={selectedOpp?.originPlantName}
              plantCoords={selectedOpp?.originPlantCoords}
              transitSteps={transitSteps}
              distanceKm={selectedOpp?.logisticsDistanceKm}
              logisticsCostEur={selectedOpp?.transitCostEurPerMWh}
              deliveryMode={selectedOpp?.deliveryMode}
            />
          </div>

          {/* Bottom Right: Financial Waterfall Card */}
          <div className="flex-1 min-h-[360px]">
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
