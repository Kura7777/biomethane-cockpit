import React, { useState } from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import {
  LegalAnnexOptions,
  annexClassificationLabel,
  environmentalAttributeLabel,
  describePricing,
  TBA
} from '../../../domain/trade/legalPackage';
import { MARKETS } from '../../../domain/markets/registry';
import { buildCustodyClauses } from '../../../domain/trade/custodyClauses';
import { CustodyClausesBlock } from './CustodyClausesBlock';

interface LegalTabEfetAnnexProps {
  assessment: TradeAssessment;
  legalOptions: LegalAnnexOptions;
  pdfBlobUrl: string;
  onDownloadPdf: () => void;
  termsPanel?: React.ReactNode;
  blockedBanner?: React.ReactNode;
}

export function LegalTabEfetAnnex({
  assessment,
  legalOptions,
  pdfBlobUrl,
  onDownloadPdf,
  termsPanel,
  blockedBanner,
}: LegalTabEfetAnnexProps) {
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
          <span style={{ fontSize: '12px', fontWeight: 800 }}>Document 2 Review:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn ${subView === 'STRUCTURED' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('STRUCTURED')}
            >
              📋 Structured Review
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
            <span>Download Draft Confirmation (PDF)</span>
          </button>
        </div>
      </div>

      {termsPanel}
      {blockedBanner}

      {/* Sub-view A: EFET Structured Clauses */}
      {subView === 'STRUCTURED' ? (
        <div
          className="lp-paper"
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '2px solid var(--color-divider)',
            padding: '32px 36px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ borderBottom: '3px solid var(--color-text)', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-accent)' }}>
              Draft — for negotiation
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: '20px', fontFamily: 'var(--font-heading)', fontWeight: 800 }}>
              Draft Individual Transaction Confirmation
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>
              To be read with the EFET General Agreement (Natural Gas) between the parties dated {legalOptions.masterAgreementDate?.trim() || TBA} · {legalOptions.governingLaw === 'ENGLISH_LAW' ? 'English law' : 'German law'}
            </div>
          </div>

          {/* Section 1: Contracting Parties */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              1. Contracting Parties &amp; Facility Attribution
            </h4>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '25%', fontWeight: 700 }}>Party A (Seller)</td>
                  <td style={{ width: '25%' }}>{legalOptions.sellerName}</td>
                  <td style={{ width: '25%', fontWeight: 700 }}>Origin Facility</td>
                  <td style={{ width: '25%' }}>{originLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Party B (Buyer)</td>
                  <td>{legalOptions.buyerName}</td>
                  <td style={{ fontWeight: 700 }}>Origin Country</td>
                  <td>{c.originCountryName} ({c.originCountry})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Interconnection Point</td>
                  <td>{deliveryPointLabel}</td>
                  <td style={{ fontWeight: 700 }}>Feedstock Category</td>
                  <td>{c.feedstockName} ({annexClassificationLabel(c.annexClassification)})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700 }}>Registry System</td>
                  <td>{targetMarket.registry || TBA}</td>
                  <td style={{ fontWeight: 700 }}>Sustainability Scheme</td>
                  <td>{c.certificationScheme.replace(/_/g, ' ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 2: Leg A - Physical Delivery */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              2. Leg A: Physical Gas Molecule Delivery Terms
            </h4>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Delivery Point (VTP)</td>
                  <td>{deliveryPointLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Energy Volume</td>
                  <td><strong>{volumeLabel}</strong> · delivery period {deliveryPeriodLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Contract Price</td>
                  <td>{pricingLines.join(' ')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 3: Leg B - Certificate Transfer */}
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 800 }}>
              3. Leg B: Environmental Attribute &amp; Certificate Delivery Terms
            </h4>
            <table className="table" style={{ width: '100%', fontSize: '12px' }}>
              <tbody>
                <tr>
                  <td style={{ width: '32%', fontWeight: 700, color: 'var(--color-muted)' }}>Target Compliance Destination</td>
                  <td><strong>{assessment.targetMarketName}</strong> ({targetMarket.unitLabel})</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Attribute Delivered</td>
                  <td>{attributeLabel}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Carbon Intensity</td>
                  <td><strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong> declared; to be evidenced by the Proof of Sustainability</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Section 4: chain-of-custody undertakings (GO + PoS, or PoS-only) */}
          {custodyClauses && <CustodyClausesBlock clauses={custodyClauses} detail="full" />}

          {/* Section 5: Execution */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginTop: '10px' }}>
            <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {legalOptions.sellerName}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Signature {TBA} — draft, not for execution</div>
            </div>
            <div style={{ borderTop: '2px solid var(--color-divider)', paddingTop: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700 }}>For: {legalOptions.buyerName}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-muted)' }}>Signature {TBA} — draft, not for execution</div>
            </div>
          </div>
        </div>
      ) : (
        /* Sub-view B: Live EFET PDF Iframe */
        <div style={{ width: '100%', height: '620px', border: '1px solid var(--color-divider)' }}>
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              title="EFET Biomethane Annex PDF Preview"
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
