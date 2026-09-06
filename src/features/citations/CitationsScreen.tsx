import React, { useState, useMemo } from 'react';
import { LEGAL_CITATIONS, getCitationById, searchCitations } from '../../domain/citations/registry';
import { LegalCitation } from '../../domain/citations/types';
import { showToast } from '../../app/DeskToastContainer';

export function CitationsScreen() {
  const [selectedCitationId, setSelectedCitationId] = useState<string>('RED_III_DIR_2023_2413');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('summary');

  const filteredCitations = useMemo(() => {
    if (!searchQuery.trim()) return LEGAL_CITATIONS;
    return searchCitations(searchQuery);
  }, [searchQuery]);

  const activeDoc: LegalCitation = useMemo(() => {
    return getCitationById(selectedCitationId) || LEGAL_CITATIONS[0];
  }, [selectedCitationId]);

  const handleCopyCitation = () => {
    const text = `"${activeDoc.shortTitle}", ${activeDoc.officialTitle}. Primary Ref: ${activeDoc.primaryArticle}. ${activeDoc.officialUrl || ''}`;
    navigator.clipboard.writeText(text);
    showToast('Citation copied to clipboard');
  };

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '280px minmax(0, 1fr) 236px',
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* ─── Left: Search & Register List ─── */}
      <div
        style={{
          borderRight: '2px solid var(--color-divider)',
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
        }}
      >
        <div style={{ padding: '14px 16px', borderBottom: '2px solid var(--color-divider)' }}>
          <div className="eyebrow">Statutory register</div>
          <input
            className="input"
            style={{ marginTop: '8px', width: '100%' }}
            placeholder={`Search ${LEGAL_CITATIONS.length} instruments`}
            aria-label="Search citations"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ padding: '10px 0', overflowY: 'auto', flex: 1 }}>
          {filteredCitations.map(c => {
            const isSelected = c.id === activeDoc.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedCitationId(c.id)}
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '10px',
                  padding: '8px 16px',
                  borderBottom: '1px solid var(--color-divider)',
                  background: isSelected ? 'var(--color-surface)' : 'transparent',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'inset 3px 0 0 var(--color-accent)' : 'none',
                }}
                className="hover:bg-surface/50 select-none"
              >
                <span
                  className="num mut"
                  style={{
                    width: '24px',
                    fontSize: '11px',
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  {c.jurisdiction}
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: '13px',
                    lineHeight: 1.35,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  className="truncate"
                  title={c.shortTitle}
                >
                  {c.shortTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Centre: Document View ─── */}
      <div
        style={{
          borderRight: '2px solid var(--color-divider)',
          minWidth: 0,
          overflowY: 'auto',
        }}
      >
        {/* Document Header */}
        <div style={{ padding: '20px 24px', borderBottom: '2px solid var(--color-divider)' }}>
          <div className="eyebrow">
            {activeDoc.jurisdictionName.toUpperCase()} · {activeDoc.status.replace(/_/g, ' ')} · CONSOLIDATED TO AUGUST 2026
          </div>
          <h3 style={{ fontSize: '30px', margin: '8px 0 6px', fontWeight: 800 }} className="font-heading">
            {activeDoc.shortTitle}
          </h3>
          <div style={{ fontSize: '13px' }} className="mut">
            {activeDoc.officialTitle} · {activeDoc.primaryArticle}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ padding: '5px 10px', fontSize: '12px' }}
              onClick={handleCopyCitation}
            >
              Copy citation
            </button>
            {activeDoc.officialUrl && (
              <a
                href={activeDoc.officialUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ padding: '5px 10px', fontSize: '12px', textDecoration: 'none' }}
              >
                Open Official Source ↗
              </a>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div style={{ padding: '20px 24px', maxWidth: '760px' }}>
          {/* Section 1: Executive Overview */}
          <section id="summary" style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
              Executive Overview &amp; Scope
            </h4>
            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 14px' }}>
              {activeDoc.summary}
            </p>
          </section>

          <div style={{ height: '2px', background: 'var(--color-divider)', margin: '0 0 18px' }}></div>

          {/* Section 2: Golden Trading Desk Rule */}
          <section id="trading-rule" style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
              Golden trading desk rule
            </h4>
            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 18px' }}>
              {activeDoc.deskRuleSummary}
            </p>
          </section>

          <div style={{ height: '2px', background: 'var(--color-divider)', margin: '0 0 18px' }}></div>

          {/* Section 3: Statutory Framework & Excerpts */}
          <section id="statutory-framework" style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
              Statutory framework &amp; provisions
            </h4>
            <p style={{ fontSize: '14px', lineHeight: 1.6, margin: '0 0 12px' }} className="mut">
              Primary articles and binding legislative mandates governing this mechanism:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-divider)' }}>
              {activeDoc.keyStatutoryExcerpts && activeDoc.keyStatutoryExcerpts.length > 0 ? (
                activeDoc.keyStatutoryExcerpts.map((excerpt, idx) => {
                  const parts = excerpt.split(':');
                  const ref = parts.length > 1 ? parts[0] : `Article ${idx + 1}`;
                  const body = parts.length > 1 ? parts.slice(1).join(':') : excerpt;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '190px minmax(0, 1fr)',
                        gap: '16px',
                        padding: '10px 0',
                        borderBottom: '1px solid var(--color-divider)',
                      }}
                    >
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>{ref}</span>
                      <span style={{ fontSize: '13px', lineHeight: 1.5 }} className="mut">{body}</span>
                    </div>
                  );
                })
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '190px minmax(0, 1fr)',
                    gap: '16px',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-divider)',
                  }}
                >
                  <span style={{ fontSize: '12px', fontWeight: 600 }}>{activeDoc.primaryArticle}</span>
                  <span style={{ fontSize: '13px', lineHeight: 1.5 }} className="mut">{activeDoc.officialTitle}</span>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: Compliance Gates */}
          <section id="compliance-gates" style={{ marginBottom: '24px' }}>
            <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
              Compliance gates &amp; audit scope
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--color-divider)', marginTop: '8px' }}>
              <div style={{ background: 'var(--color-bg)', padding: '12px 16px' }}>
                <div className="eyebrow">Evaluated Gate</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>{activeDoc.complianceGate}</div>
              </div>
              <div style={{ background: 'var(--color-bg)', padding: '12px 16px' }}>
                <div className="eyebrow">Applicable Markets</div>
                <div style={{ fontSize: '14px', fontWeight: 600, marginTop: '2px' }}>
                  {activeDoc.applicableMarkets.length > 0 ? activeDoc.applicableMarkets.join(', ') : 'Voluntary / Scope 1'}
                </div>
              </div>
            </div>
          </section>

          {/* Section 5: Penalties & Floor Prices */}
          {activeDoc.penaltiesOrCaps && (
            <section id="penalties" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
                Penalties, floor prices &amp; buyout caps
              </h4>
              <div style={{ padding: '12px 16px', background: 'var(--color-accent-100)', border: '1px solid var(--color-accent-300)', color: 'var(--color-accent-900)', fontSize: '13px', lineHeight: 1.5 }}>
                {activeDoc.penaltiesOrCaps}
              </div>
            </section>
          )}

          {/* Section 6: Interconnected Markets */}
          {activeDoc.crossReferences && activeDoc.crossReferences.length > 0 && (
            <section id="interconnected" style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '19px', margin: '0 0 8px', fontWeight: 800 }} className="font-heading">
                Interconnected markets &amp; cross references
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                {activeDoc.crossReferences.map((ref, i) => (
                  <span key={i} className="chip">{ref}</span>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ─── Right: Table of Contents Rail ─── */}
      <div style={{ padding: '16px', background: 'var(--color-surface)', overflowY: 'auto' }}>
        <div className="eyebrow" style={{ marginBottom: '12px' }}>On this page</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
          {[
            { id: 'summary', label: '1 · Executive Overview & Scope' },
            { id: 'trading-rule', label: '2 · Golden Trading Desk Rule' },
            { id: 'statutory-framework', label: '3 · Statutory Framework' },
            { id: 'compliance-gates', label: '4 · Compliance Gates & Audit Scope' },
            { id: 'penalties', label: '5 · Penalties & Buyout Caps' },
            { id: 'interconnected', label: '6 · Interconnected Markets' },
          ].map(sec => (
            <button
              key={sec.id}
              type="button"
              onClick={() => scrollToSection(sec.id)}
              className="text-left cursor-pointer hover:text-text transition-colors select-none"
              style={{
                background: 'transparent',
                border: 'none',
                padding: '2px 0',
                fontWeight: activeSection === sec.id ? 600 : 400,
                color: activeSection === sec.id ? 'var(--color-text)' : 'color-mix(in srgb, var(--color-text) 70%, transparent)',
              }}
            >
              {sec.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
