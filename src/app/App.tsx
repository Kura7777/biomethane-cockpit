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
const SourcingScreen = React.lazy(() => import('../features/sourcing/SourcingScreen').then(m => ({ default: m.SourcingScreen })));
const TradeBuilderScreen = React.lazy(() => import('../features/trade-builder/TradeBuilderScreen').then(m => ({ default: m.TradeBuilderScreen })));
const MarksScreen = React.lazy(() => import('../features/marks/MarksScreen').then(m => ({ default: m.MarksScreen })));
const PlantsScreen = React.lazy(() => import('../features/plants/PlantsScreen').then(m => ({ default: m.PlantsScreen })));
const MapScreen = React.lazy(() => import('../features/map/MapScreen').then(m => ({ default: m.MapScreen })));
const ScannerScreen = React.lazy(() => import('../features/opportunity-scanner/ScannerScreen').then(m => ({ default: m.ScannerScreen })));
const LibraryScreen = React.lazy(() => import('../features/trade-library/LibraryScreen').then(m => ({ default: m.LibraryScreen })));
const CitationsScreen = React.lazy(() => import('../features/citations/CitationsScreen').then(m => ({ default: m.CitationsScreen })));
const SettingsScreen = React.lazy(() => import('../features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-stone-950">
      <div className="text-stone-400 text-sm font-mono animate-pulse">Loading module...</div>
    </div>
  );
}

function AppContent() {
  return (
    <HashRouter>
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<Layout />}>
            {/* Stage 1 — find and rank routes. Also the landing screen. */}
            <Route path="/" element={<SourcingScreen />} />
            <Route path="/sourcing" element={<SourcingScreen />} />

            {/* Stage 2 — build the deal. Receives buildDealUrl() links. */}
            <Route path="/trade" element={<TradeBuilderScreen />} />

            <Route path="/marks" element={<MarksScreen />} />
            <Route path="/plants" element={<PlantsScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/citations" element={<CitationsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />

            {/* Bookmarks into removed screens land on the desk rather than a blank pane. */}
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
