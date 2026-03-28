import React from 'react'
import { useNavigate } from 'react-router-dom'

const ACCOUNTS = [
  {
    name: 'Standard',
    tagline: 'Best for beginners',
    color: '#38bdf8',
    glowColor: 'rgba(56,189,248,0.12)',
    borderColor: 'rgba(56,189,248,0.2)',
    popular: false,
    minDeposit: '$200',
    spread: 'From 1.0 pip',
    commission: '$0',
    commissionNote: 'Commission-free',
    execution: 'Market Execution',
    platforms: ['WebTrader', 'TradePilot'],
    maxLeverage: '500:1',
    marginCall: '100%',
    stopOut: '50%',
    instruments: '1,800+',
    swapFree: true,
    features: [
      'No commission on all trades',
      'Spreads from 1.0 pip on majors',
      'Negative balance protection',
      'Free demo account',
      'Segregated client funds',
      'FCA & CySEC regulated',
    ],
    cta: 'Open Standard Account',
    ctaStyle: { background: 'rgba(56,189,248,0.12)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' },
  },
  {
    name: 'Raw Spread',
    tagline: 'Best for active traders',
    color: '#00c878',
    glowColor: 'rgba(0,200,120,0.12)',
    borderColor: 'rgba(0,200,120,0.25)',
    popular: true,
    minDeposit: '$200',
    spread: 'From 0.0 pips',
    commission: '$3.50 / lot',
    commissionNote: '$7.00 round turn',
    execution: 'Market Execution',
    platforms: ['WebTrader', 'TradePilot'],
    maxLeverage: '500:1',
    marginCall: '100%',
    stopOut: '50%',
    instruments: '1,800+',
    swapFree: true,
    features: [
      'Raw interbank spreads from 0.0 pips',
      'Ultra-low commission: $3.50/lot/side',
      'Deep liquidity from 25+ providers',
      'Negative balance protection',
      'Segregated client funds',
      'FCA & CySEC regulated',
    ],
    cta: 'Open Raw Spread Account',
    ctaStyle: { background: 'rgba(0,200,120,0.15)', color: '#00c878', border: '1px solid rgba(0,200,120,0.35)' },
  },
  {
    name: 'cTrader Raw',
    tagline: 'Best for algo & scalpers',
    color: '#8b5cf6',
    glowColor: 'rgba(139,92,246,0.12)',
    borderColor: 'rgba(139,92,246,0.2)',
    popular: false,
    minDeposit: '$200',
    spread: 'From 0.0 pips',
    commission: '$3.00 / lot',
    commissionNote: '$6.00 round turn',
    execution: 'Market Execution',
    platforms: ['cTrader', 'WebTrader', 'TradePilot'],
    maxLeverage: '500:1',
    marginCall: '100%',
    stopOut: '50%',
    instruments: '1,800+',
    swapFree: true,
    features: [
      'Lowest commission: $3.00/lot/side',
      'cTrader native integration',
      'SMART Trader Tools included',
      'Automated strategy support',
      'Negative balance protection',
      'FCA & CySEC regulated',
    ],
    cta: 'Open cTrader Account',
    ctaStyle: { background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.3)' },
  },
]

const COMPARISON = [
  { label: 'Minimum Deposit',  std: '$200',               raw: '$200',             ctrader: '$200' },
  { label: 'Spread (EUR/USD)', std: 'From 1.0 pip',       raw: 'From 0.0 pips',    ctrader: 'From 0.0 pips' },
  { label: 'Commission',       std: '$0',                  raw: '$3.50 / lot side', ctrader: '$3.00 / lot side' },
  { label: 'Round Turn',       std: '$0',                  raw: '$7.00',            ctrader: '$6.00' },
  { label: 'Max Leverage',     std: '500:1',               raw: '500:1',            ctrader: '500:1' },
  { label: 'Instruments',      std: '1,800+',              raw: '1,800+',           ctrader: '1,800+' },
  { label: 'Execution',        std: 'Market',             raw: 'Market',           ctrader: 'Market' },
  { label: 'Swap-Free Option', std: '✓',                  raw: '✓',               ctrader: '✓' },
  { label: 'Neg. Balance Prot.',std: '✓',                 raw: '✓',               ctrader: '✓' },
  { label: 'Seg. Client Funds',std: '✓',                  raw: '✓',               ctrader: '✓' },
]

