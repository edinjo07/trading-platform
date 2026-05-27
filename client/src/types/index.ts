// ─── Primitive types ──────────────────────────────────────────────────────────
export type AssetClass   = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'bond'
export type AccountMode  = 'real' | 'demo'
export type Currency     = 'USD' | 'EUR' | 'GBP'
export type AccountType  = 'raw_spread' | 'ctrader' | 'standard'
export type OrderSide    = 'buy' | 'sell'
export type PositionSide = 'long' | 'short'
export type MarketSession = 'pre' | 'regular' | 'post' | 'closed'
// Kept for backward compat with order-form and TV integration
export type OrderType   = 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop'
export type OrderStatus = 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected'
export type TimeInForce = 'GTC' | 'IOC' | 'FOK' | 'DAY'

// User profile (from auth store)
export interface User {
  id:           string
  email:        string
  username:     string
  accountMode:  AccountMode
  currency:     Currency
  balance?:     number
  accountType?: AccountType
}

// Equity curve point (used by AnalyticsPage)
export interface EquityPoint {
  time:          string
  equity:        number
  cashBalance:   number
  unrealizedPnl: number
}

// ─── Market symbol ────────────────────────────────────────────────────────────
export interface MarketSymbol {
  symbol:     string
  name:       string
  assetClass: AssetClass
  baseAsset:  string
  quoteAsset: string
}

// ─── Market data (unchanged — driven by existing mock/real data service) ─────
export interface Candle {
  time:   number
  open:   number
  high:   number
  low:    number
  close:  number
  volume: number
}

export interface Ticker {
  symbol:        string
  price:         number
  change:        number
  changePercent: number
  high24h:       number
  low24h:        number
  volume24h:     number
  timestamp:     number
  bid?:          number
  ask?:          number
  spread?:       number
  isOpen?:       boolean
  session?:      MarketSession
}

export interface OrderBookEntry {
  price: number
  size:  number
  total: number
}

export interface OrderBook {
  symbol:   string
  bids:     OrderBookEntry[]
  asks:     OrderBookEntry[]
  timestamp: number
  spread?:  number
  midPrice?: number
}

export interface Trade {
  id:        string
  symbol:    string
  price:     number
  size:      number
  side:      OrderSide
  timestamp: number
}

// ─── Position (snake_case from DB + camelCase computed live fields) ───────────
export interface Position {
  // DB fields (snake_case — mirrors Supabase column names)
  id:          string
  user_id:     string
  mode:        AccountMode
  symbol:      string
  side:        PositionSide
  quantity:    number
  avg_price:   number
  leverage:    number
  margin:      number
  take_profit: number | null
  stop_loss:   number | null
  opened_at:   string
  updated_at:  string
  // Computed live (camelCase — added by the server on every GET)
  currentPrice:     number
  unrealizedPnl:    number
  unrealizedPnlPct: number
  notionalValue:    number
  liquidationPrice: number
}

// ─── Portfolio ────────────────────────────────────────────────────────────────
export interface Portfolio {
  cashBalance:   number
  totalMargin:   number
  totalEquity:   number
  unrealizedPnl: number
  realizedPnl:   number
  positions:     Position[]
  updatedAt:     string
}

// ─── Order (raw DB row from GET /orders) ──────────────────────────────────────
export interface Order {
  id:          string
  user_id:     string
  mode:        AccountMode
  symbol:      string
  side:        OrderSide
  type:        'market'
  status:      'filled' | 'rejected'
  quantity:    number
  fill_price:  number
  commission:  number
  leverage:    number
  take_profit: number | null
  stop_loss:   number | null
  created_at:  string
  // camelCase aliases for backward-compat with existing pages
  avgFillPrice?:  number
  filledQuantity?: number
  createdAt?:     string
  updatedAt?:     string
  filledAt?:      string
  price?:         number
  stopPrice?:     number
  timeInForce?:   TimeInForce
}

// ─── Closed trade record (from GET /analytics/trades) ────────────────────────
export interface TradeRecord {
  id:          string
  user_id:     string
  mode:        AccountMode
  symbol:      string
  side:        PositionSide
  quantity:    number
  entry_price: number
  exit_price:  number
  leverage:    number
  pnl:         number
  commission:  number
  net_pnl:     number
  opened_at:   string
  closed_at:   string
  // camelCase aliases for backward-compat with existing pages
  entryPrice?:       number
  exitPrice?:        number
  netPnl?:           number
  closedAt?:         string
  openedAt?:         string
  orderId?:          string
  assetClass?:       AssetClass
  pnlPercent?:       number
  holdingPeriodMs?:  number
}

// ─── Performance stats (from GET /analytics/stats) ───────────────────────────
export interface PerformanceStats {
  totalTrades:     number
  winningTrades:   number
  losingTrades:    number
  winRate:         number
  totalNetPnl:     number
  totalCommission: number
  grossProfit:     number
  grossLoss:       number
  avgWin:          number
  avgLoss:         number
  bestTrade:       number
  worstTrade:      number
  // Optional legacy fields (may not be returned by new API)
  netProfit?:          number
  totalGrossPnl?:      number
  totalCommissions?:   number
  expectancy?:         number
  profitFactor?:       number
  maxDrawdown?:        number
  maxDrawdownPercent?: number
  sharpeRatio?:        number
  totalReturn?:        number
  avgHoldingPeriodMs?: number
  totalVolume?:        number
  startingBalance?:    number
  currentEquity?:      number
  userId?:             string
  equityCurve?:        EquityPoint[]
}
