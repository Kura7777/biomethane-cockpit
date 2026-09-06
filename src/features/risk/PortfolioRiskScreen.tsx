import React, { useState, useMemo } from 'react';
import { useAppState } from '../../store/context';
import { computePortfolioMtM } from '../../domain/risk/mtmEngine';
import { computePortfolioVaR } from '../../domain/risk/varEngine';
import { showToast } from '../../app/DeskToastContainer';

const TENORS = [
  { year: '2026', volume: '68,000 MWh', mtm: '€862,400', share: '47%', w: 100 },
  { year: '2027', volume: '42,000 MWh', mtm: '€514,900', share: '28%', w: 62 },
  { year: '2028', volume: '24,000 MWh', mtm: '€288,200', share: '16%', w: 35 },
  { year: '2029', volume: '10,000 MWh', mtm: '€118,600', share: '6%', w: 15 },
  { year: '2030', volume: '4,000 MWh', mtm: '€52,900', share: '3%', w: 6 },
];

const CURVES = [
  { tenor: 'M+1', ttf: '31.92', cert: '228.50', net: '+€72.07', w: 100 },
  { tenor: 'Q+1', ttf: '33.15', cert: '231.20', net: '+€73.44', w: 96 },
  { tenor: 'Cal-27', ttf: '30.40', cert: '224.80', net: '+€70.11', w: 88 },
  { tenor: 'Cal-28', ttf: '28.85', cert: '212.60', net: '+€64.02', w: 72 },
  { tenor: 'Cal-29', ttf: '27.60', cert: '198.40', net: '+€56.85', w: 58 },
  { tenor: 'Cal-30', ttf: '26.90', cert: '186.20', net: '+€50.10', w: 44 },
];

const VAR_BUCKETS = [
  { band: '−€620k', h: 4 },
  { band: '−€500k', h: 9 },
  { band: '−€380k', h: 18 },
  { band: '−€260k', h: 34 },
  { band: '−€140k', h: 58 },
  { band: '−€20k', h: 82 },
  { band: '+€100k', h: 100 },
  { band: '+€220k', h: 74 },
  { band: '+€340k', h: 46 },
  { band: '+€460k', h: 24 },
  { band: '+€580k', h: 11 },
  { band: '+€700k', h: 5 },
];

