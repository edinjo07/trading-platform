import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { MarketSymbol, Ticker } from '../types'
import { getKYCStatus } from './KYCPage'

// ─── Quick Action ──────────────────────────────────────────────────────────────
function QuickAction({
  label, sub, accent, icon, onClick
}: {
  label: string; sub: string; accent: string; icon: React.ReactNode; onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-xl text-left transition-all w-full"
      style={{ background: `${accent}0d`, border: `1px solid ${accent}22` }}
      onMouseEnter={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}55`
        ;(e.currentTarget as HTMLElement).style.background  = `${accent}18`
      }}
      onMouseLeave={e => {
        ;(e.currentTarget as HTMLElement).style.borderColor = `${accent}22`
        ;(e.currentTarget as HTMLElement).style.background  = `${accent}0d`
      }}
    >
      <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center"
           style={{ background: `${accent}18`, color: accent }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-text-primary">{label}</p>
        <p className="text-xs text-text-muted truncate mt-0.5">{sub}</p>
      </div>
      <svg className="w-4 h-4 shrink-0 ml-auto opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}

// ─── Quick Stat ────────────────────────────────────────────────────────────────
function QuickStat({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
      <p className="text-2xs font-bold uppercase tracking-widest text-text-muted">{label}</p>
      <p className={`text-xl font-bold font-mono tabular ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  )
}

