import React, { useEffect, useState } from 'react'
import { getStatement, StatementData } from '../api/statement'
import { FileText, Printer } from '../components/ui/Icons'

// ── formatting helpers ────────────────────────────────────────────────────────
const CURSYM: Record<string, string> = { USD: '$', EUR: '€', GBP: '£' }
const money = (n: number, cur: string) => {
  const s = CURSYM[cur] || ''
  return `${n < 0 ? '-' : ''}${s}${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
const px = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 5 })
const qy = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 8 })
const pad = (x: number) => String(x).padStart(2, '0')
const dt = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
const dOnly = (iso: string) => { const d = new Date(iso); return `${pad(d.getDate())} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()}` }
const toInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// ── document sub-components (light theme, print-friendly) ──────────────────────
const INK = '#1a1a1a', SUB = '#555', LINE = '#e2e2e2', GOLD = '#b8862f'
const th: React.CSSProperties = { textAlign: 'left', fontSize: 9.5, fontWeight: 700, color: SUB, padding: '7px 8px', borderBottom: `1.5px solid ${INK}`, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { fontSize: 10, color: INK, padding: '6px 8px', borderBottom: `1px solid ${LINE}`, whiteSpace: 'nowrap' }
const rnum: React.CSSProperties = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' }

function SummaryRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${LINE}`, fontWeight: bold ? 700 : 400 }}>
      <span style={{ fontSize: 11, color: bold ? INK : SUB }}>{label}</span>
      <span style={{ fontSize: 11, color: INK, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ fontSize: 15, fontWeight: 800, color: INK, margin: '0 0 10px' }}>{title}</h2>
      <div className="stmt-scroll" style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  )
}

const PRINT_CSS = `
@media print {
  @page { size: A4; margin: 12mm; }
  html, body { background: #fff !important; }
  body * { visibility: hidden !important; }
  #stmt-print, #stmt-print * { visibility: visible !important; }
  #stmt-print { position: absolute; left: 0; top: 0; width: 100%; margin: 0 !important; box-shadow: none !important; border: 0 !important; }
  .stmt-noprint { display: none !important; }
  .stmt-scroll { overflow: visible !important; }
  .stmt-section { break-inside: avoid; }
  tr { break-inside: avoid; }
}
`

// preset date ranges
type Preset = { key: string; label: string; range: () => [Date, Date] }
const PRESETS: Preset[] = [
  { key: 'last30', label: 'Last 30 days', range: () => [new Date(Date.now() - 30 * 864e5), new Date()] },
  { key: 'thisMonth', label: 'This month', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth(), 1), n] } },
  { key: 'lastMonth', label: 'Last month', range: () => { const n = new Date(); return [new Date(n.getFullYear(), n.getMonth() - 1, 1), new Date(n.getFullYear(), n.getMonth(), 0)] } },
  { key: 'thisYear', label: 'This year', range: () => { const n = new Date(); return [new Date(n.getFullYear(), 0, 1), n] } },
]
const CURRENCIES = ['USD', 'EUR', 'GBP']

