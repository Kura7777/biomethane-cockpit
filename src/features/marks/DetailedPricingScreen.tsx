import React, { useState } from 'react';
import { useAppState } from '../../store/context';
import { INITIAL_BROKER_QUOTES, BrokerMarketQuote } from '../../domain/markets/brokerMarketData';
import { 
  TrendingUp, 
  Flame, 
  DollarSign, 
  Search, 
  Filter, 
  Download, 
  Check, 
  Sparkles,
  Layers,
  ArrowUpDown,
  FileSpreadsheet
} from 'lucide-react';
import { PriceSide } from '../../domain/markets/types';

export function DetailedPricingScreen() {
  const { state, dispatch } = useAppState();
  const [quotes, setQuotes] = useState<BrokerMarketQuote[]>(INITIAL_BROKER_QUOTES);
  const [selectedBook, setSelectedBook] = useState<'ALL' | 'COMPLIANCE' | 'VOLUNTARY'>('ALL');
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
  const [vintageFilter, setVintageFilter] = useState<'CURRENT_FORWARD' | 'ALL'>('CURRENT_FORWARD');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [gasIndexInput, setGasIndexInput] = useState<string>(
    state.marks.gasIndex.mid?.toString() || '32.50'
  );
  const [fxInput, setFxInput] = useState<string>(
    state.marks.fx.gbpEur?.toString() || '1.175'
  );
  const [savedNote, setSavedNote] = useState<string | null>(null);

  const countries = ['ALL', 'UK', 'FR', 'NL', 'DE', 'DK', 'AIB'];

  // Handle cell edit for BID, OFFER, and Volumes
  const handleCellEdit = (id: string, field: 'bidPrice' | 'offerPrice' | 'bidVolume' | 'offerVolume', value: string) => {
    setQuotes(prev => prev.map(q => {
      if (q.id === id) {
        return { ...q, [field]: value };
      }
      return q;
    }));

    // If it's a numeric bid or offer, also update national mark if applicable
    const quote = quotes.find(q => q.id === id);
    if (quote && (field === 'bidPrice' || field === 'offerPrice')) {
      const cleaned = value.replace(/[^0-9.]/g, '');
      const numVal = cleaned ? Number(cleaned) : null;
      if (numVal && !isNaN(numVal)) {
        const marketMap: Record<string, string> = {
          DE: 'DE_THG',
          NL: 'NL_ERE',
          FR: 'FR_CPB',
          UK: 'UK_RTFO',
        };
        const marketId = marketMap[quote.country];
        if (marketId) {
          const existing = state.marks.marks[marketId];
          const now = new Date().toISOString();
          dispatch({
            type: 'SET_MARK',
            marketId,
            bid: field === 'bidPrice' ? numVal : existing?.bid ?? null,
            offer: field === 'offerPrice' ? numVal : existing?.offer ?? null,
            mid: numVal,
            updatedAt: now,
            source: 'BROKER RUN · SHEET',
          });
        }
      }
    }

    setSavedNote('Saved broker mark');
    setTimeout(() => setSavedNote(null), 2000);
  };

  // Save TTF Gas Index
  const handleSaveGasIndex = () => {
    const val = Number(gasIndexInput);
    if (!isNaN(val) && val > 0) {
      dispatch({
        type: 'SET_GAS_INDEX',
        bid: state.marks.gasIndex.bid ?? val,
        offer: state.marks.gasIndex.offer ?? val,
        mid: val,
      });
      setSavedNote('Updated TTF Gas Index');
      setTimeout(() => setSavedNote(null), 2000);
    }
  };

  // Save FX rate
  const handleSaveFx = () => {
    const val = Number(fxInput);
    if (!isNaN(val) && val > 0) {
      dispatch({
        type: 'SET_FX',
        currency: 'gbpEur',
        value: val,
      });
      setSavedNote('Updated GBP/EUR rate');
      setTimeout(() => setSavedNote(null), 2000);
    }
  };

  // Export as CSV
  const handleExportCSV = () => {
    const headers = ['Country', 'Class', 'Feedstock', 'Vintage', 'Certified', 'Subsidized', 'CI Score', 'BID Price', 'OFFER Price', 'BID Volume', 'OFFER Volume'];
    const rows = quotes.map(q => [
      q.country,
      q.class,
      `"${q.feedstock}"`,
      q.vintage,
      `"${q.certified}"`,
      q.subsidized,
      `"${q.ciScore}"`,
      `"${q.bidPrice}"`,
      `"${q.offerPrice}"`,
      `"${q.bidVolume}"`,
      `"${q.offerVolume}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `biomethane-broker-sheet-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredQuotes = quotes.filter(q => {
    const matchBook = selectedBook === 'ALL'
      || (selectedBook === 'COMPLIANCE' && q.productClass === 'BUNDLED_COMPLIANCE')
      || (selectedBook === 'VOLUNTARY' && q.productClass === 'GO_VOLUNTARY');
    const matchCountry = selectedCountry === 'ALL' || q.country === selectedCountry;
    const isHistorical = q.vintage === '2024' || q.vintage === 'H224' || q.vintage === '2025' || q.vintage === 'H225';
    const matchVintage = vintageFilter === 'ALL' || !isHistorical;
    const matchSearch = !searchTerm || 
      q.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.feedstock.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.vintage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.certified.toLowerCase().includes(searchTerm.toLowerCase());
    return matchBook && matchCountry && matchVintage && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#08090d] text-zinc-100 font-sans">
      {/* Top Banner: Gas Index & FX controls */}
      <div className="bg-[#0e1118] border-b border-[#1e2433] px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/40 border border-cyan-500/40/80 flex items-center justify-center text-cyan-400 shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
              <span>Biomethane Markets — Broker Pricing Sheet</span>
              {savedNote && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full font-mono animate-pulse font-bold">
                  ✓ {savedNote}
                </span>
              )}
            </h1>
            <p className="font-mono text-[11px] text-zinc-400">
              50% Compliance Quotas &amp; 50% Voluntary GOs · Bids and offers with live inline cell editing
            </p>
          </div>
        </div>

        {/* TTF Gas Index & FX Inputs */}
        <div className="flex items-center gap-3 flex-wrap font-mono">
          {/* TTF Gas Index */}
          <div className="flex items-center gap-2 bg-[#08090d]/90 border border-[#2b3347]/80 rounded-lg px-3 py-1.5 shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 uppercase font-bold">
              TTF M+1:
            </span>
            <input
              type="number"
              step="0.10"
              value={gasIndexInput}
              onChange={e => setGasIndexInput(e.target.value)}
              onBlur={handleSaveGasIndex}
              className="w-16 bg-[#0e1118] border border-[#2b3347] rounded px-1.5 py-0.5 text-right text-xs font-bold text-zinc-100 focus:outline-hidden focus:border-cyan-500/60"
            />
            <span className="text-[10px] text-zinc-500">€/MWh</span>
          </div>

          {/* GBP / EUR FX */}
          <div className="flex items-center gap-2 bg-[#08090d]/90 border border-[#2b3347]/80 rounded-lg px-3 py-1.5 shadow-sm">
            <DollarSign className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-[10px] text-zinc-400 uppercase font-bold">
              GBP/EUR:
            </span>
            <input
              type="number"
              step="0.005"
              value={fxInput}
              onChange={e => setFxInput(e.target.value)}
              onBlur={handleSaveFx}
              className="w-16 bg-[#0e1118] border border-[#2b3347] rounded px-1.5 py-0.5 text-right text-xs font-bold text-zinc-100 focus:outline-hidden focus:border-cyan-500/60"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1e2433] border border-[#2b3347] text-zinc-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Country Tabs Strip */}
      <div className="bg-[#08090d] border-b border-[#1e2433] px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Trading Book Filter Buttons */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-zinc-500 uppercase font-bold mr-1">
              Book:
            </span>
            <button
              type="button"
              onClick={() => setSelectedBook('ALL')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                selectedBook === 'ALL'
                  ? 'bg-cyan-500 text-black font-bold shadow-md ring-1 ring-cyan-400'
                  : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
              }`}
            >
              All (50/50)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBook('COMPLIANCE')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                selectedBook === 'COMPLIANCE'
                  ? 'bg-cyan-600 text-white font-bold shadow-md ring-1 ring-cyan-400'
                  : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
              }`}
            >
              🏛️ Compliance (50%)
            </button>
            <button
              type="button"
              onClick={() => setSelectedBook('VOLUNTARY')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                selectedBook === 'VOLUNTARY'
                  ? 'bg-emerald-600 text-white font-bold shadow-md ring-1 ring-emerald-400'
                  : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
              }`}
            >
              🌱 Voluntary (50%)
            </button>
          </div>

          {/* Country Filter Buttons */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-zinc-500 uppercase font-bold mr-1">
              Country:
            </span>
            {countries.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedCountry(c)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                  selectedCountry === c
                    ? 'bg-zinc-200 text-black font-bold shadow-md'
                    : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {/* Vintage Filter Buttons */}
          <div className="flex items-center gap-1">
            <span className="font-mono text-[10px] text-zinc-500 uppercase font-bold mr-1">
              Vintage:
            </span>
            <button
              type="button"
              onClick={() => setVintageFilter('CURRENT_FORWARD')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                vintageFilter === 'CURRENT_FORWARD'
                  ? 'bg-zinc-200 text-black font-bold shadow-md'
                  : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
              }`}
            >
              2026+ Forward
            </button>
            <button
              type="button"
              onClick={() => setVintageFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                vintageFilter === 'ALL'
                  ? 'bg-zinc-200 text-black font-bold shadow-md'
                  : 'bg-[#0e1118] hover:bg-stone-850 text-zinc-400 hover:text-zinc-200 border border-[#1e2433]'
              }`}
            >
              All Vintages
            </button>
          </div>
        </div>

        {/* Table Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-zinc-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter feedstock, vintage, certificate..."
            className="bg-[#0e1118] border border-[#2b3347]/80 rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs text-zinc-200 placeholder-stone-500 focus:outline-hidden focus:border-cyan-500/60 w-64 transition-colors"
          />
        </div>
      </div>

      {/* Main Detailed Pricing Spreadsheet Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-[#1e2433] rounded-xl overflow-hidden shadow-2xl bg-[#0e1118]">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead className="bg-[#0f172a] text-zinc-300 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-[#2b3347] shadow-md">
              <tr>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Country</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Trading Book</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Class</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Feedstock</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Vintage</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Certified</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">Subsidized</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold">CI Score</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold text-center w-24">AS OF</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold text-right w-32 bg-[#164e63] text-cyan-200">BID Price</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold text-right w-32 bg-[#78350f] text-amber-200">OFFER Price</th>
                <th className="py-3 px-3.5 border-r border-[#2b3347]/60 font-bold text-right w-28">BID Vol</th>
                <th className="py-3 px-3.5 font-bold text-right w-28">OFFER Vol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono text-[11px]">
              {filteredQuotes.map((q, idx) => {
                const isHighlighted = q.highlight;

                return (
                  <tr
                    key={q.id}
                    className={`transition-colors hover:bg-stone-850/90 ${
                      isHighlighted
                        ? 'bg-amber-950/20 text-zinc-100 font-medium'
                        : idx % 2 === 0
                        ? 'bg-[#08090d]/60 text-zinc-200'
                        : 'bg-[#0e1118]/40 text-zinc-200'
                    }`}
                  >
                    {/* Country */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] font-bold text-zinc-100">
                      <span className="px-1.5 py-0.5 rounded bg-[#0e1118] border border-[#1e2433]">
                        {q.country}
                      </span>
                    </td>

                    {/* Book */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433]">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        q.productClass === 'GO_VOLUNTARY'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                      }`}>
                        {q.productClass === 'GO_VOLUNTARY' ? '🌱 VOLUNTARY' : '🏛️ COMPLIANCE'}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-zinc-300">
                      {q.class}
                    </td>

                    {/* Feedstock */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-zinc-200 font-sans font-medium">
                      {q.feedstock}
                    </td>

                    {/* Vintage */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-zinc-300">
                      {q.vintage}
                    </td>

                    {/* Certified */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-zinc-300 font-sans">
                      {q.certified}
                    </td>

                    {/* Subsidized */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-zinc-400">
                      {q.subsidized}
                    </td>

                    {/* CI Score */}
                    <td className="py-2.5 px-3.5 border-r border-[#1e2433] text-cyan-400 font-bold">
                      {q.ciScore || '—'}
                    </td>

                    {/* AS OF Date */}
                    <td className="py-2.5 px-3 border-r border-[#1e2433] text-center font-mono text-[10px] text-zinc-400">
                      <span className="px-1.5 py-0.5 rounded bg-[#08090d] border border-[#1e2433]">
                        {q.observedAt || '2026-08-20'}
                      </span>
                    </td>

                    {/* BID Price (Editable) */}
                    <td className="py-1 px-2 border-r border-[#1e2433] text-right bg-cyan-950/40/15">
                      <input
                        type="text"
                        value={q.bidPrice}
                        onChange={e => handleCellEdit(q.id, 'bidPrice', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-bold text-emerald-400 focus:bg-[#08090d] focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-cyan-500/60 transition-colors"
                      />
                    </td>

                    {/* OFFER Price (Editable) */}
                    <td className="py-1 px-2 border-r border-[#1e2433] text-right bg-amber-950/15">
                      <input
                        type="text"
                        value={q.offerPrice}
                        onChange={e => handleCellEdit(q.id, 'offerPrice', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-bold text-amber-300 focus:bg-[#08090d] focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-amber-500 transition-colors"
                      />
                    </td>

                    {/* BID Volume (Editable) */}
                    <td className="py-1 px-2 border-r border-[#1e2433] text-right">
                      <input
                        type="text"
                        value={q.bidVolume}
                        onChange={e => handleCellEdit(q.id, 'bidVolume', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-semibold text-zinc-300 focus:bg-[#08090d] focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-[#3b4560] transition-colors"
                      />
                    </td>

                    {/* OFFER Volume (Editable) */}
                    <td className="py-1 px-2 text-right">
                      <input
                        type="text"
                        value={q.offerVolume}
                        onChange={e => handleCellEdit(q.id, 'offerVolume', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-semibold text-zinc-300 focus:bg-[#08090d] focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-[#3b4560] transition-colors"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div className="mt-3.5 p-3 rounded-xl bg-[#0e1118] border border-[#1e2433] text-zinc-400 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <span>* Bids and offers for green certificates only (index gas added on top). Calibrated across 50% Compliance Quotas (THG/ERE/RTFO) and 50% Voluntary Guarantees of Origin (AIB/dena/VertiCer/GGCS). EU ETS Scope 1 parity floor €14.54/MWh.</span>
          <span className="text-cyan-400 font-bold">{filteredQuotes.length} active quotes displayed</span>
        </div>
      </div>
    </div>
  );
}
