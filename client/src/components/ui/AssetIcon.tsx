import React, { useState } from 'react'

interface AssetIconProps {
  symbol: string
  assetClass: string
  baseAsset?: string
  quoteAsset?: string
  size?: number
}

// ─── Crypto: jsDelivr / cryptocurrency-icons ──────────────────────────────────
const CRYPTO_ID: Record<string, string> = {
  BTCUSD: 'btc',  ETHUSD: 'eth',  LTCUSD: 'ltc',  BCHUSD: 'bch',
  DSHUSD: 'dash', XRPUSD: 'xrp',  DOTUSD: 'dot',  LNKUSD: 'link',
  ADAUSD: 'ada',  BNBUSD: 'bnb',  SOLUSD: 'sol',  AVAXUSD: 'avax',
  MATICUSD: 'matic', DOGEUSD: 'doge', XLMUSD: 'xlm', XTZUSD: 'xtz',
  UNIUSD: 'uni',  NEARUSD: 'near', ATOMUSD: 'atom', ALGOUSD: 'algo',
  FILUSD: 'fil',
}

// ─── Stocks: brand-logo domains (served via DuckDuckGo's icon proxy) ──────────
const STOCK_DOMAIN: Record<string, string> = {
  AAPL:  'apple.com',               TSLA:  'tesla.com',
  NVDA:  'nvidia.com',              MSFT:  'microsoft.com',
  GOOGL: 'google.com',              AMZN:  'amazon.com',
  META:  'meta.com',                JPM:   'jpmorganchase.com',
  NFLX:  'netflix.com',             COIN:  'coinbase.com',
  AMD:   'amd.com',                 DIS:   'disney.com',
  LMT:   'lockheedmartin.com',      RTX:   'rtx.com',
  NOC:   'northropgrumman.com',     GD:    'gd.com',
  BA:    'boeing.com',              HII:   'hii.com',
  LDOS:  'leidos.com',              CACI:  'caci.com',
  XOM:   'exxonmobil.com',          CVX:   'chevron.com',
  COP:   'conocophillips.com',
}

// ─── Forex: currency → ISO 3166-1 alpha-2 country code ───────────────────────
const CURRENCY_FLAG: Record<string, string> = {
  EUR: 'eu', GBP: 'gb', USD: 'us', JPY: 'jp', CHF: 'ch', CAD: 'ca',
  AUD: 'au', NZD: 'nz', NOK: 'no', SEK: 'se', DKK: 'dk', HUF: 'hu',
  PLN: 'pl', CZK: 'cz', ZAR: 'za', MXN: 'mx', TRY: 'tr', SGD: 'sg',
  HKD: 'hk', CNH: 'cn', CNY: 'cn', THB: 'th', ILS: 'il', TWD: 'tw',
}

// ─── Indices: index symbol → country flag ─────────────────────────────────────
const INDEX_FLAG: Record<string, string> = {
  US500: 'us', USTEC: 'us', US30: 'us', VIX: 'us', DX: 'us',
  UK100: 'gb', DE40: 'de', F40: 'fr', JP225: 'jp', AUS200: 'au',
  STOXX50: 'eu', EUSTX50: 'eu', CA60: 'ca', CH20: 'ch', HK50: 'hk',
  ES35: 'es', IT40: 'it', NL25: 'nl', NO25: 'no', SING: 'sg',
  PL40: 'pl', ZA50: 'za', TW50: 'tw', IN50: 'in', KO200: 'kr',
}

// ─── Fallback colours per asset class ────────────────────────────────────────
const CLASS_COLOR: Record<string, { bg: string; fg: string }> = {
  crypto:    { bg: '#f59e0b22', fg: '#f59e0b' },
  stock:     { bg: '#8b5cf622', fg: '#a78bfa' },
  forex:     { bg: '#3b82f622', fg: '#60a5fa' },
  commodity: { bg: '#f9731622', fg: '#fb923c' },
  index:     { bg: '#0ea5e922', fg: '#38bdf8' },
  bond:      { bg: '#10b98122', fg: '#34d399' },
}