export default function StatementsPage() {
  const today = new Date()
  const monthAgo = new Date(today.getTime() - 30 * 864e5)
  const [from, setFrom] = useState(toInput(monthAgo))
  const [to, setTo] = useState(toInput(today))
  const [currency, setCurrency] = useState(localStorage.getItem('account_currency') || 'USD')
  const [preset, setPreset] = useState('last30')
  const [data, setData] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  const applyPreset = (p: Preset) => {
    const [f, t] = p.range()
    setFrom(toInput(f)); setTo(toInput(t)); setPreset(p.key)
  }

  const load = async (f = from, t = to, c = currency) => {
    setLoading(true); setErr('')
    try { setData(await getStatement(f, t, c)) }
    catch (e: any) { setErr(e?.response?.data?.error || 'Failed to generate statement'); setData(null) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, []) // initial default-range statement

  const cur = data?.client.currency || currency

  return (
    <div style={{ padding: 'clamp(14px, 3vw, 28px)', maxWidth: 980, margin: '0 auto' }}>
      <style>{PRINT_CSS}</style>

      {/* ── Controls ─────────────────────────────────────────────────────────── */}
      <div className="stmt-noprint" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <div style={{ marginRight: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <FileText size={22} color="#f2b84b" strokeWidth={1.9} />
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--t-ink, #f7f2e6)', margin: 0 }}>Trading Statements</h1>
            </div>
            <p style={{ fontSize: 12.5, color: 'var(--t-dim, #8d7d6a)', margin: '5px 0 0' }}>Live account · pick a period and download a PDF.</p>
          </div>
          <button onClick={() => window.print()} disabled={!data}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 9, border: 'none', background: 'linear-gradient(120deg,#f9d98c,#f2b84b 45%,#dd9c2f)', color: '#221503', fontWeight: 800, fontSize: 13, cursor: data ? 'pointer' : 'not-allowed', opacity: data ? 1 : 0.5 }}>
            <Printer size={15} strokeWidth={2} /> Download PDF
          </button>
        </div>

        {/* preset range chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {PRESETS.map(p => {
            const on = preset === p.key
            return (
              <button key={p.key} onClick={() => applyPreset(p)}
                style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  background: on ? 'rgba(242,184,75,0.14)' : 'rgba(255,255,255,0.03)', color: on ? '#f2b84b' : 'var(--t-dim,#8d7d6a)',
                  border: `1px solid ${on ? 'rgba(242,184,75,0.4)' : 'rgba(247,242,230,0.1)'}` }}>
                {p.label}
              </button>
            )
          })}
        </div>

        {/* date + currency + generate */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--t-dim, #8d7d6a)', fontWeight: 600 }}>
            From
            <input type="date" value={from} max={to} onChange={e => { setFrom(e.target.value); setPreset('custom') }}
              style={{ padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(242,184,75,0.2)', color: 'var(--t-ink,#f7f2e6)', colorScheme: 'dark', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--t-dim, #8d7d6a)', fontWeight: 600 }}>
            To
            <input type="date" value={to} min={from} max={toInput(today)} onChange={e => { setTo(e.target.value); setPreset('custom') }}
              style={{ padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(242,184,75,0.2)', color: 'var(--t-ink,#f7f2e6)', colorScheme: 'dark', fontSize: 13 }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--t-dim, #8d7d6a)', fontWeight: 600 }}>
            Currency
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              style={{ padding: '9px 11px', borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(242,184,75,0.2)', color: 'var(--t-ink,#f7f2e6)', colorScheme: 'dark', fontSize: 13, cursor: 'pointer' }}>
              {CURRENCIES.map(c => <option key={c} value={c} style={{ color: '#111' }}>{c}</option>)}
            </select>
          </label>
          <button onClick={() => load()} disabled={loading}
            style={{ padding: '10px 18px', borderRadius: 9, border: '1px solid rgba(242,184,75,0.3)', background: 'rgba(242,184,75,0.12)', color: '#f2b84b', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {loading ? 'Generating…' : 'Generate'}
          </button>
        </div>
      </div>

      {err && <div className="stmt-noprint" style={{ padding: 14, borderRadius: 10, background: 'rgba(255,90,114,0.1)', border: '1px solid rgba(255,90,114,0.3)', color: '#ff8fa0', fontSize: 13, marginBottom: 16 }}>{err}</div>}

      {/* ── The printable document ───────────────────────────────────────────── */}
      {data && (
        <div id="stmt-print" style={{ background: '#fff', color: INK, borderRadius: 10, padding: 'clamp(20px, 4vw, 44px)', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', fontFamily: "'Inter', system-ui, sans-serif" }}>
          {/* brand header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `2px solid ${INK}`, paddingBottom: 12 }}>
            <span style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.02em' }}>Trade<span style={{ color: GOLD }}>X</span></span>
            <span style={{ fontSize: 11, color: SUB }}>Trading Statement {dOnly(data.period.from)} – {dOnly(data.period.to)}</span>
          </div>

          <h1 style={{ fontSize: 30, fontWeight: 900, margin: '22px 0 20px', letterSpacing: '-0.02em' }}>Trading Statement</h1>

          {/* client info + account summary */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(20px, 5vw, 56px)' }}>
            <div className="stmt-section">
              {[
                ['Client', data.client.name],
                ['Account number', data.client.accountNumber || '—'],
                ['Account type', data.client.accountType === 'raw_spread' ? 'Raw Spread (CFD)' : `${data.client.accountType} (CFD)`],
                ['Account currency', data.client.currency],
                ['From', dOnly(data.period.from)],
                ['To', dOnly(data.period.to)],
                ['Generated', dt(data.period.generated)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${LINE}` }}>
                  <span style={{ fontSize: 11, color: SUB }}>{k}</span>
                  <span style={{ fontSize: 11, color: INK, fontWeight: 700, textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="stmt-section">
              <h2 style={{ fontSize: 15, fontWeight: 800, margin: '0 0 8px' }}>Account Summary ({cur})</h2>
              <SummaryRow label="Opening balance" value={money(data.summary.openingBalance, cur)} bold />
              <SummaryRow label="Opening unrealised Profit/Loss" value={money(data.summary.openingUnrealised, cur)} bold />
              <SummaryRow label="Opening equity" value={money(data.summary.openingEquity, cur)} bold />
              <SummaryRow label="Deposits" value={money(data.summary.deposits, cur)} />
              <SummaryRow label="Realised profit & loss" value={money(data.summary.realisedPnl, cur)} />
              <SummaryRow label="Withdrawals" value={money(-data.summary.withdrawals, cur)} />
              <SummaryRow label="Pending withdrawals" value={money(-data.summary.pendingWithdrawals, cur)} />
              <SummaryRow label="Closing balance" value={money(data.summary.closingBalance, cur)} bold />
              <SummaryRow label="Closing unrealised Profit/Loss" value={money(data.summary.closingUnrealised, cur)} bold />
              <SummaryRow label="Closing equity" value={money(data.summary.closingEquity, cur)} bold />
            </div>
          </div>

          {/* open position summary */}
          <Section title="Open position summary">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Position</th><th style={{ ...th, ...rnum }}>Trades</th><th style={{ ...th, ...rnum }}>Notional value</th></tr></thead>
              <tbody>
                <tr><td style={td}>Total Long</td><td style={{ ...td, ...rnum }}>{data.openSummary.longCount || '-'}</td><td style={{ ...td, ...rnum }}>{data.openSummary.longCount ? money(data.openSummary.longNotional, cur) : '-'}</td></tr>
                <tr><td style={td}>Total Short</td><td style={{ ...td, ...rnum }}>{data.openSummary.shortCount || '-'}</td><td style={{ ...td, ...rnum }}>{data.openSummary.shortCount ? money(data.openSummary.shortNotional, cur) : '-'}</td></tr>
              </tbody>
            </table>
          </Section>

          {/* open positions */}
          <div className="stmt-section">
            <Section title="Open positions">
              {data.openPositions.length === 0 ? (
                <p style={{ fontSize: 11, color: SUB, margin: 0 }}>No open positions.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>Date / Time</th><th style={th}>Product</th><th style={th}>Direction</th>
                    <th style={{ ...th, ...rnum }}>Quantity</th><th style={{ ...th, ...rnum }}>Open price</th><th style={{ ...th, ...rnum }}>Current price</th>
                    <th style={th}>SL / TP</th><th style={{ ...th, ...rnum }}>Notional / Lev.</th><th style={{ ...th, ...rnum }}>Unrealised P&L</th>
                  </tr></thead>
                  <tbody>
                    {data.openPositions.map(p => (
                      <tr key={p.id}>
                        <td style={td}>{dt(p.opened_at)}</td><td style={td}>{p.symbol}</td>
                        <td style={{ ...td, fontWeight: 700, color: p.side === 'long' ? '#137a52' : '#b3273b' }}>{p.side.toUpperCase()}</td>
                        <td style={{ ...td, ...rnum }}>{qy(p.quantity)}</td><td style={{ ...td, ...rnum }}>{px(p.open_price)}</td><td style={{ ...td, ...rnum }}>{px(p.current_price)}</td>
                        <td style={td}>{p.stop_loss ? px(p.stop_loss) : '-'} / {p.take_profit ? px(p.take_profit) : '-'}</td>
                        <td style={{ ...td, ...rnum }}>{money(p.notional, cur)} / {p.leverage}:1</td>
                        <td style={{ ...td, ...rnum, color: p.unrealised_pnl >= 0 ? '#137a52' : '#b3273b' }}>{money(p.unrealised_pnl, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>

          {/* closed positions */}
          <div className="stmt-section">
            <Section title="Closed positions">
              {data.closedPositions.length === 0 ? (
                <p style={{ fontSize: 11, color: SUB, margin: 0 }}>No positions closed in this period.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>Date / Time</th><th style={th}>Product</th><th style={th}>Direction</th>
                    <th style={{ ...th, ...rnum }}>Quantity</th><th style={{ ...th, ...rnum }}>Open price</th><th style={{ ...th, ...rnum }}>Close price</th>
                    <th style={{ ...th, ...rnum }}>Notional / Lev.</th><th style={{ ...th, ...rnum }}>Realised P&L</th>
                  </tr></thead>
                  <tbody>
                    {data.closedPositions.map(p => (
                      <tr key={p.id}>
                        <td style={td}>{dt(p.closed_at)}</td><td style={td}>{p.symbol}</td>
                        <td style={{ ...td, fontWeight: 700, color: p.side === 'long' ? '#137a52' : '#b3273b' }}>{p.side.toUpperCase()}</td>
                        <td style={{ ...td, ...rnum }}>{qy(p.quantity)}</td><td style={{ ...td, ...rnum }}>{px(p.open_price)}</td><td style={{ ...td, ...rnum }}>{px(p.close_price)}</td>
                        <td style={{ ...td, ...rnum }}>{money(p.notional, cur)} / {p.leverage}:1</td>
                        <td style={{ ...td, ...rnum, color: p.realised_pnl >= 0 ? '#137a52' : '#b3273b' }}>{money(p.realised_pnl, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>

          {/* ledger movement */}
          <div className="stmt-section">
            <Section title="Ledger movement">
              {data.ledger.length === 0 ? (
                <p style={{ fontSize: 11, color: SUB, margin: 0 }}>No ledger movements in this period.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    <th style={th}>Date / Time</th><th style={th}>Description</th><th style={th}>Type</th>
                    <th style={{ ...th, ...rnum }}>Amount</th><th style={{ ...th, ...rnum }}>Balance</th>
                  </tr></thead>
                  <tbody>
                    {data.ledger.map(l => (
                      <tr key={l.id + l.type}>
                        <td style={td}>{dt(l.time)}</td><td style={td}>{l.description}</td><td style={td}>{l.type}</td>
                        <td style={{ ...td, ...rnum, color: l.amount >= 0 ? '#137a52' : '#b3273b' }}>{money(l.amount, cur)}</td>
                        <td style={{ ...td, ...rnum }}>{money(l.balance, cur)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          </div>

          {/* footer */}
          <p style={{ marginTop: 30, paddingTop: 12, borderTop: `1px solid ${LINE}`, fontSize: 8.5, lineHeight: 1.5, color: '#888' }}>
            TradeX is a trading simulation platform. This statement is generated from your account activity for the selected period and is provided for
            informational purposes. Please review it against your own records and report any discrepancies. Figures are shown in your account currency ({cur}).
          </p>
        </div>
      )}

      {!data && !loading && !err && (
        <p className="stmt-noprint" style={{ color: 'var(--t-dim,#8d7d6a)', fontSize: 13 }}>Select a period and generate your statement.</p>
      )}
    </div>
  )
}
