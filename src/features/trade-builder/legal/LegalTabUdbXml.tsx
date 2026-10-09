import React, { useState } from 'react';
import { TradeAssessment } from '../../../domain/trade/types';
import { LegalAnnexOptions, annexClassificationLabel, TBA } from '../../../domain/trade/legalPackage';

interface LegalTabUdbXmlProps {
  assessment: TradeAssessment;
  legalOptions: LegalAnnexOptions;
  seal: string;
  udbXml: string;
  copiedType: string | null;
  onCopy: (text: string, type: string) => void;
  onDownloadUdbXml: () => void;
}

export function LegalTabUdbXml({
  assessment,
  legalOptions,
  seal,
  udbXml,
  copiedType,
  onCopy,
  onDownloadUdbXml,
}: LegalTabUdbXmlProps) {
  const [subView, setSubView] = useState<'SUMMARY' | 'RAW_XML'>('SUMMARY');

  const c = assessment.consignment;
  const volumeLabel = c.volumeMWh != null ? `${c.volumeMWh.toLocaleString()} MWh` : TBA;
  const dp = c.deliveryPeriod;
  const deliveryPeriodLabel = dp?.startDate && dp?.endDate ? `${dp.startDate} to ${dp.endDate}` : TBA;
  const originLabel = c.originPlantName || c.name || TBA;

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
          <span style={{ fontSize: '12px', fontWeight: 800 }}>Document 4 Review:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className={`btn ${subView === 'SUMMARY' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('SUMMARY')}
            >
              📑 Worksheet Summary
            </button>
            <button
              type="button"
              className={`btn ${subView === 'RAW_XML' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setSubView('RAW_XML')}
            >
              💻 Raw XML
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => onCopy(udbXml, 'UDB XML')}
          >
            {copiedType === 'UDB XML' ? '✓ Copied' : 'Copy XML'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '6px 14px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={onDownloadUdbXml}
          >
            <span>⬇️</span>
            <span>Download Worksheet XML</span>
          </button>
        </div>
      </div>

      {/* Sub-view A: UDB Nomination Summary Cards */}
      {subView === 'SUMMARY' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div style={{ borderBottom: '1px solid var(--color-divider)', paddingBottom: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 800 }}>
              Internal UDB Transfer Worksheet
            </h4>
            <div style={{ fontSize: '12px', color: 'var(--color-muted)', marginTop: '2px' }}>
              Checklist of what the UDB transfer will need. Not a UDB message format — the transfer itself is made in the Union Database by the account holders.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {/* Header & Operators Card */}
            <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Transaction Header</div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Deal ref: <strong>{assessment.id}</strong></div>
                <div>Transferor UDB account: <strong>{legalOptions.sellerName} — [UDB ACCOUNT ID]</strong></div>
                <div>Transferee UDB account: <strong>{legalOptions.buyerName} — [UDB ACCOUNT ID]</strong></div>
                <div>Basis: <strong>Directive (EU) 2018/2001 as amended by 2023/2413</strong></div>
              </div>
            </div>

            {/* Facility & Injection Card */}
            <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Origin Facility &amp; Grid Point</div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Facility: <strong>{originLabel}</strong></div>
                <div>Origin Country: <strong>{c.originCountry}</strong></div>
                <div>Injection country: <strong>{c.injectionCountry}</strong></div>
                <div>Injection point EIC: <strong>[FROM GRID OPERATOR]</strong></div>
              </div>
            </div>

            {/* Proof of Sustainability Card */}
            <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Proof of Sustainability (PoS)</div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>PoS number: <strong>{c.posStatus === 'ISSUED' ? '[ISSUED BY CERTIFICATION SCHEME]' : c.posStatus === 'PENDING' ? '[TO BE CONFIRMED BY SELLER]' : '[NOT AVAILABLE]'}</strong> ({c.posStatus === 'PENDING' ? 'PoS issuance: to be confirmed by Seller' : `status ${c.posStatus}`})</div>
                <div>Scheme: <strong>{c.certificationScheme}</strong></div>
                <div>Classification: <strong>{annexClassificationLabel(c.annexClassification)}</strong></div>
                <div>Carbon Intensity: <strong style={{ color: 'var(--color-accent)' }}>{c.carbonIntensity} gCO₂e/MJ</strong></div>
              </div>
            </div>

            {/* Transfer Batch Card */}
            <div style={{ padding: '14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)' }}>
              <div className="eyebrow" style={{ marginBottom: '8px' }}>Mass Balance Transfer Batch</div>
              <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>Energy Quantity: <strong>{volumeLabel}</strong></div>
                <div>Destination: <strong>{assessment.targetMarketName}</strong></div>
                <div>Delivery period: <strong>{deliveryPeriodLabel}</strong></div>
                <div>UDB status: <strong>{c.udbStatus === 'PENDING' ? 'UDB recording: to be confirmed by Seller' : c.udbStatus}</strong></div>
              </div>
            </div>
          </div>

          <div style={{ padding: '10px 14px', backgroundColor: 'var(--color-subtier)', border: '1px solid var(--color-divider)', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
            Document fingerprint: {seal}
          </div>
        </div>
      )}

      {/* Sub-view B: Raw XML Code Block */}
      {subView === 'RAW_XML' && (
        <div
          style={{
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--color-divider)',
            padding: '16px',
          }}
        >
          <pre
            style={{
              margin: 0,
              padding: '14px',
              backgroundColor: 'var(--color-subtier)',
              border: '1px solid var(--color-divider)',
              fontSize: '12px',
              fontFamily: 'var(--font-mono)',
              lineHeight: 1.5,
              overflowX: 'auto',
              color: 'var(--color-text)',
            }}
          >
            {udbXml}
          </pre>
        </div>
      )}
    </div>
  );
}
