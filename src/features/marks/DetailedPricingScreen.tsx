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
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');
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
    const matchCountry = selectedCountry === 'ALL' || q.country === selectedCountry;
    const matchSearch = !searchTerm || 
      q.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.feedstock.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.vintage.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.certified.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCountry && matchSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-950 text-stone-100 font-sans">
      {/* Top Banner: Gas Index & FX controls */}
      <div className="bg-stone-900/90 border-b border-stone-800/80 px-6 py-3 flex flex-wrap items-center justify-between gap-4 shrink-0 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-700/80 flex items-center justify-center text-teal-400 shadow-sm">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-100 flex items-center gap-2">
              <span>Biomethane Markets — Broker Pricing Sheet</span>
              {savedNote && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded-full font-mono animate-pulse font-bold">
                  ✓ {savedNote}
                </span>
              )}
            </h1>
            <p className="font-mono text-[11px] text-stone-400">
              Indicative market marks · Bids and offers with live inline cell editing
            </p>
          </div>
        </div>

        {/* TTF Gas Index & FX Inputs */}
        <div className="flex items-center gap-3 flex-wrap font-mono">
          {/* TTF Gas Index */}
          <div className="flex items-center gap-2 bg-stone-950/90 border border-stone-700/80 rounded-lg px-3 py-1.5 shadow-sm">
            <Flame className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase font-bold">
              TTF M+1:
            </span>
            <input
              type="number"
              step="0.10"
              value={gasIndexInput}
              onChange={e => setGasIndexInput(e.target.value)}
              onBlur={handleSaveGasIndex}
              className="w-16 bg-stone-900 border border-stone-700 rounded px-1.5 py-0.5 text-right text-xs font-bold text-stone-100 focus:outline-hidden focus:border-teal-500"
            />
            <span className="text-[10px] text-stone-500">€/MWh</span>
          </div>

          {/* GBP / EUR FX */}
          <div className="flex items-center gap-2 bg-stone-950/90 border border-stone-700/80 rounded-lg px-3 py-1.5 shadow-sm">
            <DollarSign className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-[10px] text-stone-400 uppercase font-bold">
              GBP/EUR:
            </span>
            <input
              type="number"
              step="0.005"
              value={fxInput}
              onChange={e => setFxInput(e.target.value)}
              onBlur={handleSaveFx}
              className="w-16 bg-stone-900 border border-stone-700 rounded px-1.5 py-0.5 text-right text-xs font-bold text-stone-100 focus:outline-hidden focus:border-teal-500"
            />
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-200 text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter & Country Tabs Strip */}
      <div className="bg-stone-950 border-b border-stone-800/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Country Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-stone-500 uppercase font-bold mr-1">
            Country:
          </span>
          {countries.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setSelectedCountry(c)}
              className={`px-3 py-1 rounded-lg font-mono text-[11px] font-bold tracking-wider transition-all cursor-pointer ${
                selectedCountry === c
                  ? 'bg-teal-600 text-stone-950 shadow-md ring-1 ring-teal-400'
                  : 'bg-stone-900/90 hover:bg-stone-850 text-stone-400 hover:text-stone-200 border border-stone-800'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Table Search */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-stone-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Filter feedstock, vintage, certificate..."
            className="bg-stone-900 border border-stone-700/80 rounded-lg pl-8 pr-3 py-1.5 font-mono text-xs text-stone-200 placeholder-stone-500 focus:outline-hidden focus:border-teal-500 w-72 transition-colors"
          />
        </div>
      </div>

      {/* Main Detailed Pricing Spreadsheet Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-stone-800/90 rounded-xl overflow-hidden shadow-2xl bg-stone-900/90">
          <table className="w-full text-left border-collapse font-sans text-xs">
            <thead className="bg-[#0f172a] text-stone-300 font-mono text-[11px] uppercase tracking-wider sticky top-0 z-10 border-b border-stone-700 shadow-md">
              <tr>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Country</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Class</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Feedstock</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Vintage</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Certified</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">Subsidized</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold">CI Score</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold text-right w-32 bg-[#164e63] text-teal-200">BID Price</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold text-right w-32 bg-[#78350f] text-amber-200">OFFER Price</th>
                <th className="py-3 px-3.5 border-r border-stone-700/60 font-bold text-right w-28">BID Vol</th>
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
                        ? 'bg-amber-950/20 text-stone-100 font-medium'
                        : idx % 2 === 0
                        ? 'bg-stone-950/60 text-stone-200'
                        : 'bg-stone-900/40 text-stone-200'
                    }`}
                  >
                    {/* Country */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 font-bold text-stone-100">
                      <span className="px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800">
                        {q.country}
                      </span>
                    </td>

                    {/* Class */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-stone-300">
                      {q.class}
                    </td>

                    {/* Feedstock */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-stone-200 font-sans font-medium">
                      {q.feedstock}
                    </td>

                    {/* Vintage */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-stone-300">
                      {q.vintage}
                    </td>

                    {/* Certified */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-stone-300 font-sans">
                      {q.certified}
                    </td>

                    {/* Subsidized */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-stone-400">
                      {q.subsidized}
                    </td>

                    {/* CI Score */}
                    <td className="py-2.5 px-3.5 border-r border-stone-800/60 text-teal-400 font-bold">
                      {q.ciScore || '—'}
                    </td>

                    {/* BID Price (Editable) */}
                    <td className="py-1 px-2 border-r border-stone-800/60 text-right bg-teal-950/15">
                      <input
                        type="text"
                        value={q.bidPrice}
                        onChange={e => handleCellEdit(q.id, 'bidPrice', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-bold text-emerald-400 focus:bg-stone-950 focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-teal-500 transition-colors"
                      />
                    </td>

                    {/* OFFER Price (Editable) */}
                    <td className="py-1 px-2 border-r border-stone-800/60 text-right bg-amber-950/15">
                      <input
                        type="text"
                        value={q.offerPrice}
                        onChange={e => handleCellEdit(q.id, 'offerPrice', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-bold text-amber-300 focus:bg-stone-950 focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-amber-500 transition-colors"
                      />
                    </td>

                    {/* BID Volume (Editable) */}
                    <td className="py-1 px-2 border-r border-stone-800/60 text-right">
                      <input
                        type="text"
                        value={q.bidVolume}
                        onChange={e => handleCellEdit(q.id, 'bidVolume', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-semibold text-stone-300 focus:bg-stone-950 focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-stone-600 transition-colors"
                      />
                    </td>

                    {/* OFFER Volume (Editable) */}
                    <td className="py-1 px-2 text-right">
                      <input
                        type="text"
                        value={q.offerVolume}
                        onChange={e => handleCellEdit(q.id, 'offerVolume', e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent text-right font-semibold text-stone-300 focus:bg-stone-950 focus:outline-hidden px-2 py-1 rounded border border-transparent focus:border-stone-600 transition-colors"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div className="mt-3.5 p-3 rounded-xl bg-stone-900/70 border border-stone-800 text-stone-400 font-mono text-[11px] flex items-center justify-between shadow-sm">
          <span>* The bids and offers are for certificates only. Index gas price / swap to be added on top.</span>
          <span className="text-teal-400 font-bold">{filteredQuotes.length} active quotes displayed</span>
        </div>
      </div>
    </div>
  );
}
