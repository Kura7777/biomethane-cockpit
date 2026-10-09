import React from 'react';
import { UserCheck, X, Trash2 } from 'lucide-react';
import { TraderDeskOverride } from '../../../domain/plants/types';
import { PlantDrawerTheme } from './plantDrawerTheme';

interface PlantOverrideEditorProps {
  deskOverride: TraderDeskOverride | null;
  overrideSignatory: string;
  setOverrideSignatory: (val: string) => void;
  overrideTrader: string;
  setOverrideTrader: (val: string) => void;
  overrideEmail: string;
  setOverrideEmail: (val: string) => void;
  overridePhone: string;
  setOverridePhone: (val: string) => void;
  overrideNotes: string;
  setOverrideNotes: (val: string) => void;
  isDark: boolean;
  t: PlantDrawerTheme;
  handleSaveOverride: (e: React.FormEvent) => void;
  handleDeleteOverride: () => void;
  setIsEditingOverride: (editing: boolean) => void;
}

export function PlantOverrideEditor({
  deskOverride,
  overrideSignatory,
  setOverrideSignatory,
  overrideTrader,
  setOverrideTrader,
  overrideEmail,
  setOverrideEmail,
  overridePhone,
  setOverridePhone,
  overrideNotes,
  setOverrideNotes,
  isDark,
  t,
  handleSaveOverride,
  handleDeleteOverride,
  setIsEditingOverride,
}: PlantOverrideEditorProps) {
  return (
    <div style={{ backgroundColor: t.bgHeader, border: `1px solid ${isDark ? '#10b981' : '#059669'}`, borderRadius: '10px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '12px', fontWeight: 800, color: isDark ? '#34d399' : '#059669', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserCheck size={14} /> Log Confirmed Counterparty Signatory
        </h4>
        <button
          type="button"
          onClick={() => setIsEditingOverride(false)}
          style={{ background: 'none', border: 'none', color: t.textMuted, cursor: 'pointer' }}
        >
          <X size={14} />
        </button>
      </div>

      <form onSubmit={handleSaveOverride} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div className="psd-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
              Signatory / Contact Name *
            </label>
            <input
              type="text"
              value={overrideSignatory}
              onChange={e => setOverrideSignatory(e.target.value)}
              placeholder="e.g. Dr. H. Schmidt / Managing Director"
              style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
              required
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
              Verified By (Trader)
            </label>
            <input
              type="text"
              value={overrideTrader}
              onChange={e => setOverrideTrader(e.target.value)}
              placeholder="Your name or desk"
              style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div className="psd-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
              Direct Email
            </label>
            <input
              type="email"
              value={overrideEmail}
              onChange={e => setOverrideEmail(e.target.value)}
              placeholder="e.g. h.schmidt@operator.com"
              style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
              Direct Phone
            </label>
            <input
              type="text"
              value={overridePhone}
              onChange={e => setOverridePhone(e.target.value)}
              placeholder="e.g. +49 171 1234567"
              style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '11px', color: t.textMuted, marginBottom: '4px' }}>
            Origination Notes & Offtake Status
          </label>
          <textarea
            value={overrideNotes}
            onChange={e => setOverrideNotes(e.target.value)}
            placeholder="e.g. Spoke to commercial director. Open to 3-year fixed PPA from Q1 2027."
            rows={2}
            style={{ width: '100%', backgroundColor: t.bg, border: `1px solid ${t.border}`, borderRadius: '6px', padding: '6px 10px', color: t.textMain, fontSize: '12px', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          {deskOverride && (
            <button
              type="button"
              onClick={handleDeleteOverride}
              style={{
                padding: '6px 12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                border: '1px solid #ef4444',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Trash2 size={13} /> Clear Override
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsEditingOverride(false)}
            style={{ padding: '6px 12px', backgroundColor: t.btnBg, color: t.textSecondary, border: `1px solid ${t.btnBorder}`, borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{ padding: '6px 14px', backgroundColor: '#059669', color: '#ffffff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
          >
            Save to Desk Record
          </button>
        </div>
      </form>
    </div>
  );
}