export default function AccountTypesPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#06090f', minHeight: '100vh', color: '#c8d6e5', fontFamily: "-apple-system,BlinkMacSystemFont,'Inter','Segoe UI',sans-serif" }}>

      {/* ── Navbar ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(6,9,15,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: '#fff' }}>TradeX<span style={{ color: '#38bdf8' }}> Pro</span></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/" style={{ color: '#6b8099', fontSize: 13, textDecoration: 'none' }}>Home</a>
            <a href="/#features" style={{ color: '#6b8099', fontSize: 13, textDecoration: 'none' }}>Features</a>
            <button
              onClick={() => navigate('/login')}
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', border: 'none', borderRadius: 10, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Open Account
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <div style={{ background: 'linear-gradient(180deg,#0b1728 0%,#06090f 100%)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '72px 24px 56px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 99, background: 'rgba(14,165,233,0.1)', border: '1px solid rgba(14,165,233,0.22)', color: '#38bdf8', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 20 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
          FCA &amp; CySEC Regulated
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 800, color: '#fff', marginBottom: 14, letterSpacing: '-0.02em' }}>
          Choose Your Account Type
        </h1>
        <p style={{ color: '#6b8099', fontSize: 16, maxWidth: 560, margin: '0 auto 28px' }}>
          Three account types built for every trading style — from beginners to institutional-grade algo traders. All accounts include full market access, segregated funds, and negative balance protection.
        </p>
        {/* Reg badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
          {[
            { flag: '🇬🇧', code: 'FCA', reg: 'FRN 987654' },
            { flag: '🇨🇾', code: 'CySEC', reg: 'Licence 123/45' },
            { flag: '🇨🇼', code: 'Curaçao GCB', reg: '0005/GCB' },
          ].map(r => (
            <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 8 }}>
              <span style={{ fontSize: 15 }}>{r.flag}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#c8d6e5' }}>{r.code}</div>
                <div style={{ fontSize: 9.5, color: '#3a5060' }}>{r.reg}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Account Cards ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '64px 24px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 24 }}>
          {ACCOUNTS.map(acc => (
            <div key={acc.name} style={{ position: 'relative', borderRadius: 20, background: '#0a1422', border: `1px solid ${acc.borderColor}`, boxShadow: acc.popular ? `0 0 40px ${acc.glowColor}` : 'none', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {acc.popular && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${acc.color}, transparent)` }} />
              )}
              {acc.popular && (
                <div style={{ position: 'absolute', top: 16, right: 16, background: acc.color, color: '#000', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '3px 10px', borderRadius: 99, textTransform: 'uppercase' }}>
                  Most Popular
                </div>
              )}

              {/* Card header */}
              <div style={{ padding: '28px 28px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: acc.color, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>{acc.tagline}</div>
                <h2 style={{ fontSize: 26, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{acc.name}</h2>
                <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#3a5060', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Spread</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: acc.color, fontFamily: 'monospace' }}>{acc.spread}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#3a5060', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Commission</div>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'monospace' }}>{acc.commission}</div>
                    <div style={{ fontSize: 10, color: '#3a5060' }}>{acc.commissionNote}</div>
                  </div>
                </div>
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 28px' }} />

              {/* Key specs */}
              <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 0' }}>
                {[
                  { label: 'Min. Deposit', value: acc.minDeposit },
                  { label: 'Max Leverage', value: acc.maxLeverage },
                  { label: 'Instruments', value: acc.instruments },
                  { label: 'Execution', value: acc.execution },
                  { label: 'Margin Call', value: acc.marginCall },
                  { label: 'Stop Out', value: acc.stopOut },
                ].map(s => (
                  <div key={s.label}>
                    <div style={{ fontSize: 10, color: '#3a5060', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{s.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#c8d6e5' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', margin: '0 28px' }} />

              {/* Features */}
              <div style={{ padding: '20px 28px', flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#3a5060', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Includes</div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {acc.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#94a3b8', lineHeight: 1.5 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={acc.color} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div style={{ padding: '0 28px 28px' }}>
                <button
                  onClick={() => navigate('/login')}
                  style={{ width: '100%', padding: '13px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'opacity 0.2s', ...acc.ctaStyle }}>
                  {acc.cta}
                </button>
                <p style={{ textAlign: 'center', fontSize: 11, color: '#3a5060', marginTop: 10 }}>No minimum trading requirement · Instant approval</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Comparison Table ── */}
      <div style={{ maxWidth: 1100, margin: '64px auto 0', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Full Account Comparison</h2>
          <p style={{ color: '#6b8099', fontSize: 14 }}>Side-by-side breakdown of all three account types</p>
        </div>
        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#0c1928' }}>
                <th style={{ padding: '14px 24px', textAlign: 'left', color: '#3a5060', fontWeight: 700, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>Feature</th>
                {['Standard', 'Raw Spread', 'cTrader Raw'].map((h, i) => (
                  <th key={h} style={{ padding: '14px 24px', textAlign: 'center', color: [ACCOUNTS[0].color, ACCOUNTS[1].color, ACCOUNTS[2].color][i], fontWeight: 700, fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.07)', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row, idx) => (
                <tr key={row.label} style={{ background: idx % 2 === 0 ? '#080f1c' : '#06090f' }}>
                  <td style={{ padding: '12px 24px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{row.label}</td>
                  {[row.std, row.raw, row.ctrader].map((v, vi) => (
                    <td key={vi} style={{ padding: '12px 24px', textAlign: 'center', color: v === '✓' ? '#00c878' : '#c8d6e5', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>{v}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Risk Warning ── */}
      <div style={{ maxWidth: 1100, margin: '48px auto 0', padding: '0 24px' }}>
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 12, padding: '16px 22px', fontSize: 12, lineHeight: 1.7, color: '#92400e' }}>
          <strong style={{ color: '#d97706' }}>Risk Warning:</strong>{' '}
          CFDs are complex instruments and come with a high risk of losing money rapidly due to leverage.{' '}
          <strong style={{ color: '#fbbf24' }}>74% of retail investor accounts lose money when trading CFDs with TradeX Pro.</strong>{' '}
          You should consider whether you understand how CFDs work and whether you can afford to take the high risk of losing your money.
          TradeX Pro Limited is authorised and regulated by the FCA (FRN 987654), CySEC (Licence 123/45), and holds Curaçao GCB Licence 0005/GCB.
          Registered in England &amp; Wales No. 12345678. 22 Bishopsgate, London EC2N 4BQ.
        </div>
      </div>

      {/* ── CTA Strip ── */}
      <div style={{ maxWidth: 1100, margin: '48px auto 0', padding: '0 24px 80px' }}>
        <div style={{ borderRadius: 20, background: 'linear-gradient(135deg,#0b1e3d,#0d1a30)', border: '1px solid rgba(14,165,233,0.15)', padding: '48px 40px', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#fff', marginBottom: 10 }}>Ready to Open Your Account?</h2>
          <p style={{ color: '#6b8099', fontSize: 15, marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
            Complete KYC in minutes. Deposit from $200. Start trading real markets same day.
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/login')}
              style={{ padding: '13px 32px', borderRadius: 12, background: 'linear-gradient(135deg,#0ea5e9,#0369a1)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              Open Live Account
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
            <button onClick={() => navigate('/login')}
              style={{ padding: '13px 32px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: '#c8d6e5', fontWeight: 600, fontSize: 15, border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
              Try Demo Account
            </button>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', background: '#040710', padding: '24px', textAlign: 'center' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '6px 20px', marginBottom: 10 }}>
          {[['Terms of Service', '/terms-of-service.html'], ['Privacy Policy', '/privacy-policy.html'], ['Risk Disclosure', '/risk-disclosure.html'], ['Cookie Policy', '/cookie-policy.html']].map(([l, h]) => (
            <a key={l} href={h} target="_blank" rel="noreferrer" style={{ color: '#3a5060', fontSize: 12, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <p style={{ color: '#3a4a60', fontSize: 12 }}>© 2026 TradeX Pro Limited. All rights reserved.</p>
      </footer>
    </div>
  )
}
