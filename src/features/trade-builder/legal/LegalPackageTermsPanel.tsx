import { DeskRole, TBA } from '../../../domain/trade/legalPackage';

interface LegalPackageTermsPanelProps {
  deskRole: DeskRole;
  setDeskRole: (role: DeskRole) => void;
  deskEntity: string;
  setDeskEntity: (entity: string) => void;
  counterpartyName: string;
  setCounterpartyName: (name: string) => void;
  governingLaw: 'ENGLISH_LAW' | 'GERMAN_LAW';
  setGoverningLaw: (law: 'ENGLISH_LAW' | 'GERMAN_LAW') => void;
  masterAgreementDate: string;
  setMasterAgreementDate: (date: string) => void;
  sellerName: string;
  buyerName: string;
}

export function LegalPackageTermsPanel({
  deskRole,
  setDeskRole,
  deskEntity,
  setDeskEntity,
  counterpartyName,
  setCounterpartyName,
  governingLaw,
  setGoverningLaw,
  masterAgreementDate,
  setMasterAgreementDate,
  sellerName,
  buyerName,
}: LegalPackageTermsPanelProps) {
  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-divider)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        alignItems: 'end',
      }}
    >
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Desk side</label>
        <select
          className="input"
          value={deskRole}
          onChange={e => setDeskRole(e.target.value as DeskRole)}
          style={{ width: '100%', fontSize: '12px' }}
        >
          <option value="BUYER">Desk buys (offtake from producer)</option>
          <option value="SELLER">Desk sells (to offtaker)</option>
        </select>
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Desk legal entity</label>
        <input
          type="text"
          className="input"
          value={deskEntity}
          placeholder="[DESK LEGAL ENTITY]"
          onChange={e => setDeskEntity(e.target.value)}
          style={{ width: '100%', fontSize: '12px' }}
        />
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Counterparty legal entity</label>
        <input
          type="text"
          className="input"
          value={counterpartyName}
          placeholder="[COUNTERPARTY LEGAL ENTITY]"
          onChange={e => setCounterpartyName(e.target.value)}
          style={{ width: '100%', fontSize: '12px' }}
        />
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>Governing law</label>
        <select
          className="input"
          value={governingLaw}
          onChange={e => setGoverningLaw(e.target.value as 'ENGLISH_LAW' | 'GERMAN_LAW')}
          style={{ width: '100%', fontSize: '12px' }}
        >
          <option value="ENGLISH_LAW">English law</option>
          <option value="GERMAN_LAW">German law</option>
        </select>
      </div>
      <div>
        <label className="eyebrow" style={{ display: 'block', marginBottom: '3px' }}>EFET master agreement date</label>
        <input
          type="text"
          className="input"
          value={masterAgreementDate}
          placeholder={TBA}
          onChange={e => setMasterAgreementDate(e.target.value)}
          style={{ width: '100%', fontSize: '12px' }}
        />
      </div>
      <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: 'var(--color-muted)' }}>
        Seller: <strong style={{ color: 'var(--color-text)' }}>{sellerName}</strong> · Buyer: <strong style={{ color: 'var(--color-text)' }}>{buyerName}</strong>. Blank fields print as bracketed placeholders — nothing is filled in for you.
      </div>
    </div>
  );
}
