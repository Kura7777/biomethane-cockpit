import React from 'react';
import { CertificationScheme, ChainOfCustody, UDBStatus, PoSStatus } from '../../../domain/consignment/types';
import { DealParams } from '../../../domain/trade/dealParams';
import { BiomethanePlant } from '../../../domain/plants/types';
import { feedstockDefaultCi } from '../../../domain/assumptions/registry';
import { UDB_OPTIONS, POS_OPTIONS } from '../steps/TradeConsignmentStep';
import { ORIGINS, FEEDSTOCKS, SCHEMES, CUSTODIES } from '../options';
import { Market } from '../../../domain/markets/types';

interface TradeGridProductCardProps {
  origin: string;
  setOrigin: (origin: string) => void;
  currentOriginObj: typeof ORIGINS[0];
  feedstockKey: string;
  setFeedstockKey: (key: string) => void;
  currentFeedstockObj: typeof FEEDSTOCKS[0];
  scheme: CertificationScheme;
  setScheme: (scheme: CertificationScheme) => void;
  currentSchemeObj: typeof SCHEMES[0];
  chainOfCustody: ChainOfCustody;
  setChainOfCustody: (coc: ChainOfCustody) => void;
  currentCustodyObj: typeof CUSTODIES[0];
  udbStatus: UDBStatus;
  setUdbStatus: (status: UDBStatus) => void;
  isNonEuOrigin: boolean;
  posStatus: PoSStatus;
  setPosStatus: (status: PoSStatus) => void;
  ci: number;
  setCi: (ci: number) => void;
  ciSource: 'deal' | 'estimate' | 'pos' | 'manual';
  setCiSource: (source: 'deal' | 'estimate' | 'pos' | 'manual') => void;
  ghgSavingPct: number;
  volumeMwh: number;
  deal: Partial<DealParams>;
  linkedPlant: BiomethanePlant | null | undefined;
  setIsPoSUploaderOpen: (open: boolean) => void;
  selectedMarket: Market;
  marketId: string;
  molVal: number;
  certVal: number;
  netNetbackVal: number;
}

