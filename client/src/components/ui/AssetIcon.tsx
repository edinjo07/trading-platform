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
  crypto:    { bg: '#f6b24a22', fg: '#f6b24a' },
  stock:     { bg: '#8b5cf622', fg: '#a78bfa' },
  forex:     { bg: '#3b82f622', fg: '#60a5fa' },
  commodity: { bg: '#f9731622', fg: '#fb923c' },
  index:     { bg: '#4f8cff22', fg: '#7aa7ff' },
  bond:      { bg: '#18c98a22', fg: '#34d399' },
}

/* ─── 3D coin treatment ─────────────────────────────────────────────────────────
   Every symbol renders as a dimensional token: light from above (top highlight),
   soft bottom shade inside, and a tight contact shadow lifting it off the page —
   the Tesla / Apple / BTC marks read like minted coins, not flat favicons.     */
const COIN_SHADOW =
  'inset 0 1.5px 1px rgba(255,255,255,0.22), inset 0 -2px 4px rgba(10,6,14,0.4), ' +
  '0 2px 5px rgba(10,6,14,0.45), 0 1px 1.5px rgba(10,6,14,0.5)'

function Coin({ size, children, bg }: { size: number; children: React.ReactNode; bg?: string }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: `linear-gradient(165deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.02) 40%, rgba(10,6,14,0.25) 100%), ${bg ?? 'var(--t-surface-3, #322c40)'}`,
      boxShadow: COIN_SHADOW,
      border: '1px solid rgba(255,255,255,0.09)',
      position: 'relative', overflow: 'hidden',
    }}>
      {children}
      {/* glass sheen across the upper arc */}
      <span aria-hidden style={{
        position: 'absolute', left: '8%', right: '8%', top: '5%', height: '42%',
        borderRadius: '50%',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.16), rgba(255,255,255,0))',
        pointerEvents: 'none',
      }} />
    </div>
  )
}

// ─── Commodity custom SVG icons ───────────────────────────────────────────────
function CommodityIcon({ symbol, size }: { symbol: string; size: number }) {
  const metals   = ['XAUUSD', 'GC25', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'COPPER']
  const energy   = ['WTI', 'BRENT', 'XBRUSD', 'NGAS', 'HO']
  const agri     = ['COCOA', 'COFFEE', 'CORN', 'COTTON', 'OJ', 'SOYBEAN', 'SUGAR', 'WHEAT', 'LUMBER']
  const inner = size * 0.82

  let art: React.ReactNode
  if (metals.includes(symbol)) {
    const isGold     = symbol === 'XAUUSD' || symbol === 'GC25'
    const isSilver   = symbol === 'XAGUSD'
    const isPlatinum = symbol === 'XPTUSD'
    const color = isGold ? '#f6c453' : isSilver ? '#b8c4d4' : isPlatinum ? '#e2e8f0' : '#e0a37a'
    art = (
      <svg width={inner} height={inner} viewBox="0 0 36 36" fill="none">
        <rect x="9" y="13" width="18" height="10" rx="3" fill={color} opacity="0.95"/>
        <rect x="12" y="11" width="12" height="3" rx="1.5" fill={color} opacity="0.75"/>
        <rect x="12" y="22" width="12" height="3" rx="1.5" fill={color} opacity="0.75"/>
        <line x1="14" y1="16" x2="14" y2="20" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
        <line x1="18" y1="16" x2="18" y2="20" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
        <line x1="22" y1="16" x2="22" y2="20" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5"/>
      </svg>
    )
  } else if (energy.includes(symbol)) {
    const color = symbol === 'NGAS' ? '#7aa7ff' : '#ec7a54'
    art = (
      <svg width={inner} height={inner} viewBox="0 0 36 36" fill="none">
        <path d="M18 8 C15 12 11 14 11 19 C11 23 14 26 18 26 C22 26 25 23 25 19 C25 14 21 12 18 8Z" fill={color} opacity="0.9"/>
        <path d="M18 13 C17 16 15 17 15 20 C15 22 16.5 23.5 18 23.5 C19.5 23.5 21 22 21 20 C21 17 19 16 18 13Z" fill="rgba(255,255,255,0.35)"/>
      </svg>
    )
  } else if (agri.includes(symbol)) {
    const color = '#4ade80'
    art = (
      <svg width={inner} height={inner} viewBox="0 0 36 36" fill="none">
        <path d="M18 27 L18 13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <path d="M18 18 C18 18 12 14 11 9 C14 9 18 13 18 18Z" fill={color} opacity="0.85"/>
        <path d="M18 15 C18 15 24 11 25 6 C22 7 18 11 18 15Z" fill={color} opacity="0.65"/>
      </svg>
    )
  } else {
    const { fg } = CLASS_COLOR.commodity
    art = (
      <svg width={inner} height={inner} viewBox="0 0 36 36" fill="none">
        <circle cx="18" cy="18" r="9" fill={fg} opacity="0.85"/>
      </svg>
    )
  }
  return <Coin size={size}>{art}</Coin>
}

