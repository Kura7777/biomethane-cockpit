import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useAppState } from '../store/context';
import { Layout } from './Layout';
import { MapScreen } from '../features/map/MapScreen';
import { TradeBuilderScreen } from '../features/trade-builder/TradeBuilderScreen';
import { ScannerScreen } from '../features/opportunity-scanner/ScannerScreen';
import { MarksScreen } from '../features/marks/MarksScreen';
import { LibraryScreen } from '../features/trade-library/LibraryScreen';

function AppContent() {
  const { state } = useAppState();
  // Count stale marks
  const staleCount = Object.values(state.marks.marks).filter(m => {
    return m.bid === null && m.offer === null && m.mid === null;
  }).length;

  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout staleMarkCount={staleCount} />}>
          <Route path="/" element={<MapScreen />} />
          <Route path="/trade" element={<TradeBuilderScreen />} />
          <Route path="/scanner" element={<ScannerScreen />} />
          <Route path="/marks" element={<MarksScreen />} />
          <Route path="/library" element={<LibraryScreen />} />
        </Route>
      </Routes>
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
