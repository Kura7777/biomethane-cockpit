import React, { useState } from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import {
  LegalAnnexOptions,
  annexClassificationLabel,
  chainOfCustodyLabel,
  environmentalAttributeLabel,
  describePricing,
  TBA
} from '../../../domain/trade/legalPackage';
import { MARKETS } from '../../../domain/markets/registry';
import { buildCustodyClauses } from '../../../domain/trade/custodyClauses';
import { CustodyClausesBlock } from './CustodyClausesBlock';

interface LegalTabTermSheetProps {
  assessment: TradeAssessment;
  legalOptions: LegalAnnexOptions;
  seal: string;
  pdfBlobUrl: string;
  onDownloadPdf: () => void;
  termsPanel?: React.ReactNode;
  blockedBanner?: React.ReactNode;
}

export function LegalTabTermSheet({
  assessment,
  legalOptions,
  seal,
  pdfBlobUrl,
  onDownloadPdf,
  termsPanel,
  blockedBanner,
}: LegalTabTermSheetProps) {
  const [subView, setSubView] = useState<'STRUCTURED' | 'PDF'>('STRUCTURED');

  const c = assessment.consignment;
  const targetMarket = MARKETS.find(m => m.id === assessment.targetMarketId) || {
    name: assessment.targetMarketName,
    registry: 'Union Database (UDB)',
    country: assessment.targetMarketId.slice(0, 2),
    unitLabel: '€/tCO₂e',
  };

  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString()} MWh` : TBA;
  const pricingLines = describePricing(assessment, legalOptions.deskRole || 'SELLER');
  const attributeLabel = environmentalAttributeLabel(
    MARKETS.find(m => m.id === assessment.targetMarketId),
    assessment.targetMarketId,
    c.udbStatus
  );
  const dp = c.deliveryPeriod;
  const deliveryPeriodLabel = dp?.startDate && dp?.endDate ? `${dp.startDate} to ${dp.endDate}` : TBA;
  const deliveryPointLabel = dp?.deliveryPointVtp || `${c.injectionCountry} virtual trading point ${TBA}`;
  const originLabel = c.originPlantName || c.name || TBA;
  const custodyClauses = buildCustodyClauses(assessment);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Document Review Sub-Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-divider)',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 800 }}>Document 1 Review:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn ${subView === 'STRUCTURED' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('STRUCTURED')}
            >
              📋 Interactive Document Review
            </button>
            <button
              type="button"
              className={`btn ${subView === 'PDF' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('PDF')}
            >
              👁️ Live A4 PDF View
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={onDownloadPdf}
          >
            <span>⬇️</span>
            <span>Download Term Sheet (PDF)</span>
          </button>
        </div>
      </div>

      {termsPanel}
      {blockedBanner}

      {/* Sub-view A: Interactive Document Review */}
      {subView === 'STRUCTURED' ? (
        <div
          className="lp-paper"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-divider)',
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          {/* Header Banner */}
          <div style={{ borderBottom: '3px solid var(--color-text)', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
              Indicative Term Sheet
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              Biomethane &amp; Environmental Attribute Supply
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              Non-binding · Subject to contract · Delivery period: {deliveryPeriodLabel}
            </div>
          </div>

          {/* Identification Overview */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px',
              padding: '12px 16px',
              backgroundColor: 'var(--color-subtier)',
              border: '1px solid var(--color-divider)',
              fontSize: '12px',
            }}
          >
            <div>
              <span className="eyebrow">Deal Reference</span>
              <div style={{ fontWeight: 800, marginTop: '2px' }}>{assessment.id}</div>
            </div>
            <div>
              <span className="eyebrow">Date</span>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{assessment.createdAt.slice(0, 10)}</div>
            </div>
            <div>
              <span className="eyebrow">Buyer</span>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{legalOptions.buyerName}</div>
            </div>
            <div>
              <span className="eyebrow">Seller</span>
              <div style={{ fontWeight: 700, marginTop: '2px' }}>{legalOptions.sellerName}</div>
            </div>
          </div>

          {/* Section 1: Commodity Specifications */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              1. Commodity &amp; Volume Specifications
            </h4>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Commodity Standard</td>
                  <td>Biomethane injected to the gas grid; quality per the grid entry specification (EN 16723-1 reference)</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Volume</td>
                  <td><strong>{volumeLabel}</strong> · profile: {dp?.deliveryProfile ? dp.deliveryProfile.replace(/_/g, ' ').toLowerCase() : TBA}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Origin Facility</td>
                  <td>{originLabel} ({c.originCountryName} - {c.originCountry})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Delivery Point (VTP)</td>
                  <td>{deliveryPointLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Feedstock Substrate</td>
                  <td>{c.feedstockName} · {annexClassificationLabel(c.annexClassification)}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon Intensity</td>
                  <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> declared; to be evidenced by the Proof of Sustainability</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Chain of Custody</td>
                  <td>{chainOfCustodyLabel(c.chainOfCustody)} under {c.certificationScheme.replace(/_/g, ' ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Commercial Pricing Formula */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              2. Price
            </h4>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                {pricingLines.map((line, i) => (
                  <tr key={i}>
                    <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>{i === 0 ? 'Price basis' : ''}</td>
                    <td>{line}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Environmental Attribute</td>
                  <td>{attributeLabel} · destination {assessment.targetMarketName}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon-Intensity Adjustment</td>
                  <td>{TBA}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Volume Tolerance / Shortfall</td>
                  <td>{TBA}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Registry Transfer Undertaking */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              3. Sustainability Evidence (points to agree)
            </h4>
            <div
              style={{
                padding: '12px 16px',
                backgroundColor: 'var(--color-subtier)',
                border: '1px solid var(--color-divider)',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              Transfer of {attributeLabel} via {targetMarket.registry || TBA}; transfer deadline {TBA}. Seller to warrant that the attributes have not been claimed elsewhere, including under national support schemes, and to disclose any support received. Remedies for late or invalid evidence {TBA}.
            </div>
            {custodyClauses && (
              <div style={{ marginTop: '8px' }}>
                <CustodyClausesBlock clauses={custodyClauses} detail="summary" />
              </div>
            )}
          </div>

          {/* Status */}
          <div style={{ fontSize: '12px', color: 'var(--color-muted)', lineHeight: 1.6 }}>
            Indicative only. Not an offer capable of acceptance; no binding obligation arises until a definitive agreement is executed by both parties. Prices reflect desk marks on {assessment.createdAt.slice(0, 10)} and will move.
          </div>

          {/* Audit Seal Strip */}
          <div
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--color-subtier)',
              border: '1px solid var(--color-divider)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            Document fingerprint: {seal}
          </div>
        </div>
      ) : (
        /* Sub-view B: Live PDF Iframe */
        <div style={{ width: '100%', height: '620px', border: '1px solid var(--color-divider)' }}>
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              title="Commercial Term Sheet PDF Preview"
              style={{ width: '100%', height: '100%', border: 'none', backgroundColor: 'var(--color-neutral-700, #525659)' }}
            />
          ) : (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-muted)' }}>
              Rendering PDF Stream...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