// ─── Commodity custom SVG icons ───────────────────────────────────────────────
function CommodityIcon({ symbol, size }: { symbol: string; size: number }) {
  const metals   = ['XAUUSD', 'GC25', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'COPPER']
  const energy   = ['WTI', 'BRENT', 'XBRUSD', 'NGAS', 'HO']
  const agri     = ['COCOA', 'COFFEE', 'CORN', 'COTTON', 'OJ', 'SOYBEAN', 'SUGAR', 'WHEAT', 'LUMBER']

  if (metals.includes(symbol)) {
    const isGold    = symbol === 'XAUUSD' || symbol === 'GC25'
    const isSilver  = symbol === 'XAGUSD'
    const isPlatinum = symbol === 'XPTUSD'
    const color = isGold ? '#f59e0b' : isSilver ? '#94a3b8' : isPlatinum ? '#e2e8f0' : '#f97316'
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="17" fill={`${color}22`} stroke={`${color}55`} strokeWidth="1"/>
        <rect x="9" y="13" width="18" height="10" rx="3" fill={color} opacity="0.9"/>
        <rect x="12" y="11" width="12" height="3" rx="1.5" fill={color} opacity="0.7"/>
        <rect x="12" y="22" width="12" height="3" rx="1.5" fill={color} opacity="0.7"/>
        <line x1="14" y1="16" x2="14" y2="20" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
        <line x1="18" y1="16" x2="18" y2="20" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
        <line x1="22" y1="16" x2="22" y2="20" stroke="rgba(0,0,0,0.25)" strokeWidth="1.5"/>
      </svg>
    )
  }

  if (energy.includes(symbol)) {
    const color = symbol === 'NGAS' ? '#60a5fa' : '#f97316'
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="17" fill={`${color}22`} stroke={`${color}55`} strokeWidth="1"/>
        <ellipse cx="18" cy="22" rx="8" ry="5" fill={color} opacity="0.85"/>
        <path d="M18 10 C15 14 11 16 11 21 C11 25 14 27 18 27 C22 27 25 25 25 21 C25 16 21 14 18 10Z" fill={color} opacity="0.6"/>
        <path d="M18 14 C17 17 15 18 15 21 C15 23 16.5 24 18 24 C19.5 24 21 23 21 21 C21 18 19 17 18 14Z" fill="rgba(255,255,255,0.3)"/>
      </svg>
    )
  }

  if (agri.includes(symbol)) {
    const color = '#22c55e'
    return (
      <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="17" fill={`${color}22`} stroke={`${color}55`} strokeWidth="1"/>
        <path d="M18 26 L18 14" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 18 C18 18 12 14 11 9 C14 9 18 13 18 18Z" fill={color} opacity="0.8"/>
        <path d="M18 15 C18 15 24 11 25 6 C22 7 18 11 18 15Z" fill={color} opacity="0.65"/>
      </svg>
    )
  }

  // generic commodity
  const { fg } = CLASS_COLOR.commodity
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
      <circle cx="18" cy="18" r="17" fill={`${fg}22`} stroke={`${fg}55`} strokeWidth="1"/>
      <circle cx="18" cy="18" r="9" fill={fg} opacity="0.8"/>
    </svg>
  )
}

// ─── Flag icon (single currency flag) ─────────────────────────────────────────
function FlagImg({ code, size }: { code: string; size: number }) {
  const [err, setErr] = useState(false)
  if (err) {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(255,255,255,0.08)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, color: '#60a5fa',
      }}>
        {code.slice(0, 2).toUpperCase()}
      </div>
    )
  }
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={code}
      onError={() => setErr(true)}
      style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }}
    />
  )
}

