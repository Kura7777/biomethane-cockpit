import React from 'react';
import { X } from 'lucide-react';
import { CountryMeta } from '../mapConstants';

interface MapCountryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  originMeta: CountryMeta;
  selectedMeta: CountryMeta;
  children: React.ReactNode;
  buttons: React.ReactNode;
}

export function MapCountryDetailModal({
  isOpen,
  onClose,
  originMeta,
  selectedMeta,
  children,
  buttons,
}: MapCountryDetailModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="map-route-summary-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`${selectedMeta.name} full detail`}
      data-testid="map-detail-fullscreen"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="map-route-summary-modal"
        style={{ width: 'min(1180px, 96vw)', maxWidth: '96vw', height: '92vh', maxHeight: '92vh' }}
      >
        <div className="map-modal-header">
          <div className="map-modal-title-row">
            <h2 className="map-modal-title">
              {originMeta.iso} → {selectedMeta.iso}: {selectedMeta.name} detail
            </h2>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '32px', height: '32px', padding: 0 }}
              onClick={onClose}
              aria-label="Close full-screen detail"
            >
              <X style={{ width: '18px', height: '18px' }} />
            </button>
          </div>
        </div>
        <div className="map-detail-cols" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px' }}>
          {children}
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {buttons}
          </div>
        </div>
      </div>
    </div>
  );
}
