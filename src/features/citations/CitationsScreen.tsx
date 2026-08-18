import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEGAL_CITATIONS, getCitationById, searchCitations } from '../../domain/citations/registry';
import { LegalCitation } from '../../domain/citations/types';

interface WikiSection {
  id: string;
  title: string;
  subsections?: { id: string; title: string }[];
}

export function CitationsScreen() {
  const navigate = useNavigate();
  const [selectedCitationId, setSelectedCitationId] = useState<string>('RED_III_DIR_2023_2413');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'article' | 'talk'>('article');
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [textSize, setTextSize] = useState<'standard' | 'large'>('standard');

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchCitations(searchQuery);
  }, [searchQuery]);

  const activeDoc: LegalCitation = useMemo(() => {
    return getCitationById(selectedCitationId) || LEGAL_CITATIONS[0];
  }, [selectedCitationId]);

  // Handle copy link/citation
  const handleCopy = () => {
    const cite = `"${activeDoc.shortTitle}", ${activeDoc.officialTitle}. Primary Ref: ${activeDoc.primaryArticle}. ${activeDoc.officialUrl || ''}`;
    navigator.clipboard.writeText(cite);
    setCopiedSuccess(true);
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  // Dynamic table of contents for the active document
  const tableOfContents: WikiSection[] = useMemo(() => {
    return [
      { id: 'summary', title: '1. Executive Overview & Scope' },
      { id: 'trading-rule', title: '2. Golden Trading Desk Rule' },
      { id: 'statutory-framework', title: '3. Statutory & Commercial Framework' },
      { id: 'compliance-gates', title: '4. Compliance Gates & Audit Scope' },
      { id: 'penalties', title: '5. Penalties, Floor Prices & Buyout Caps' },
      { id: 'statutory-text', title: '6. Verbatim Statutory Provisions' },
      { id: 'references', title: '7. Official Portals & Legal References' },
      { id: 'see-also', title: '8. See Also & Interconnected Markets' },
    ];
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0d1117] text-[#c9d1d9] font-sans overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. WIKIPEDIA TOP GLOBAL NAV HEADER */}
      {/* ========================================================================= */}
      <header className="flex-none px-6 py-2.5 bg-[#161b22] border-b border-[#30363d] flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div 
            onClick={() => setSelectedCitationId('RED_III_DIR_2023_2413')} 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-teal-950 border border-teal-600/80 flex items-center justify-center font-serif text-teal-400 font-bold text-base shadow-inner">
              W
            </div>
            <div>
              <div className="font-serif font-bold text-sm text-stone-100 tracking-tight leading-none">
                BIOMETHANEPEDIA
              </div>
              <div className="font-mono text-[10px] text-stone-400 tracking-wider uppercase mt-0.5">
                The Free European Regulatory Encyclopedia
              </div>
            </div>
          </div>

          {/* Quick Country Dropdown Jump */}
          <div className="flex items-center gap-1.5 ml-4 pl-4 border-l border-[#30363d]">
            <span className="font-mono text-xs text-stone-400">Jurisdiction:</span>
            <select
              value={activeDoc.id}
              onChange={e => setSelectedCitationId(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] text-stone-200 font-mono text-xs px-2.5 py-1 rounded-xs outline-none focus:border-teal-500 cursor-pointer"
            >
              <optgroup label="Pan-European Directives & Regulations">
                {LEGAL_CITATIONS.filter(c => c.category === 'EU_DIRECTIVE' || c.category === 'EU_REGULATION').map(c => (
                  <option key={c.id} value={c.id}>
                    EU — {c.shortTitle}
                  </option>
                ))}
              </optgroup>
              <optgroup label="National Quota Laws & Feed-in Acts">
                {LEGAL_CITATIONS.filter(c => c.category === 'NATIONAL_QUOTA_LAW').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.jurisdiction} — {c.shortTitle}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Voluntary Schemes & Methodologies">
                {LEGAL_CITATIONS.filter(c => c.category === 'CERTIFICATION_SCHEME' || c.category === 'GLOSSARY_TERM').map(c => (
                  <option key={c.id} value={c.id}>
                    {c.shortTitle}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {/* Global Wiki Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative w-80">
            <input
              type="text"
              placeholder="Search Biomethane Wikipedia…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1117] border border-[#30363d] text-stone-100 placeholder-stone-500 font-sans text-xs px-3 py-1.5 rounded-xs outline-none focus:border-teal-500"
            />
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#161b22] border border-[#30363d] shadow-2xl rounded-xs z-50 max-h-72 overflow-y-auto divide-y divide-[#30363d]">
                {searchResults.length > 0 ? (
                  searchResults.map(res => (
                    <div
                      key={res.id}
                      onClick={() => {
                        setSelectedCitationId(res.id);
                        setSearchQuery('');
                      }}
                      className="p-2.5 hover:bg-[#21262d] cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-micro text-teal-400 font-bold">{res.code}</span>
                        <span className="font-mono text-micro text-stone-400">{res.jurisdiction}</span>
                      </div>
                      <div className="text-xs font-semibold text-stone-100 mt-0.5">{res.shortTitle}</div>
                    </div>
                  ))
                ) : (
                  <div className="p-3 text-xs text-stone-400 font-mono">No matching articles found</div>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-stone-200 font-mono text-xs font-semibold rounded-xs cursor-pointer transition-colors"
          >
            {copiedSuccess ? '✓ Copied' : 'Cite Article'}
          </button>

          <button
            type="button"
            onClick={() => navigate('/agents')}
            className="px-3 py-1.5 bg-teal-950/80 hover:bg-teal-900 border border-teal-700/80 text-teal-300 font-mono text-xs font-semibold rounded-xs cursor-pointer transition-colors"
          >
            Ask Copilot →
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WIKIPEDIA 3-PANE LAYOUT: [CONTENTS] [ARTICLE + INFOBOX] [SETTINGS] */}
      {/* ========================================================================= */}
      <div className="flex-1 grid grid-cols-[240px_minmax(0,1fr)_180px] min-h-0 overflow-hidden bg-[#0d1117]">
        
        {/* LEFT: WIKIPEDIA TABLE OF CONTENTS */}
        <nav aria-label="Table of contents" className="border-r border-[#30363d] bg-[#161b22]/60 p-5 overflow-y-auto flex flex-col gap-4 text-xs font-sans">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <span className="font-serif font-bold text-stone-200 text-sm">
              Contents
            </span>
            <span className="font-mono text-[10px] text-stone-500 uppercase">
              [hide]
            </span>
          </div>

          {/* Table of Contents List */}
          <ul className="m-0 p-0 list-none flex flex-col gap-1.5 font-sans text-xs">
            <li>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-left w-full text-[#58a6ff] hover:text-[#79c0ff] hover:underline cursor-pointer py-0.5 font-medium"
              >
                (Top)
              </button>
            </li>
            {tableOfContents.map((sec, idx) => (
              <li key={sec.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className="text-left w-full text-[#58a6ff] hover:text-[#79c0ff] hover:underline cursor-pointer leading-snug py-0.5"
                >
                  {sec.title}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* CENTER: WIKIPEDIA ARTICLE READER WITH EMBEDDED INFOBOX */}
        <main className="bg-[#0d1117] overflow-y-auto p-8 px-10 flex flex-col min-h-0 font-serif">
          
          {/* Article Header & Navigation Tabs */}
          <div className="border-b border-[#30363d] pb-2 mb-6 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <h1 className="m-0 font-serif text-3xl font-bold text-stone-100 tracking-tight">
                {activeDoc.shortTitle}
              </h1>
              
              <div className="flex items-center gap-1 font-mono text-xs text-stone-400">
                <span className="px-2 py-0.5 bg-[#21262d] border border-[#30363d] rounded-xs font-semibold text-teal-300">
                  {activeDoc.jurisdictionName}
                </span>
                <span className="px-2 py-0.5 bg-emerald-950/80 border border-emerald-800 text-emerald-400 rounded-xs font-semibold">
                  {activeDoc.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>

            {/* Wikipedia Subheader Tab Strip */}
            <div className="flex items-center justify-between pt-3 font-sans text-xs border-t border-[#21262d] mt-2">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('article')}
                  className={`pb-1 border-b-2 font-medium cursor-pointer transition-colors ${
                    activeTab === 'article'
                      ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Article
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('talk')}
                  className={`pb-1 border-b-2 font-medium cursor-pointer transition-colors ${
                    activeTab === 'talk'
                      ? 'border-[#58a6ff] text-[#58a6ff] font-semibold'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  Desk Notes & History
                </button>
              </div>

              <div className="flex items-center gap-3 text-stone-400 font-mono text-micro">
                <span>Read</span>
                <span>·</span>
                {activeDoc.officialUrl && (
                  <a
                    href={activeDoc.officialUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#58a6ff] hover:underline"
                  >
                    View Official Source ↗
                  </a>
                )}
              </div>
            </div>

            {/* Wikipedia Italic Hatnote */}
            <p className="m-0 text-xs italic text-stone-400 pt-2 font-sans">
              From Biomethane Desk Encyclopedia, the statutory authority on European renewable gas trade law.
            </p>
          </div>

          {/* Article Main Body & Float Infobox */}
          <div className="flex flex-col gap-6">
            
            {/* Top Introductory Section with Floating Wikipedia Infobox */}
            <div className="grid grid-cols-[1fr_320px] gap-8 items-start">
              
              {/* Left Introductory Prose */}
              <div className={`font-sans leading-relaxed text-[#c9d1d9] space-y-4 ${textSize === 'large' ? 'text-base' : 'text-sm'}`}>
                <p>
                  The <strong className="text-stone-100 font-semibold">{activeDoc.shortTitle}</strong> ({activeDoc.officialTitle}) constitutes the statutory benchmark for biomethane offtake, Guarantees of Origin (GOs), and greenhouse gas (GHG) quota compliance across <strong className="text-stone-100">{activeDoc.jurisdictionName}</strong> and the interconnected European gas grid.
                </p>

                <p>
                  Under European Union renewable energy directives, cross-border transactions involving this legislation require strict adherence to mass balance chain of custody, Union Database (UDB) title consignment transfers, and certified life-cycle sustainability assessments.
                </p>

                {/* Section 1: Executive Overview */}
                <section id="summary" className="pt-4">
                  <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                    1. Executive Overview & Scope
                  </h2>
                  <p className="leading-relaxed whitespace-pre-line text-stone-300">
                    {activeDoc.summary}
                  </p>
                </section>
              </div>

              {/* RIGHT: CLASSIC WIKIPEDIA INFOBOX */}
              <aside className="bg-[#161b22] border border-[#30363d] rounded-xs font-sans text-xs shadow-lg">
                {/* Infobox Title Banner */}
                <div className="bg-[#21262d] p-3 text-center border-b border-[#30363d]">
                  <div className="font-bold text-stone-100 text-sm font-serif">
                    {activeDoc.shortTitle}
                  </div>
                  <div className="font-mono text-[10px] text-teal-400 uppercase tracking-wider mt-0.5">
                    {activeDoc.code}
                  </div>
                </div>

                {/* Infobox Key Data Rows */}
                <table className="w-full text-left border-collapse text-xs">
                  <tbody className="divide-y divide-[#30363d]/60">
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 w-32 align-top bg-[#161b22]">Jurisdiction</th>
                      <td className="p-2.5 px-3 text-stone-200 font-medium">{activeDoc.jurisdictionName} ({activeDoc.jurisdiction})</td>
                    </tr>
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Statutory Status</th>
                      <td className="p-2.5 px-3 font-mono font-bold text-emerald-400">{activeDoc.status.replace(/_/g, ' ')}</td>
                    </tr>
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Effective Date</th>
                      <td className="p-2.5 px-3 text-stone-300 font-mono text-micro">{activeDoc.effectiveDate}</td>
                    </tr>
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Primary Articles</th>
                      <td className="p-2.5 px-3 text-stone-300 font-mono text-micro">{activeDoc.primaryArticle}</td>
                    </tr>
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Compliance Gate</th>
                      <td className="p-2.5 px-3 font-mono text-emerald-400 font-bold text-micro">{activeDoc.complianceGate}</td>
                    </tr>
                    <tr>
                      <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Target Markets</th>
                      <td className="p-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {activeDoc.applicableMarkets.length > 0 ? (
                            activeDoc.applicableMarkets.map(m => (
                              <span key={m} className="px-1.5 py-0.2 bg-[#0d1117] border border-[#30363d] text-teal-300 font-mono text-[10px]">
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-stone-500 font-mono text-micro">Voluntary / Corporate</span>
                          )}
                        </div>
                      </td>
                    </tr>
                    {activeDoc.officialUrl && (
                      <tr>
                        <th className="p-2.5 px-3 font-semibold text-stone-400 align-top bg-[#161b22]">Official Text</th>
                        <td className="p-2.5 px-3">
                          <a
                            href={activeDoc.officialUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#58a6ff] hover:underline font-mono text-micro font-medium break-all"
                          >
                            {activeDoc.officialUrlLabel || 'Official Government Portal'} ↗
                          </a>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </aside>

            </div>

            {/* Section 2: Golden Trading Desk Rule */}
            <section id="trading-rule" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                2. Golden Trading Desk Rule
              </h2>
              <div className="p-4 bg-[#161b22] border-l-4 border-teal-500 rounded-r-xs">
                <span className="font-mono text-micro font-bold tracking-wider text-teal-400 uppercase block mb-1">
                  Desk Execution Rule
                </span>
                <p className="m-0 text-sm font-medium text-stone-100 leading-relaxed">
                  {activeDoc.deskRuleSummary}
                </p>
              </div>
            </section>

            {/* Section 3: Statutory & Commercial Framework */}
            <section id="statutory-framework" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                3. Statutory & Commercial Framework
              </h2>
              <div className="text-sm leading-relaxed text-stone-300 space-y-3">
                <p>
                  Commercial settlement under {activeDoc.shortTitle} depends upon physical injection proof into a recognized European transmission system operator (TSO) grid, followed by title transfer documentation within the statutory registry.
                </p>
                <p>
                  Where cross-border pipeline transport is incurred, traders may optimize netback value by pairing physical gas swaps at virtual trading points (e.g. TTF, THE, PEG, PSV) with electronic Proof of Sustainability (PoS) certificate transfers via the European Commission Union Database (UDB).
                </p>
              </div>
            </section>

            {/* Section 4: Compliance Gates & Audit Scope */}
            <section id="compliance-gates" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                4. Compliance Gates & Audit Scope
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xs">
                  <span className="font-mono text-micro font-bold text-emerald-400 uppercase block mb-1">
                    Authoritative Compliance Gates
                  </span>
                  <p className="m-0 text-xs text-stone-300 leading-relaxed">
                    Evaluated by Cockpit Engine: <strong className="text-stone-100 font-mono">{activeDoc.complianceGate}</strong>. Failure to clear all mandatory gates generates a HARD_BLOCK status and invalidates certificate monetization.
                  </p>
                </div>

                <div className="p-3.5 bg-[#161b22] border border-[#30363d] rounded-xs">
                  <span className="font-mono text-micro font-bold text-teal-400 uppercase block mb-1">
                    Recognized Voluntary Schemes
                  </span>
                  <p className="m-0 text-xs text-stone-300 leading-relaxed">
                    ISCC EU, REDcert-EU, KZR INiG, and 2BSvs are formally certified under European Commission implementing decisions as compliant audit bodies.
                  </p>
                </div>
              </div>
            </section>

            {/* Section 5: Penalties & Floor Prices */}
            {activeDoc.penaltiesOrCaps && (
              <section id="penalties" className="pt-2 font-sans">
                <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                  5. Penalties, Floor Prices & Buyout Caps
                </h2>
                <div className="p-4 bg-[#161b22] border-l-4 border-amber-500 rounded-r-xs">
                  <span className="font-mono text-micro font-bold tracking-wider text-amber-400 uppercase block mb-1">
                    Statutory Enforcement & Ceiling
                  </span>
                  <p className="m-0 text-xs leading-relaxed text-amber-200">
                    {activeDoc.penaltiesOrCaps}
                  </p>
                </div>
              </section>
            )}

            {/* Section 6: Verbatim Statutory Text */}
            <section id="statutory-text" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                6. Verbatim Statutory Provisions
              </h2>
              <div className="flex flex-col gap-3">
                {activeDoc.keyStatutoryExcerpts.map((excerpt, idx) => (
                  <blockquote
                    key={idx}
                    className="m-0 p-3.5 px-4 bg-[#161b22] border-l-2 border-[#58a6ff] text-xs font-mono leading-relaxed text-stone-200 italic"
                  >
                    "{excerpt}"
                  </blockquote>
                ))}
              </div>
            </section>

            {/* Section 7: Official References & Portals */}
            <section id="references" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                7. Official Portals & Legal References
              </h2>
              <ul className="m-0 pl-5 text-xs font-mono space-y-1.5 list-disc text-stone-400">
                {activeDoc.officialUrl && (
                  <li>
                    <a
                      href={activeDoc.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#58a6ff] hover:underline"
                    >
                      {activeDoc.officialUrlLabel || 'Primary Official Legislation Portal'} ↗
                    </a>
                  </li>
                )}
                {activeDoc.additionalLinks?.map((lnk, li) => (
                  <li key={li}>
                    <a
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#58a6ff] hover:underline"
                    >
                      {lnk.label} ↗
                    </a>
                  </li>
                ))}
                <li>
                  European Commission Union Database for Gaseous Fuels (UDB), Regulation (EU) 2024/2792.
                </li>
              </ul>
            </section>

            {/* Section 8: See Also */}
            <section id="see-also" className="pt-2 font-sans">
              <h2 className="font-serif text-xl font-bold text-stone-100 border-b border-[#30363d] pb-1 mb-3">
                8. See Also & Interconnected Markets
              </h2>
              <div className="flex flex-wrap gap-2 text-xs font-mono">
                {activeDoc.crossReferences.map((cr, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-[#161b22] border border-[#30363d] text-teal-300 rounded-xs"
                  >
                    {cr}
                  </span>
                ))}
              </div>
            </section>

          </div>

        </main>

        {/* RIGHT: APPEARANCE & WIKI TOOLS PANEL */}
        <aside className="border-l border-[#30363d] bg-[#161b22]/60 p-4 font-sans text-xs flex flex-col gap-5 overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-[#30363d]">
            <span className="font-serif font-bold text-stone-200 text-xs uppercase tracking-wider">
              Appearance
            </span>
            <span className="font-mono text-[10px] text-stone-500 uppercase">
              [hide]
            </span>
          </div>

          {/* Text Size Control */}
          <div className="flex flex-col gap-2">
            <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
              Text Size
            </span>
            <div className="flex flex-col gap-1 font-sans">
              <label className="flex items-center gap-2 cursor-pointer text-stone-300 hover:text-stone-100">
                <input
                  type="radio"
                  name="textSize"
                  checked={textSize === 'standard'}
                  onChange={() => setTextSize('standard')}
                  className="text-teal-500 focus:ring-0"
                />
                <span>Standard</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-stone-300 hover:text-stone-100">
                <input
                  type="radio"
                  name="textSize"
                  checked={textSize === 'large'}
                  onChange={() => setTextSize('large')}
                  className="text-teal-500 focus:ring-0"
                />
                <span>Large Editorial</span>
              </label>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 pt-3 border-t border-[#30363d]">
            <span className="font-mono text-micro font-semibold text-stone-400 uppercase">
              Tools
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="w-full text-left p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xs font-mono text-micro text-stone-200 cursor-pointer"
            >
              📋 Download Citation
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="w-full text-left p-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xs font-mono text-micro text-stone-200 cursor-pointer"
            >
              🖨️ Print Dossier
            </button>
          </div>

          {/* Desk Disclaimer */}
          <div className="mt-auto pt-4 border-t border-[#30363d] text-[10px] text-stone-500 leading-relaxed font-sans">
            Statutes verified against official government gazettes. Clearing prices and quota buyout rules are indicative desk marks.
          </div>
        </aside>

      </div>

    </div>
  );
}