// ─── Forex pair: two overlapping flags ────────────────────────────────────────
function ForexIcon({ symbol, baseAsset, quoteAsset, size }: {
  symbol: string; baseAsset?: string; quoteAsset?: string; size: number
}) {
  const base  = baseAsset  ?? symbol.slice(0, 3)
  const quote = quoteAsset ?? symbol.slice(3, 6)
  const baseFlag  = CURRENCY_FLAG[base]
  const quoteFlag = CURRENCY_FLAG[quote]
  const mini = Math.round(size * 0.65)

  if (!baseFlag && !quoteFlag) {
    const { bg, fg } = CLASS_COLOR.forex
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%', background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.28, fontWeight: 800, color: fg, letterSpacing: -0.5,
      }}>
        {base.slice(0, 2)}
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: size + mini * 0.35, height: size, flexShrink: 0 }}>
      {/* back flag (quote currency) */}
      <div style={{
        position: 'absolute', right: 0, top: size - mini,
        width: mini, height: mini, borderRadius: '50%',
        border: '1.5px solid rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        {quoteFlag
          ? <img src={`https://flagcdn.com/w40/${quoteFlag}.png`} alt={quote} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: '#334', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: mini * 0.38, fontWeight: 700, color: '#aaa' }}>{quote.slice(0, 2)}</div>
        }
      </div>
      {/* front flag (base currency) */}
      <div style={{
        position: 'absolute', left: 0, top: 0,
        width: size, height: size, borderRadius: '50%',
        border: '1.5px solid rgba(0,0,0,0.5)', overflow: 'hidden',
      }}>
        {baseFlag
          ? <img src={`https://flagcdn.com/w40/${baseFlag}.png`} alt={base} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', background: '#334', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 700, color: '#aaa' }}>{base.slice(0, 2)}</div>
        }
      </div>
    </div>
  )
}

// ─── Initials fallback ────────────────────────────────────────────────────────
function InitialsFallback({ symbol, assetClass, size }: { symbol: string; assetClass: string; size: number }) {
  const { bg, fg } = CLASS_COLOR[assetClass] ?? CLASS_COLOR.stock
  const label = symbol.length <= 4 ? symbol.slice(0, 3) : symbol.slice(0, 2)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: bg, border: `1.5px solid ${fg}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.3, fontWeight: 800, color: fg,
    }}>
      {label}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetIcon({ symbol, assetClass, baseAsset, quoteAsset, size = 36 }: AssetIconProps) {
  const [imgErr, setImgErr] = useState(false)

  // ── Crypto ──
  if (assetClass === 'crypto') {
    const id = CRYPTO_ID[symbol]
    if (id && !imgErr) {
      return (
        <img
          src={`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${id}.svg`}
          alt={symbol}
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0 }}
        />
      )
    }
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Stock ──
  if (assetClass === 'stock') {
    const domain = STOCK_DOMAIN[symbol]
    if (domain && !imgErr) {
      return (
        <img
          src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
          alt={symbol}
          loading="lazy"
          onError={() => setImgErr(true)}
          style={{ width: size, height: size, borderRadius: '50%', objectFit: 'contain', flexShrink: 0, background: '#fff' }}
        />
      )
    }
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Forex ──
  if (assetClass === 'forex') {
    return (
      <ForexIcon
        symbol={symbol}
        baseAsset={baseAsset}
        quoteAsset={quoteAsset}
        size={size}
      />
    )
  }

  // ── Commodity ──
  if (assetClass === 'commodity') {
    return <CommodityIcon symbol={symbol} size={size} />
  }

  // ── Index ──
  if (assetClass === 'index') {
    const flagCode = INDEX_FLAG[symbol]
    if (flagCode) {
      return (
        <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1.5px solid rgba(255,255,255,0.1)' }}>
          <img
            src={`https://flagcdn.com/w40/${flagCode}.png`}
            alt={symbol}
            onError={() => setImgErr(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )
    }
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Bond / fallback ──
  return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
}