// ─── Ticker Mini Row ───────────────────────────────────────────────────────────
function MiniTickerRow({ sym, ticker, onClick }: { sym: MarketSymbol; ticker?: Ticker; onClick: () => void }) {
  const isUp = (ticker?.changePercent ?? 0) >= 0
  const ASSET_COLOR: Record<string, string> = {
    crypto: 'linear-gradient(135deg,#f59e0b,#d97706)',
    forex:  'linear-gradient(135deg,#0ea5e9,#0369a1)',
    stock:  'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  }
  return (
    <div onClick={onClick} className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-white/5 transition-colors"
         style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
             style={{ background: ASSET_COLOR[sym.assetClass] ?? ASSET_COLOR.stock }}>
          {sym.symbol.charAt(0)}
        </div>
        <div>
          <p className="font-mono font-bold text-xs text-text-primary">{sym.symbol}</p>
          <p className="text-2xs text-text-muted truncate max-w-[100px]">{sym.name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono text-xs font-semibold text-text-primary">{ticker ? formatPrice(ticker.price, sym.symbol) : '-'}</p>
        <p className={`text-2xs font-semibold ${isUp ? 'text-bull' : 'text-bear'}`}>
          {ticker ? (isUp ? '+' : '') + ticker.changePercent.toFixed(2) + '%' : '-'}
        </p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
const CAT_TABS = ['All', 'Forex', 'Crypto', 'Stocks'] as const
type CatTab = typeof CAT_TABS[number]

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    tickers, symbols, portfolio, orders,
    loadPortfolio, loadOrders, setSelectedSymbol,
    performanceStats, loadAnalytics,
  } = useTradingStore()

  const [tab, setTab] = useState<CatTab>('All')
  const [kycStatus] = useState(() => getKYCStatus())

  useEffect(() => {
    loadPortfolio(); loadOrders(); loadAnalytics()
    const id = setInterval(loadPortfolio, 8000)
    return () => clearInterval(id)
  }, [loadPortfolio, loadOrders, loadAnalytics])

  const greet = () => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  }

  const equity      = portfolio?.totalEquity ?? user?.balance ?? 0
  const cash        = portfolio?.cashBalance ?? user?.balance ?? 0
  const upnl        = portfolio?.unrealizedPnl ?? 0
  const rpnl        = portfolio?.realizedPnl   ?? 0
  const openPos     = portfolio?.positions?.length ?? 0
  const winRate     = performanceStats?.winRate ?? 0
  const totalTrades = performanceStats?.totalTrades ?? 0

  const filteredMarket = useMemo(() => {
    const assetMap: Record<CatTab, string> = { All: '', Forex: 'forex', Crypto: 'crypto', Stocks: 'stock' }
    let list = symbols
    if (tab !== 'All') list = list.filter(s => s.assetClass === assetMap[tab])
    return list.slice(0, 12)
  }, [symbols, tab])

  const goTrade = (sym: string) => { setSelectedSymbol(sym); navigate('/dashboard/trade') }

  const recentOrders = orders.slice(0, 5)

  return (
    <div className="space-y-4 sm:space-y-6">

      {/* ── KYC Verification Banner ───────────────────────────────────────── */}
      {kycStatus === 'unverified' && (
        <div className="flex items-center justify-between gap-4 rounded-2xl px-5 py-4 flex-wrap cursor-pointer"
             onClick={() => navigate('/dashboard/verify')}
             style={{ background: 'linear-gradient(135deg,#92400e18,#78350f0d)', border: '1px solid rgba(245,158,11,0.3)' }}
             onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.55)'}
             onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.3)'}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
                 style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}>
              <svg className="w-4 h-4" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold" style={{ color: '#fcd34d' }}>Verify your account</p>
              <p className="text-xs text-text-muted mt-0.5">Submit your ID and proof of address to unlock full trading access &amp; withdraw limits.</p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1.5"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.3)' }}>
            Verify Now
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="9 18 15 12 9 6"/></svg>
          </span>
        </div>
      )}

      {kycStatus === 'pending' && (
        <div className="flex items-center gap-3 rounded-2xl px-5 py-4"
             style={{ background: 'rgba(14,165,233,0.06)', border: '1px solid rgba(14,165,233,0.2)' }}>
          <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center"
               style={{ background: 'rgba(14,165,233,0.12)', border: '1px solid rgba(14,165,233,0.25)' }}>
            <svg className="w-4 h-4 text-brand-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-brand-300">Verification under review</p>
            <p className="text-xs text-text-muted mt-0.5">Your documents are being reviewed by our compliance team. This typically takes 1–2 business days.</p>
          </div>
          <button onClick={e => { e.stopPropagation(); navigate('/dashboard/verify') }}
            className="text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors shrink-0">Details →</button>
        </div>
      )}

      {/* ── Greeting + status ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-text-primary">
            {greet()}, <span className="gradient-text">{user?.username ?? 'Trader'}</span>
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            {' · '}{user?.accountMode === 'real' ? 'Live Trading Account' : 'Demo Account'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
               style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid rgba(0,200,120,0.2)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
            <span className="text-xs font-bold text-bull">MARKETS LIVE</span>
          </div>
          <button onClick={() => navigate('/dashboard/trade')} className="btn-primary text-sm px-4 py-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
            New Trade
          </button>
        </div>
      </div>

      {/* ── Account Overview ──────────────────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg,#0c2245 0%,#0a1830 50%,#060e1c 100%)', border: '1px solid rgba(14,165,233,0.18)' }}>
        {/* top stripe */}
        <div className="px-4 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-1">Account Overview</p>
            <p className="text-4xl font-bold font-mono text-white tabular">{formatCurrency(equity)}</p>
            <p className="text-sm text-text-secondary mt-1">Total Equity</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => navigate('/dashboard/deposit')} className="btn-primary px-5 py-2 text-sm">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
              Deposit
            </button>
            <button onClick={() => navigate('/dashboard/withdraw')}
              className="px-5 py-2 text-sm font-semibold rounded-lg transition-all"
              style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.1)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'}>
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
                Withdraw
              </span>
            </button>
          </div>
        </div>
        {/* stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-white/5">
          {[
            { l: 'Cash Balance',   v: formatCurrency(cash), c: 'text-text-primary' },
            { l: 'Open Positions', v: String(openPos),      c: 'text-brand-300' },
            { l: 'Unrealised P&L', v: (upnl >= 0 ? '+' : '') + formatCurrency(upnl), c: upnl >= 0 ? 'text-bull' : 'text-bear' },
            { l: 'Realised P&L',   v: (rpnl >= 0 ? '+' : '') + formatCurrency(rpnl), c: rpnl >= 0 ? 'text-bull' : 'text-bear' },
          ].map(r => (
            <div key={r.l} className="px-3 py-3 sm:px-5 sm:py-4">
              <p className="text-xs text-text-muted mb-1">{r.l}</p>
              <p className={`text-lg font-bold font-mono tabular ${r.c}`}>{r.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <QuickAction
          label="New Trade"
          sub="Open a live position"
          accent="#0ea5e9"
          onClick={() => navigate('/dashboard/trade')}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
        />
        <QuickAction
          label="Deposit"
          sub="Fund your account"
          accent="#00c878"
          onClick={() => navigate('/dashboard/deposit')}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 5v14M5 12l7 7 7-7"/><path d="M5 5h14"/></svg>}
        />
        <QuickAction
          label="Portfolio"
          sub="Positions & P&L"
          accent="#8b5cf6"
          onClick={() => navigate('/dashboard/portfolio')}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
        />
        <QuickAction
          label="Set Alert"
          sub="Price notifications"
          accent="#f59e0b"
          onClick={() => navigate('/dashboard/alerts')}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/></svg>}
        />
      </div>

      {/* ── Performance + Market ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* Mini market */}
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3.5 flex-wrap" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <span className="text-sm font-semibold text-text-primary">Live Markets</span>
            <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              {CAT_TABS.map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className="px-3 py-1 rounded text-xs font-semibold transition-all"
                  style={tab === t ? { background: 'rgba(14,165,233,0.2)', color: '#38bdf8' } : { color: '#6b8099' }}>
                  {t}
                </button>
              ))}
            </div>
            <button onClick={() => navigate('/dashboard/trade')} className="ml-auto text-xs text-brand-400 hover:text-brand-300 transition-colors">
              Full terminal →
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/5">
            <div>
              {filteredMarket.slice(0, 6).map(sym => (
                <MiniTickerRow key={sym.symbol} sym={sym} ticker={tickers[sym.symbol]} onClick={() => goTrade(sym.symbol)} />
              ))}
            </div>
            <div>
              {filteredMarket.slice(6, 12).map(sym => (
                <MiniTickerRow key={sym.symbol} sym={sym} ticker={tickers[sym.symbol]} onClick={() => goTrade(sym.symbol)} />
              ))}
            </div>
          </div>
          <div className="px-5 py-2 flex items-center gap-1.5" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" />
            <span className="text-xs text-text-muted">Real-time · click any instrument to trade</span>
          </div>
        </div>

        {/* Performance stats */}
        <div className="card p-5 flex flex-col gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Your Performance</p>
          <div className="grid grid-cols-2 gap-2">
            <QuickStat label="Win Rate"     value={totalTrades > 0 ? `${(winRate * 100).toFixed(1)}%` : '-'} color={winRate >= 0.5 ? 'text-bull' : 'text-bear'} sub="Filled trades" />
            <QuickStat label="Total Trades" value={String(totalTrades)} color="text-text-primary" sub="All time" />
            <QuickStat label="Open Pos."    value={String(openPos)} color="text-brand-300" sub={openPos === 0 ? 'None active' : 'Live'} />
            <QuickStat label="Realised P&L" value={(rpnl >= 0 ? '+' : '') + formatCurrency(rpnl)} color={rpnl >= 0 ? 'text-bull' : 'text-bear'} />
          </div>
          <div className="mt-auto flex flex-col gap-2">
            <button onClick={() => navigate('/dashboard/analytics')}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.18)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.18)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(6,182,212,0.1)'}>
              View Full Analytics
            </button>
            <button onClick={() => navigate('/dashboard/leaderboard')}
              className="w-full py-2 rounded-lg text-xs font-semibold transition-all"
              style={{ background: 'rgba(244,114,182,0.08)', color: '#f472b6', border: '1px solid rgba(244,114,182,0.15)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(244,114,182,0.15)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(244,114,182,0.08)'}>
              Leaderboard
            </button>
          </div>
        </div>
      </div>

      {/* ── Recent Orders ─────────────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <span className="text-sm font-semibold text-text-primary">Recent Orders</span>
          <button onClick={() => navigate('/dashboard/orders')} className="text-xs text-brand-400 hover:text-brand-300 transition-colors">View all →</button>
        </div>
        {recentOrders.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(14,165,233,0.1)' }}>
              <svg className="w-6 h-6 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>
            </div>
            <p className="text-text-muted text-sm font-medium">No orders yet</p>
            <p className="text-text-muted text-xs mt-1 mb-4">Place your first trade to get started</p>
            <button onClick={() => navigate('/dashboard/trade')} className="btn-primary text-sm px-5 py-2">Open Trade</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <tr>
                  {[['Side',''],['Symbol',''],['Type','hidden sm:table-cell text-right'],['Size','hidden sm:table-cell text-right'],['Price','text-right'],['Status','text-right'],['Time','text-right']].map(([h,cls]) => (
                    <th key={h} className={`py-2.5 px-3 sm:px-4 text-xs font-semibold uppercase tracking-wider text-text-muted ${cls}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-3 px-3 sm:px-4">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${o.side === 'buy' ? 'bg-bull-muted text-bull' : 'bg-bear-muted text-bear'}`}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-sm text-text-primary">{o.symbol}</td>
                    <td className="py-3 px-3 sm:px-4 text-xs text-text-muted text-right hidden sm:table-cell">{o.type}</td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs text-text-secondary text-right hidden sm:table-cell">{o.quantity}</td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-xs text-text-secondary text-right">{o.price ? formatPrice(o.price, o.symbol) : 'Market'}</td>
                    <td className="py-3 px-3 sm:px-4 text-right">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{
                              background: o.status === 'filled' ? 'rgba(0,200,120,0.1)' : o.status === 'open' ? 'rgba(14,165,233,0.1)' : 'rgba(107,128,153,0.1)',
                              color: o.status === 'filled' ? '#00c878' : o.status === 'open' ? '#38bdf8' : '#6b8099',
                            }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-xs text-text-muted text-right">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Explore More Tools ────────────────────────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">More Tools</p>
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {[
            { label: 'TradePilot', sub: 'AI Bots',        accent: '#8b5cf6', path: '/dashboard/bots',               icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M9 11V7a3 3 0 016 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/><path d="M12 2v2"/></svg> },
            { label: 'Scanner',    sub: 'Market scan',    accent: '#f59e0b', path: '/dashboard/scanner',            icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg> },
            { label: 'Rankings',   sub: 'Leaderboard',    accent: '#f472b6', path: '/dashboard/leaderboard',        icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M8 21H5a2 2 0 01-2-2v-5m0 0V9a2 2 0 012-2h3m0 9H5m13 5h3a2 2 0 002-2v-5m0 0V9a2 2 0 00-2-2h-3m0 9h3M9 3h6a2 2 0 012 2v4H7V5a2 2 0 012-2z"/></svg> },
            { label: 'Calendar',   sub: 'Eco events',     accent: '#06b6d4', path: '/dashboard/economic-calendar',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
            { label: 'Calculators',sub: 'Forex tools',    accent: '#34d399', path: '/dashboard/forex-calculators',  icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="8" y1="10" x2="8.01" y2="10"/><line x1="12" y1="10" x2="12.01" y2="10"/><line x1="16" y1="10" x2="16.01" y2="10"/><line x1="8" y1="14" x2="8.01" y2="14"/><line x1="12" y1="14" x2="12.01" y2="14"/><line x1="16" y1="14" x2="16.01" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg> },
            { label: 'Web TV',     sub: 'Live stream',    accent: '#fb923c', path: '/dashboard/web-tv',             icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg> },
          ].map(t => (
            <button
              key={t.label}
              onClick={() => navigate(t.path)}
              className="flex flex-col items-center gap-2 p-3 rounded-xl transition-all text-center"
              style={{ background: `${t.accent}0a`, border: `1px solid ${t.accent}18` }}
              onMouseEnter={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = `${t.accent}40`
                ;(e.currentTarget as HTMLElement).style.background  = `${t.accent}14`
              }}
              onMouseLeave={e => {
                ;(e.currentTarget as HTMLElement).style.borderColor = `${t.accent}18`
                ;(e.currentTarget as HTMLElement).style.background  = `${t.accent}0a`
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${t.accent}18`, color: t.accent }}>
                {t.icon}
              </div>
              <div>
                <p className="text-xs font-semibold text-text-primary leading-tight">{t.label}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{t.sub}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  )
}
