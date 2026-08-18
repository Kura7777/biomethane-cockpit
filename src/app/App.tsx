import React, { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '../store/context';
import { Layout } from './Layout';

const MapScreen = React.lazy(() => import('../features/map/MapScreen').then(m => ({ default: m.MapScreen })));
const TradeBuilderScreen = React.lazy(() => import('../features/trade-builder/TradeBuilderScreen').then(m => ({ default: m.TradeBuilderScreen })));
const ScannerScreen = React.lazy(() => import('../features/opportunity-scanner/ScannerScreen').then(m => ({ default: m.ScannerScreen })));
const SourcingScreen = React.lazy(() => import('../features/sourcing/SourcingScreen').then(m => ({ default: m.SourcingScreen })));
const ArbitrageAgentsScreen = React.lazy(() => import('../features/arbitrage-agents/ArbitrageAgentsScreen').then(m => ({ default: m.ArbitrageAgentsScreen })));
const PlantsScreen = React.lazy(() => import('../features/plants/PlantsScreen').then(m => ({ default: m.PlantsScreen })));
const MarksScreen = React.lazy(() => import('../features/marks/MarksScreen').then(m => ({ default: m.MarksScreen })));
const LibraryScreen = React.lazy(() => import('../features/trade-library/LibraryScreen').then(m => ({ default: m.LibraryScreen })));
const CitationsScreen = React.lazy(() => import('../features/citations/CitationsScreen').then(m => ({ default: m.CitationsScreen })));
const SettingsScreen = React.lazy(() => import('../features/settings/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const MorningBriefingDesk = React.lazy(() => import('../features/sourcing/MorningBriefingDesk').then(m => ({ default: m.MorningBriefingDesk })));

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
            <Route path="/" element={<MorningBriefingDesk />} />
            <Route path="/briefing" element={<MorningBriefingDesk />} />
            <Route path="/trade" element={<SourcingScreen />} />
            <Route path="/sourcing" element={<SourcingScreen />} />
            <Route path="/map" element={<MapScreen />} />
            <Route path="/scanner" element={<ScannerScreen />} />
            <Route path="/agents" element={<ArbitrageAgentsScreen />} />
            <Route path="/plants" element={<PlantsScreen />} />
            <Route path="/marks" element={<MarksScreen />} />
            <Route path="/library" element={<LibraryScreen />} />
            <Route path="/citations" element={<CitationsScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
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