// ─── Flag disc (single flag as a coin) ────────────────────────────────────────
function FlagCoin({ code, size, label }: { code?: string; size: number; label: string }) {
  const [err, setErr] = useState(false)
  return (
    <Coin size={size}>
      {code && !err ? (
        <img
          src={`https://flagcdn.com/w40/${code}.png`}
          alt={label}
          onError={() => setErr(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <span style={{ fontSize: size * 0.32, fontWeight: 800, color: '#7aa7ff' }}>{label.slice(0, 2)}</span>
      )}
    </Coin>
  )
}

// ─── Forex pair: two overlapping flag coins ───────────────────────────────────
function ForexIcon({ symbol, baseAsset, quoteAsset, size }: {
  symbol: string; baseAsset?: string; quoteAsset?: string; size: number
}) {
  const base  = baseAsset  ?? symbol.slice(0, 3)
  const quote = quoteAsset ?? symbol.slice(3, 6)
  const baseFlag  = CURRENCY_FLAG[base]
  const quoteFlag = CURRENCY_FLAG[quote]
  const mini = Math.round(size * 0.65)

  if (!baseFlag && !quoteFlag) {
    const { fg } = CLASS_COLOR.forex
    return (
      <Coin size={size}>
        <span style={{ fontSize: size * 0.28, fontWeight: 800, color: fg, letterSpacing: -0.5 }}>{base.slice(0, 2)}</span>
      </Coin>
    )
  }

  return (
    <div style={{ position: 'relative', width: size + mini * 0.35, height: size, flexShrink: 0 }}>
      {/* back coin (quote currency) */}
      <div style={{ position: 'absolute', right: 0, top: size - mini }}>
        <FlagCoin code={quoteFlag} size={mini} label={quote} />
      </div>
      {/* front coin (base currency) */}
      <div style={{ position: 'absolute', left: 0, top: 0 }}>
        <FlagCoin code={baseFlag} size={size} label={base} />
      </div>
    </div>
  )
}

// ─── Initials fallback ────────────────────────────────────────────────────────
function InitialsFallback({ symbol, assetClass, size }: { symbol: string; assetClass: string; size: number }) {
  const { bg, fg } = CLASS_COLOR[assetClass] ?? CLASS_COLOR.stock
  const label = symbol.length <= 4 ? symbol.slice(0, 3) : symbol.slice(0, 2)
  return (
    <Coin size={size} bg={bg}>
      <span style={{ fontSize: size * 0.3, fontWeight: 800, color: fg }}>{label}</span>
    </Coin>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function AssetIcon({ symbol, assetClass, baseAsset, quoteAsset, size = 36 }: AssetIconProps) {
  const [imgErr, setImgErr] = useState(false)

  // ── Crypto — real coin marks, minted ──
  if (assetClass === 'crypto') {
    const id = CRYPTO_ID[symbol]
    if (id && !imgErr) {
      return (
        <Coin size={size}>
          <img
            src={`https://cdn.jsdelivr.net/npm/cryptocurrency-icons@0.18.1/svg/color/${id}.svg`}
            alt={symbol}
            onError={() => setImgErr(true)}
            style={{ width: '86%', height: '86%', borderRadius: '50%' }}
          />
        </Coin>
      )
    }
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Stock — real brand logo on a lit white disc ──
  if (assetClass === 'stock') {
    const domain = STOCK_DOMAIN[symbol]
    if (domain && !imgErr) {
      return (
        <Coin size={size} bg="linear-gradient(180deg, #ffffff 0%, #e8e6ee 100%)">
          <img
            src={`https://icons.duckduckgo.com/ip3/${domain}.ico`}
            alt={symbol}
            loading="lazy"
            onError={() => setImgErr(true)}
            style={{ width: '62%', height: '62%', objectFit: 'contain' }}
          />
        </Coin>
      )
    }
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Forex — overlapping flag coins ──
  if (assetClass === 'forex') {
    return <ForexIcon symbol={symbol} baseAsset={baseAsset} quoteAsset={quoteAsset} size={size} />
  }

  // ── Commodity — minted material marks ──
  if (assetClass === 'commodity') {
    return <CommodityIcon symbol={symbol} size={size} />
  }

  // ── Index — country flag coin ──
  if (assetClass === 'index') {
    const flagCode = INDEX_FLAG[symbol]
    if (flagCode) return <FlagCoin code={flagCode} size={size} label={symbol} />
    return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
  }

  // ── Bond / fallback ──
  return <InitialsFallback symbol={symbol} assetClass={assetClass} size={size} />
}