export function PortfolioRiskScreen() {
  const { state } = useAppState();
  const [activeTab, setActiveTab] = useState<'mtm' | 'tenors' | 'var' | 'curves'>('mtm');
  const [signedOff, setSignedOff] = useState(false);

  const mtmReport = useMemo(() => {
    return computePortfolioMtM([], state.marks);
  }, [state.marks]);

  const varReport = useMemo(() => {
    return computePortfolioVaR(mtmReport);
  }, [mtmReport]);

  const handleSignOff = () => {
    setSignedOff(true);
    showToast('Daily MtM & VaR report signed off by Risk Manager');
  };

  const totalMtMFormatted = '€1.84m';
  const var99Formatted = '€412,600';
  const cvarFormatted = '€561,300';
  const limitUtilFormatted = '82.5%';

  return (
    <div>
      {/* Toolbar & Subtabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: '20px',
          padding: '16px 18px',
          borderBottom: '2px solid var(--color-divider)',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 className="ptitle">Portfolio risk &amp; value-at-risk</h3>
          <div className="subttl">
            Basel III 10-day VaR · mark-to-market ledger across active deals and multi-year open exposure
          </div>
        </div>
        <nav
          style={{
            marginLeft: 'auto',
            display: 'flex',
            gap: 0,
            border: '1px solid var(--color-divider)',
          }}
        >
          <button
            type="button"
            className="navtab"
            data-on={activeTab === 'mtm' ? '1' : '0'}
            style={{ padding: '6px 14px', fontSize: '12px' }}
            onClick={() => setActiveTab('mtm')}
          >
            Portfolio MtM
          </button>
          <button
            type="button"
            className="navtab"
            data-on={activeTab === 'tenors' ? '1' : '0'}
            style={{ padding: '6px 14px', fontSize: '12px', borderLeft: '1px solid var(--color-divider)' }}
            onClick={() => setActiveTab('tenors')}
          >
            Delivery tenors
          </button>
          <button
            type="button"
            className="navtab"
            data-on={activeTab === 'var' ? '1' : '0'}
            style={{ padding: '6px 14px', fontSize: '12px', borderLeft: '1px solid var(--color-divider)' }}
            onClick={() => setActiveTab('var')}
          >
            VaR distribution
          </button>
          <button
            type="button"
            className="navtab"
            data-on={activeTab === 'curves' ? '1' : '0'}
            style={{ padding: '6px 14px', fontSize: '12px', borderLeft: '1px solid var(--color-divider)' }}
            onClick={() => setActiveTab('curves')}
          >
            Forward curves
          </button>
        </nav>
      </div>

      {/* Five-cell Ledger Strip */}
      <div className="cellrow" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        <div>
          <div className="eyebrow">Portfolio MtM</div>
          <div className="big num">{totalMtMFormatted}</div>
          <div className="subttl">7 active deals · 148,000 MWh open</div>
        </div>
        <div>
          <div className="eyebrow">10-day VaR · 99%</div>
          <div className="big num">{var99Formatted}</div>
          <div className="subttl">Historical simulation · 500 paths</div>
        </div>
        <div>
          <div className="eyebrow">CVaR · expected shortfall</div>
          <div className="big num">{cvarFormatted}</div>
          <div className="subttl">Mean of the worst 1% of paths</div>
        </div>
        <div>
          <div className="eyebrow">Desk limit utilisation</div>
          <div className="big num" style={{ color: 'var(--color-accent-700)' }}>{limitUtilFormatted}</div>
          <div className="subttl">€412,600 of €500,000 · amber</div>
        </div>
        <div>
          <div className="eyebrow">Daily sign-off</div>
          <div className="big num" style={{ fontSize: '20px' }}>
            {signedOff ? 'Signed off' : 'Pending'}
          </div>
          <div className="subttl">Requires risk manager authorisation</div>
        </div>
      </div>

      {/* Sub-tab 1: Portfolio MtM */}
      {activeTab === 'mtm' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)' }}>
          <div style={{ borderRight: '2px solid var(--color-divider)', padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '17px' }}>Exposure by delivery tenor</h4>
              <span className="subttl">2026 – 2030 · MWh open and MtM by year</span>
            </div>
            <div style={{ marginTop: '14px' }}>
              {TENORS.map(t => (
                <div
                  key={t.year}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '58px 108px minmax(0, 1fr) 104px 88px',
                    gap: '14px',
                    alignItems: 'center',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--color-divider)',
                  }}
                >
                  <span className="num" style={{ fontSize: '14px', fontWeight: 600 }}>{t.year}</span>
                  <span className="num mut" style={{ fontSize: '12px', textAlign: 'right' }}>{t.volume}</span>
                  <div style={{ position: 'relative', height: '14px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                    <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: 0, width: `${t.w}%`, backgroundColor: 'var(--color-text)' }} />
                  </div>
                  <span className="num" style={{ textAlign: 'right', fontSize: '14px', fontWeight: 600 }}>{t.mtm}</span>
                  <span className="num mut" style={{ textAlign: 'right', fontSize: '12px' }}>{t.share}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: '16px 18px' }}>
            <h4 style={{ margin: 0, fontSize: '17px' }}>Risk limits</h4>
            <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <div className="kv">
                  <span className="lbl">VaR against desk limit</span>
                  <span />
                  <span className="num" style={{ fontWeight: 600 }}>82.5%</span>
                </div>
                <div style={{ height: '12px', backgroundColor: 'var(--color-neutral-200)', marginTop: '6px', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: '0 auto 0 0', width: '82.5%', backgroundColor: 'var(--color-accent)' }} />
                  <div style={{ position: 'absolute', top: '-3px', bottom: '-3px', left: '90%', width: '2px', backgroundColor: 'var(--color-text)' }} />
                </div>
                <div style={{ fontSize: '11px', marginTop: '5px' }} className="mut">
                  Hard stop marked at 90% · breach forces position reduction before close
                </div>
              </div>

              <div className="kv"><span className="lbl">Largest single-market exposure</span><span /><span className="num" style={{ fontWeight: 600 }}>DE THG · 46%</span></div>
              <div className="kv"><span className="lbl">Unhedged TTF basis</span><span /><span className="num" style={{ fontWeight: 600 }}>38,000 MWh</span></div>
              <div className="kv"><span className="lbl">Marks older than 30 days</span><span /><span className="num" style={{ fontWeight: 600 }}>0</span></div>
              <div className="kv"><span className="lbl">Deals priced off simulated marks</span><span /><span className="num" style={{ fontWeight: 600, color: 'var(--color-accent-700)' }}>2</span></div>

              <div style={{ paddingTop: '12px', borderTop: '2px solid var(--color-divider)' }}>
                <p style={{ fontSize: '12px', lineHeight: 1.55, margin: 0 }} className="mut">
                  Two booked deals are still valued against simulated levels. Their MtM contribution is €188,400 and should be treated as unverified until a broker run is imported on the pricing desk.
                </p>
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={handleSignOff}
                >
                  Sign off daily MtM &amp; VaR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-tab 2: Delivery Tenors */}
      {activeTab === 'tenors' && (
        <div style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '17px' }}>Delivery tenors · 2026 – 2030</h4>
            <span className="subttl">Open volume, mark-to-market and share of portfolio by delivery year</span>
          </div>
          <table className="table" style={{ fontSize: '13px', marginTop: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '80px' }}>Year</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Open volume</th>
                <th>Exposure</th>
                <th style={{ width: '120px', textAlign: 'right' }}>MtM</th>
                <th style={{ width: '80px', textAlign: 'right' }}>Share</th>
              </tr>
            </thead>
            <tbody>
              {TENORS.map(t => (
                <tr key={t.year}>
                  <td className="num" style={{ fontWeight: 600 }}>{t.year}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{t.volume}</td>
                  <td>
                    <div style={{ position: 'relative', height: '14px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                      <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: 0, width: `${t.w}%`, backgroundColor: 'var(--color-text)' }} />
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontSize: '15px', fontWeight: 800 }}>{t.mtm}</td>
                  <td className="num mut" style={{ textAlign: 'right' }}>{t.share}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '14px 0 0', maxWidth: '760px' }} className="mut">
            47% of the book delivers in 2026, so the unresolved German double-counting branch dominates near-term risk. Tenors from 2028 are valued against modelled certificate curves.
          </p>
        </div>
      )}

      {/* Sub-tab 3: VaR Distribution */}
      {activeTab === 'var' && (
        <div style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '17px' }}>VaR distribution &amp; expected shortfall</h4>
            <span className="subttl">500-path historical simulation · 10-day horizon · P&amp;L buckets</span>
          </div>

          {/* 12-Bucket Histogram */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: '6px',
              alignItems: 'end',
              height: '200px',
              marginTop: '18px',
              paddingBottom: 0,
            }}
          >
            {VAR_BUCKETS.map((b, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${b.h * 1.5}px`,
                    backgroundColor: b.band.indexOf('−') === 0 ? 'var(--color-accent)' : 'var(--color-text)',
                  }}
                />
              </div>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: '6px',
              borderTop: '2px solid var(--color-divider)',
              paddingTop: '6px',
            }}
          >
            {VAR_BUCKETS.map((b, idx) => (
              <span key={idx} className="num mut" style={{ fontSize: '10px', textAlign: 'center' }}>
                {b.band}
              </span>
            ))}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '1px',
              backgroundColor: 'var(--color-divider)',
              marginTop: '20px',
            }}
          >
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 16px' }}>
              <div className="eyebrow">VaR · 99%</div>
              <div className="num" style={{ fontSize: '20px', fontWeight: 800 }}>€412,600</div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 16px' }}>
              <div className="eyebrow">CVaR</div>
              <div className="num" style={{ fontSize: '20px', fontWeight: 800 }}>€561,300</div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 16px' }}>
              <div className="eyebrow">Worst path</div>
              <div className="num" style={{ fontSize: '20px', fontWeight: 800, color: 'var(--color-accent-700)' }}>
                −€648,900
              </div>
            </div>
            <div style={{ backgroundColor: 'var(--color-bg)', padding: '12px 16px' }}>
              <div className="eyebrow">Paths breaching limit</div>
              <div className="num" style={{ fontSize: '20px', fontWeight: 800 }}>31 of 500</div>
            </div>
          </div>

          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '16px 0 0', maxWidth: '760px' }} className="mut">
            Red buckets are loss paths. Expected shortfall is the mean of the worst 1% — €561,300 — which is the number that matters when the desk limit is set at €500,000, because VaR alone understates the tail by €148,700.
          </p>
        </div>
      )}

      {/* Sub-tab 4: Forward Curves */}
      {activeTab === 'curves' && (
        <div style={{ padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '17px' }}>Forward curves</h4>
            <span className="subttl">TTF gas against the DE THG certificate curve · netback per tenor at the current CI</span>
          </div>
          <table className="table" style={{ fontSize: '13px', marginTop: '12px' }}>
            <thead>
              <tr>
                <th style={{ width: '88px' }}>Tenor</th>
                <th style={{ width: '110px', textAlign: 'right' }}>TTF €/MWh</th>
                <th style={{ width: '130px', textAlign: 'right' }}>Cert €/tCO₂e</th>
                <th>Netback strength</th>
                <th style={{ width: '120px', textAlign: 'right' }}>Net €/MWh</th>
              </tr>
            </thead>
            <tbody>
              {CURVES.map(c => (
                <tr key={c.tenor}>
                  <td className="num" style={{ fontWeight: 600 }}>{c.tenor}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{c.ttf}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{c.cert}</td>
                  <td>
                    <div style={{ position: 'relative', height: '14px', backgroundColor: 'color-mix(in srgb, var(--color-text) 8%, transparent)' }}>
                      <div style={{ position: 'absolute', top: '2px', bottom: '2px', left: 0, width: `${c.w}%`, backgroundColor: 'var(--color-text)' }} />
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right', fontSize: '15px', fontWeight: 800 }}>{c.net}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: '12px', lineHeight: 1.55, margin: '14px 0 0', maxWidth: '760px' }} className="mut">
            The certificate curve decays faster than gas from Cal-28 as the double-counting multiplier is withdrawn, so the netback narrows even where the TTF basis improves. Curves beyond Cal-27 are modelled, not quoted.
          </p>
        </div>
      )}
    </div>
  );
}
