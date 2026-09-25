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
const SourcingOriginationDesk = lazyWithRetry(() => import('../features/sourcing/SourcingOriginationDesk').then(m => ({ default: m.SourcingOriginationDesk })));
const ScannerScreen = lazyWithRetry(() => import('../features/opportunity-scanner/ScannerScreen').then(m => ({ default: m.ScannerScreen })));
const MapScreen = lazyWithRetry(() => import('../features/map/MapScreen').then(m => ({ default: m.MapScreen })));
const MarksScreen = lazyWithRetry(() => import('../features/marks/MarksScreen').then(m => ({ default: m.MarksScreen })));
const TradeBuilderScreen = lazyWithRetry(() => import('../features/trade-builder/TradeBuilderScreen').then(m => ({ default: m.TradeBuilderScreen })));
const PlantsScreen = lazyWithRetry(() => import('../features/plants/PlantsScreen').then(m => ({ default: m.PlantsScreen })));
const OriginationPipelineScreen = lazyWithRetry(() => import('../features/plants/OriginationPipelineScreen').then(m => ({ default: m.OriginationPipelineScreen })));
const RegistriesScreen = lazyWithRetry(() => import('../features/registries/RegistriesScreen').then(m => ({ default: m.RegistriesScreen })));
const CitationsScreen = lazyWithRetry(() => import('../features/citations/CitationsScreen').then(m => ({ default: m.CitationsScreen })));
const DataSourcesScreen = lazyWithRetry(() => import('../features/provenance/DataSourcesScreen').then(m => ({ default: m.DataSourcesScreen })));
const DataConnectorsScreen = lazyWithRetry(() => import('../features/settings/DataConnectorsScreen').then(m => ({ default: m.DataConnectorsScreen })));
const SettingsScreen = lazyWithRetry(() => import('../features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const AssumptionsScreen = lazyWithRetry(() => import('../features/settings/AssumptionsScreen').then(m => ({ default: m.AssumptionsScreen })));
const FuelEUShippingScreen = lazyWithRetry(() => import('../features/fueleu/FuelEUShippingScreen').then(m => ({ default: m.FuelEUShippingScreen })));

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
            <Route path="/" element={<CommercialFlowStepper />} />
            <Route path="/sourcing" element={<CommercialFlowStepper />} />
            <Route path="/commercial" element={<CommercialFlowStepper />} />
            <Route path="/desk" element={<SourcingOriginationDesk />} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/pricing" element={<MarksScreen />} />
            <Route path="/marks" element={<MarksScreen />} />

            {/* Plants & Registries Pages */}
            <Route path="/plants" element={<PlantsScreen />} />
            <Route path="/plants/pipeline" element={<OriginationPipelineScreen />} />
            <Route path="/origination" element={<OriginationPipelineScreen />} />
            <Route path="/registries" element={<RegistriesScreen />} />
            <Route path="/data-sources" element={<DataSourcesScreen />} />
            <Route path="/provenance" element={<DataSourcesScreen />} />

            {/* FuelEU Maritime Desk */}
            <Route path="/fueleu-shipping" element={<FuelEUShippingScreen />} />
            <Route path="/fueleu" element={<Navigate to="/fueleu-shipping" replace />} />
            <Route path="/shipping" element={<Navigate to="/fueleu-shipping" replace />} />

            {/* Supporting Tools & Desks */}
            <Route path="/trade" element={<TradeBuilderScreen />} />
            <Route path="/risk" element={<Navigate to="/" replace />} />
            <Route path="/library" element={<Navigate to="/trade" replace />} />
            <Route path="/citations" element={<CitationsScreen />} />
            <Route path="/connectors" element={<DataConnectorsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/assumptions" element={<AssumptionsScreen />} />

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
