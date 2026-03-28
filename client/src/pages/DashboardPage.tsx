import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTradingStore } from '../store/tradingStore'
import { useAuthStore } from '../store/authStore'
import { formatCurrency, formatPrice } from '../utils/formatters'
import { MarketSymbol, Ticker } from '../types'
import { getKYCStatus } from './KYCPage'

// ─── Feature Card ──────────────────────────────────────────────────────────────
function FeatureCard({
  title, description, badge, accent, icon, onClick, wide
}: {
  title: string; description: string; badge?: string; accent: string
  icon: React.ReactNode; onClick?: () => void; wide?: boolean
}) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${wide ? 'col-span-2' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${accent}14 0%, ${accent}06 100%)`,
        border: `1px solid ${accent}22`,
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${accent}44`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = `${accent}22`}
    >
      {/* glow */}
      <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full opacity-10 blur-2xl pointer-events-none"
           style={{ background: accent }} />
      <div className="flex items-start justify-between gap-2">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
             style={{ background: `${accent}20`, border: `1px solid ${accent}30`, color: accent }}>
          {icon}
        </div>
        {badge && (
          <span className="text-2xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{ background: `${accent}20`, color: accent, border: `1px solid ${accent}30` }}>
            {badge}
          </span>
        )}
      </div>
      <div>
        <p className="font-bold text-sm text-text-primary">{title}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="flex items-center gap-1 mt-auto" style={{ color: accent }}>
        <span className="text-xs font-semibold">Open</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </div>
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
    <div className="space-y-7">

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
          <h1 className="text-2xl font-bold text-text-primary">
            {greet()}, <span className="gradient-text">{user?.username ?? 'Trader'}</span>
          </h1>
          <p className="text-text-muted text-sm mt-1">
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
        <div className="px-6 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
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
            <div key={r.l} className="px-5 py-4">
              <p className="text-xs text-text-muted mb-1">{r.l}</p>
              <p className={`text-lg font-bold font-mono tabular ${r.c}`}>{r.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features & Tools ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Features &amp; Tools</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">

          {/* WebTrader */}
          <FeatureCard
            title="WebTrader"
            description="Professional trading terminal with live charts, order book, leverage &amp; one-click execution."
            badge="Live"
            accent="#0ea5e9"
            onClick={() => navigate('/dashboard/trade')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>}
          />

          {/* TradePilot */}
          <FeatureCard
            title="TradePilot AI"
            description="Automated trading bots powered by technical analysis &amp; real-time news sentiment."
            badge="AI"
            accent="#8b5cf6"
            onClick={() => navigate('/dashboard/bots')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M9 11V7a3 3 0 016 0v4"/><circle cx="9" cy="16" r="1" fill="currentColor"/><circle cx="15" cy="16" r="1" fill="currentColor"/><path d="M12 2v2"/></svg>}
          />

          {/* Portfolio */}
          <FeatureCard
            title="Portfolio"
            description="Track your positions, margin usage, P&amp;L, and overall account performance."
            accent="#00c878"
            onClick={() => navigate('/dashboard/portfolio')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>}
          />

          {/* Market Scanner */}
          <FeatureCard
            title="Market Scanner"
            description="Scan markets in real time for breakout signals, volatility &amp; trending instruments."
            accent="#f59e0b"
            onClick={() => navigate('/dashboard/scanner')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>}
          />

          {/* Analytics */}
          <FeatureCard
            title="Analytics"
            description="Deep-dive into your trading history, equity curve &amp; strategy performance metrics."
            accent="#06b6d4"
            onClick={() => navigate('/dashboard/analytics')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M18 20V10M12 20V4M6 20v-6"/></svg>}
          />

          {/* Orders */}
          <FeatureCard
            title="Orders"
            description="View and manage all open, pending and filled orders across all instruments."
            accent="#e879f9"
            onClick={() => navigate('/dashboard/orders')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>}
          />

          {/* Deposit */}
          <FeatureCard
            title="Deposit Funds"
            description="Add funds to your account via bank transfer, card or crypto wallet."
            accent="#34d399"
            onClick={() => navigate('/dashboard/deposit')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 5v14M5 12l7 7 7-7"/><path d="M5 5h14"/></svg>}
          />

          {/* Withdraw */}
          <FeatureCard
            title="Withdraw Funds"
            description="Submit a withdrawal request to your bank account or crypto wallet."
            accent="#fb923c"
            onClick={() => navigate('/dashboard/withdraw')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 19V5M5 12l7-7 7 7"/><path d="M5 19h14"/></svg>}
          />

          {/* Leaderboard */}
          <FeatureCard
            title="Leaderboard"
            description="See how you rank against other traders on the platform by P&amp;L and win rate."
            accent="#f472b6"
            onClick={() => navigate('/dashboard/leaderboard')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M8 21H5a2 2 0 01-2-2v-5m0 0V9a2 2 0 012-2h3m0 9H5m13 5h3a2 2 0 002-2v-5m0 0V9a2 2 0 00-2-2h-3m0 9h3M9 3h6a2 2 0 012 2v4H7V5a2 2 0 012-2z"/></svg>}
          />

          {/* Alerts */}
          <FeatureCard
            title="Price Alerts"
            description="Set custom alerts for price levels, %moves and news events across all instruments."
            accent="#a78bfa"
            onClick={() => navigate('/dashboard/alerts')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22c1.1 0 2-.9 2-2H10a2 2 0 002 2zm6-6V10c0-3.07-1.64-5.64-4.5-6.32V3a1.5 1.5 0 00-3 0v.68C7.63 4.36 6 6.92 6 10v6l-2 2v1h16v-1l-2-2z"/></svg>}
          />

          {/* Profile Settings */}
          <FeatureCard
            title="Profile Settings"
            description="Update your personal info, change password and manage account security."
            accent="#94a3b8"
            onClick={() => navigate('/dashboard/profile')}
            icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>}
          />

        </div>
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
                  {['Side','Symbol','Type','Size','Price','Status','Time'].map((h,i) => (
                    <th key={h} className={`py-2.5 px-4 text-xs font-semibold uppercase tracking-wider text-text-muted ${i > 1 ? 'text-right' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => (
                  <tr key={o.id} className="hover:bg-white/5 transition-colors" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded ${o.side === 'buy' ? 'bg-bull-muted text-bull' : 'bg-bear-muted text-bear'}`}>
                        {o.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-sm text-text-primary">{o.symbol}</td>
                    <td className="py-3 px-4 text-xs text-text-muted text-right">{o.type}</td>
                    <td className="py-3 px-4 font-mono text-xs text-text-secondary text-right">{o.quantity}</td>
                    <td className="py-3 px-4 font-mono text-xs text-text-secondary text-right">{o.price ? formatPrice(o.price, o.symbol) : 'Market'}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
                            style={{
                              background: o.status === 'filled' ? 'rgba(0,200,120,0.1)' : o.status === 'open' ? 'rgba(14,165,233,0.1)' : 'rgba(107,128,153,0.1)',
                              color: o.status === 'filled' ? '#00c878' : o.status === 'open' ? '#38bdf8' : '#6b8099',
                            }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-text-muted text-right">
                      {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
