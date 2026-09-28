import React, { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { FUELEU_VLSFO_WTW, FUELEU_LFO_WTW } from '../../domain/fueleu/calculator';
import { latestTradeVwap, latestOfferIndex } from '../../domain/markets/fueleuPoolIndexHistory';

/**
 * The ⓘ "Sources and assumptions" popover. Holds everything the previous header/page layout
 * scattered as always-visible badges/links: the regulation & EU MRV provenance badges, the
 * citations/data-sources shortcuts, and the VLSFO-as-Annex-II-HFO assumption note. Content is
 * unchanged from the old inline copy — only its placement moved, per the approved redesign.
 */
export function FuelEuInfoPopover() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node) && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const vlsfoLfoDeltaGCo2eMj = (FUELEU_VLSFO_WTW - FUELEU_LFO_WTW).toFixed(2);
  const betterSea = latestTradeVwap();
  const oceanScore = latestOfferIndex();

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Sources and assumptions"
        aria-haspopup="dialog"
        aria-expanded={open}
        className="fe-icon-btn"
        onClick={() => setOpen(prev => !prev)}
      >
        <Info size={16} />
      </button>

      {open && (
        <div ref={ref} role="dialog" aria-label="Sources and assumptions" className="fe-popover">
          <section>
            <h4>Legal basis</h4>
            <div>Regulation (EU) 2023/1805 — FuelEU Maritime.</div>
          </section>
          <section>
            <h4>Data source</h4>
            <div>EU MRV 2024 activity (THETIS-MRV). Fuel split is estimated — see EU MRV provenance for the method.</div>
            <div style={{ marginTop: '6px', display: 'flex', gap: '10px' }}>
              <button type="button" className="fe-btn-secondary" style={{ flexGrow: 0, height: '28px', fontSize: '11.5px', padding: '0 10px' }} onClick={() => navigate('/citations')}>
                Citations &amp; legal basis
              </button>
              <button type="button" className="fe-btn-secondary" style={{ flexGrow: 0, height: '28px', fontSize: '11.5px', padding: '0 10px' }} onClick={() => navigate('/data-sources')}>
                EU MRV provenance
              </button>
            </div>
          </section>
          <section>
            <h4>Pool price cross-check</h4>
            <div>
              Desk offer is priced off OceanScore OPX (offer-side index of posted surplus offers){oceanScore ? `, €${oceanScore.offerIndex?.toFixed(2)} as of ${oceanScore.period}` : ''}. Cross-checked
              against the BetterSea FuelEU Surplus Index, built from executed trades{betterSea ? `: €${betterSea.vwap?.toFixed(2)} VWAP for ${betterSea.period}` : ''}. Two independent sources, shown separately — see the Pool matching tab for the full history.
            </div>
          </section>
          <section>
            <h4>Assumption</h4>
            <div>
              VLSFO treated as Annex II HFO class (ISO 8217 RME&ndash;RMK); if RMA&ndash;RMD (LFO class) the intensity is ~{vlsfoLfoDeltaGCo2eMj} g/MJ lower.
            </div>
          </section>
          <section>
            <h4>Deadlines</h4>
            <div>Pooling &amp; borrowing must be recorded in the FuelEU database by 30 Apr of the year after the reporting period (Art. 20(3) / Art. 21(8)). Any FuelEU penalty is due by 30 Jun (Art. 22(1)-(2) / Art. 23(2)).</div>
          </section>
        </div>
      )}
    </div>
  );
}