export const TradeGridProductCard: React.FC<TradeGridProductCardProps> = ({
  origin,
  setOrigin,
  currentOriginObj,
  feedstockKey,
  setFeedstockKey,
  currentFeedstockObj,
  scheme,
  setScheme,
  currentSchemeObj,
  chainOfCustody,
  setChainOfCustody,
  currentCustodyObj,
  udbStatus,
  setUdbStatus,
  isNonEuOrigin,
  posStatus,
  setPosStatus,
  ci,
  setCi,
  ciSource,
  setCiSource,
  ghgSavingPct,
  volumeMwh,
  deal,
  linkedPlant,
  setIsPoSUploaderOpen,
  selectedMarket,
  marketId,
  molVal,
  certVal,
  netNetbackVal,
}) => {
  return (
    <div className="card-flat" style={{ padding: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <h5 style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>Product Specification</h5>
        <button
          type="button"
          className="btn"
          style={{
            padding: '2px 8px',
            fontSize: '11px',
            borderColor: posStatus === 'ISSUED' ? 'var(--color-status-pass-border)' : 'var(--color-divider)',
            color: posStatus === 'ISSUED' ? 'var(--color-status-pass-ink)' : 'inherit',
          }}
          onClick={() => setIsPoSUploaderOpen(true)}
          title="Upload or paste an official Proof of Sustainability"
        >
          {posStatus === 'ISSUED' ? 'PoS Attached' : 'Attach PoS'}
        </button>
      </div>

      <div className="form-group" style={{ marginBottom: '10px' }}>
        <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
          Origin Jurisdiction
        </label>
        <select
          aria-label="Origin Jurisdiction"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
          className="field select"
          style={{ width: '100%' }}
        >
          {ORIGINS.map(o => (
            <option key={o.code} value={o.code}>
              {o.flag} {o.name} ({o.code})
            </option>
          ))}
        </select>
        <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
          {currentOriginObj.desc}
        </span>
      </div>

      <div className="form-group" style={{ marginBottom: '10px' }}>
        <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
          Feedstock Classification
        </label>
        <select
          aria-label="Feedstock Classification"
          value={feedstockKey}
          onChange={e => {
            const nextKey = e.target.value;
            setFeedstockKey(nextKey);
            if (ciSource !== 'manual') {
              setCi(feedstockDefaultCi(nextKey) ?? 0);
              setCiSource('estimate');
            }
          }}
          className="field select"
          style={{ width: '100%' }}
        >
          {FEEDSTOCKS.map(f => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
          {currentFeedstockObj.hint}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
        <div className="form-group">
          <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
            Scheme
          </label>
          <select
            aria-label="Scheme"
            value={scheme}
            onChange={e => setScheme(e.target.value as CertificationScheme)}
            className="field select"
            style={{ width: '100%' }}
          >
            {SCHEMES.map(s => (
              <option key={s.scheme} value={s.scheme}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
            {currentSchemeObj.hint}
          </span>
        </div>
        <div className="form-group">
          <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
            Chain of Custody
          </label>
          <select
            aria-label="Chain of Custody"
            value={chainOfCustody}
            onChange={e => setChainOfCustody(e.target.value as ChainOfCustody)}
            className="field select"
            style={{ width: '100%' }}
          >
            {CUSTODIES.map(c => (
              <option key={c.custody} value={c.custody}>
                {c.label}
              </option>
            ))}
          </select>
          <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
            {currentCustodyObj.hint}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div className="form-group">
          <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
            Union Database (UDB)
          </label>
          <select
            aria-label="Union Database (UDB)"
            value={udbStatus}
            onChange={e => setUdbStatus(e.target.value as UDBStatus)}
            className="field select"
            style={{ width: '100%' }}
          >
            {UDB_OPTIONS.map(opt => (
              <option key={opt.status} value={opt.status}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
            {isNonEuOrigin ? 'Non-EU origin locked' : 'EU UDB tracking'}
          </span>
        </div>
        <div className="form-group">
          <label className="lbl" style={{ display: 'block', marginBottom: '3px' }}>
            Proof of Sustainability (PoS)
          </label>
          <select
            aria-label="Proof of Sustainability (PoS)"
            value={posStatus}
            onChange={e => setPosStatus(e.target.value as PoSStatus)}
            className="field select"
            style={{ width: '100%' }}
          >
            {POS_OPTIONS.map(opt => (
              <option key={opt.status} value={opt.status}>
                {opt.label}
              </option>
            ))}
          </select>
          <span className="dim" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
            {posStatus === 'ISSUED' ? 'Audited PoS on file' : 'Pending documentation'}
          </span>
        </div>
      </div>

      {/* Carbon Intensity Slider */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <label className="lbl">Carbon Intensity (CI)</label>
        <span className="num" style={{ fontSize: '14px', fontWeight: 700 }}>
          {ci >= 0 ? `+${ci}` : ci} g CO₂e/MJ
        </span>
      </div>
      <div style={{ height: '3px', backgroundColor: 'var(--color-neutral-300)', margin: '12px 0 0', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            inset: '0 auto 0 0',
            width: `${Math.max(0, Math.min(100, ((ci + 150) / 200) * 100))}%`,
            backgroundColor: 'var(--color-text)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '-4px',
            left: `${Math.max(0, Math.min(100, ((ci + 150) / 200) * 100))}%`,
            width: '11px',
            height: '11px',
            backgroundColor: 'var(--color-accent)',
            marginLeft: '-5px',
          }}
        />
      </div>
      <input
        type="range"
        min="-150"
        max="50"
        step="1"
        value={ci}
        onChange={e => { setCi(Number(e.target.value)); setCiSource('manual'); }}
        style={{ width: '100%', opacity: 0, height: '16px', marginTop: '-14px', cursor: 'pointer' }}
        aria-label="Adjust carbon intensity"
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '6px' }} className="dim">
        <span>−150</span>
        <span>0</span>
        <span>+50</span>
      </div>
      <div className="kv" style={{ marginTop: '12px' }}>
        <span className="lbl">GHG saving vs 94.0 baseline</span>
        <span />
        <span className="num" style={{ fontSize: '15px', fontWeight: 800 }}>
          {ghgSavingPct}%
        </span>
      </div>

      {/* Step 1 Instant Compliance Audit Button */}
      <button
        type="button"
        className="btn"
        style={{
          width: '100%',
          marginTop: '16px',
          padding: '9px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '7px',
          fontSize: '12px',
          fontWeight: 700,
          backgroundColor: 'var(--color-status-pass-bg)',
          borderColor: 'var(--color-status-pass-border)',
          color: 'var(--color-status-pass-ink)',
        }}
        onClick={() => {
          const tradeAuditPayload = {
            originCountry: origin,
            originPlantId: linkedPlant?.id || deal.plantId || `${origin}-CUSTOM`,
            plantName: linkedPlant?.name || deal.plantName || `${origin} Biomethane Production Asset`,
            annualVolumeMWh: volumeMwh,
            targetMarketId: marketId,
            targetMarketName: selectedMarket?.name || marketId,
            feedstockCategory: FEEDSTOCKS.find(f => f.key === feedstockKey)?.label || feedstockKey,
            carbonIntensity: ci,
            deliveredValueEurMwh: netNetbackVal ?? (molVal + certVal),
          };
          window.dispatchEvent(new CustomEvent('open-compliance-auditor', { detail: tradeAuditPayload }));
        }}
        title="Audit this active trade against the 11 statutory dossiers and RED III regulations"
      >
        <span>⚖ Audit Active Deal with Statutory Vault</span>
      </button>
    </div>
  );
};
