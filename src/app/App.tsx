import React, { Suspense } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '../store/context';
import { Layout } from './Layout';

/**
 * The desk is a two-stage flow: /sourcing finds and ranks tradeable routes, and
 * /trade builds a deal from the one you picked. Every "structure this deal" button
 * in the app links to /trade through buildDealUrl (domain/trade/dealParams).
 *
 * Keep this table and that contract in step — an entry point that navigates to a
 * path with no Route here renders nothing, silently. That is exactly how the Trade
 * Builder came to be imported but unrouted while nine screens linked to it.
 * architecture.test.ts now fails if a navigate() target is missing from this file.
 */
function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error: any) {
      const isChunkError =
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isChunkError) {
        const reloadKey = 'chunk_reload_' + window.location.hash;
        if (!sessionStorage.getItem(reloadKey)) {
          sessionStorage.setItem(reloadKey, 'true');
          window.location.reload();
          return new Promise<{ default: T }>(() => {});
        }
      }
      throw error;
    }
  });
}

const CommercialFlowStepper = lazyWithRetry(() => import('../features/commercial/CommercialFlowStepper').then(m => ({ default: m.CommercialFlowStepper })));
const MapScreen = lazyWithRetry(() => import('../features/map/MapScreen').then(m => ({ default: m.MapScreen })));
const PricingScreen = lazyWithRetry(() => import('../features/pricing/PricingScreen').then(m => ({ default: m.PricingScreen })));
const TradeBuilderScreen = lazyWithRetry(() => import('../features/trade-builder/TradeBuilderScreen').then(m => ({ default: m.TradeBuilderScreen })));
const PlantsScreen = lazyWithRetry(() => import('../features/plants/PlantsScreen').then(m => ({ default: m.PlantsScreen })));
const OriginationPipelineScreen = lazyWithRetry(() => import('../features/plants/OriginationPipelineScreen').then(m => ({ default: m.OriginationPipelineScreen })));
const RegistriesScreen = lazyWithRetry(() => import('../features/registries/RegistriesScreen').then(m => ({ default: m.RegistriesScreen })));
const CitationsScreen = lazyWithRetry(() => import('../features/citations/CitationsScreen').then(m => ({ default: m.CitationsScreen })));
const DataSourcesScreen = lazyWithRetry(() => import('../features/provenance/DataSourcesScreen').then(m => ({ default: m.DataSourcesScreen })));
const DataConnectorsScreen = lazyWithRetry(() => import('../features/settings/DataConnectorsScreen').then(m => ({ default: m.DataConnectorsScreen })));
const CorporateOrderScreen = lazyWithRetry(() => import('../features/corporate/CorporateOrderScreen').then(m => ({ default: m.CorporateOrderScreen })));
const ClientsScreen = lazyWithRetry(() => import('../features/clients/ClientsScreen').then(m => ({ default: m.ClientsScreen })));
const Ets2Screen = lazyWithRetry(() => import('../features/ets2/Ets2Screen').then(m => ({ default: m.Ets2Screen })));
const FuelEUShippingScreen = lazyWithRetry(() => import('../features/fueleu/FuelEUShippingScreen').then(m => ({ default: m.FuelEUShippingScreen })));
const RegulationCheckScreen = lazyWithRetry(() => import('../features/regcheck/RegulationCheckScreen').then(m => ({ default: m.RegulationCheckScreen })));
const MorningBriefScreen = lazyWithRetry(() => import('../features/briefing/MorningBriefScreen').then(m => ({ default: m.MorningBriefScreen })));
const DealsScreen = lazyWithRetry(() => import('../features/deals/DealsScreen').then(m => ({ default: m.DealsScreen })));

import { ThemeProvider } from '../store/theme';

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <div className="skel" style={{ width: '120px', height: '14px' }} />
    </div>
  );
}

function AppContent() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Primary Workspaces */}
            <Route path="/" element={<MorningBriefScreen />} />
            <Route path="/sourcing" element={<CommercialFlowStepper />} />
            <Route path="/commercial" element={<CommercialFlowStepper />} />
            <Route path="/desk" element={<Navigate to="/sourcing" replace />} />
            <Route path="/scanner" element={<Navigate to="/sourcing" replace />} />
            <Route path="/brief" element={<MorningBriefScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/pricing" element={<PricingScreen />} />
            <Route path="/marks" element={<PricingScreen />} />

            {/* Plants & Registries Pages */}
            <Route path="/plants" element={<PlantsScreen />} />
            {/* /origination is the one address for this screen; the old plants-prefixed path redirects here. */}
            <Route path="/plants/pipeline" element={<Navigate to="/origination" replace />} />
            <Route path="/origination" element={<OriginationPipelineScreen />} />
            <Route path="/registries" element={<RegistriesScreen />} />
            <Route path="/data-sources" element={<DataSourcesScreen />} />
            <Route path="/provenance" element={<DataSourcesScreen />} />

            {/* FuelEU Maritime Desk */}
            <Route path="/fueleu-shipping" element={<FuelEUShippingScreen />} />
            <Route path="/fueleu" element={<Navigate to="/fueleu-shipping" replace />} />
            <Route path="/shipping" element={<Navigate to="/fueleu-shipping" replace />} />

            {/* EU ETS2 exposure desk */}
            <Route path="/ets2" element={<Ets2Screen />} />
            <Route path="/corporate" element={<CorporateOrderScreen />} />
            {/* The value stack now lives inside each company (Clients, EU ETS); old links land on Clients. */}
            <Route path="/value-stack" element={<Navigate to="/clients" replace />} />
            <Route path="/clients" element={<ClientsScreen />} />

            {/* Supporting Tools & Desks */}
            <Route path="/trade" element={<TradeBuilderScreen />} />
            <Route path="/deals" element={<DealsScreen />} />
            <Route path="/risk" element={<Navigate to="/sourcing" replace />} />
            <Route path="/library" element={<Navigate to="/trade" replace />} />
            <Route path="/citations" element={<CitationsScreen />} />
            <Route path="/connectors" element={<DataConnectorsScreen />} />
            {/* Settings had no real settings — Backup/Restore already covers it from the Pricing desk footer. */}
            <Route path="/settings" element={<Navigate to="/pricing" replace />} />
            {/* Kept for old bookmarks — the Assumptions screen now lives inside the Pricing desk. */}
            <Route path="/assumptions" element={<Navigate to="/pricing?tab=assumptions" replace />} />
            <Route path="/regulation-check" element={<RegulationCheckScreen />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </HashRouter>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ThemeProvider>
  );
}
