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
const SourcingOriginationDesk = React.lazy(() => import('../features/sourcing/SourcingOriginationDesk').then(m => ({ default: m.SourcingOriginationDesk })));
const MapScreen = React.lazy(() => import('../features/map/MapScreen').then(m => ({ default: m.MapScreen })));
const DetailedPricingScreen = React.lazy(() => import('../features/marks/DetailedPricingScreen').then(m => ({ default: m.DetailedPricingScreen })));
const TradeBuilderScreen = React.lazy(() => import('../features/trade-builder/TradeBuilderScreen').then(m => ({ default: m.TradeBuilderScreen })));
const PlantsScreen = React.lazy(() => import('../features/plants/PlantsScreen').then(m => ({ default: m.PlantsScreen })));
const RegistriesScreen = React.lazy(() => import('../features/registries/RegistriesScreen').then(m => ({ default: m.RegistriesScreen })));
const ScannerScreen = React.lazy(() => import('../features/opportunity-scanner/ScannerScreen').then(m => ({ default: m.ScannerScreen })));
const LibraryScreen = React.lazy(() => import('../features/trade-library/LibraryScreen').then(m => ({ default: m.LibraryScreen })));
const CitationsScreen = React.lazy(() => import('../features/citations/CitationsScreen').then(m => ({ default: m.CitationsScreen })));
const DataSourcesScreen = React.lazy(() => import('../features/provenance/DataSourcesScreen').then(m => ({ default: m.DataSourcesScreen })));
const SettingsScreen = React.lazy(() => import('../features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-950">
      <div className="text-stone-400 text-sm font-mono animate-pulse">Loading Biomethane Desk...</div>
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
            <Route path="/" element={<SourcingOriginationDesk />} />
            <Route path="/sourcing" element={<SourcingOriginationDesk />} />
            <Route path="/commercial" element={<SourcingOriginationDesk />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/pricing" element={<DetailedPricingScreen />} />
            <Route path="/marks" element={<DetailedPricingScreen />} />

            {/* Plants & Registries Pages */}
            <Route path="/plants" element={<PlantsScreen />} />
            <Route path="/registries" element={<RegistriesScreen />} />
            <Route path="/data-sources" element={<DataSourcesScreen />} />
            <Route path="/provenance" element={<DataSourcesScreen />} />

            {/* Supporting Tools & Desks */}
            <Route path="/trade" element={<TradeBuilderScreen />} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/citations" element={<CitationsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />

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
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
