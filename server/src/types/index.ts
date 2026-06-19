// ─── Account mode ─────────────────────────────────────────────────────────────
export type AccountMode = 'demo' | 'real'
export type Currency    = 'USD' | 'EUR' | 'GBP'
export type AccountType = 'raw_spread' | 'ctrader' | 'standard'

// ─── Trading primitives ────────────────────────────────────────────────────────
export type OrderSide    = 'buy' | 'sell'
export type PositionSide = 'long' | 'short'
export type AssetClass   = 'stock' | 'crypto' | 'forex' | 'commodity' | 'index' | 'bond'

// ─── DB row shapes (snake_case mirrors Supabase) ──────────────────────────────

export interface AccountRow {
  id:             string
  user_id:        string
  mode:           AccountMode
  currency:       Currency
  account_type:   AccountType
  account_number: number
  cash_balance:   number
  created_at:     string
  updated_at:     string
}

export interface PositionRow {
  id:          string
  user_id:     string
  mode:        AccountMode
  symbol:      string
  side:        PositionSide
  quantity:    number
  avg_price:   number
  leverage:    number
  margin:      number           // cash locked = notional / leverage
  take_profit: number | null
  stop_loss:   number | null
  opened_at:   string
  updated_at:  string
}

export interface OrderRow {
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
}

export interface TradeRow {
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
}

// ─── API response shapes (camelCase for the client) ──────────────────────────

export interface PositionLive extends PositionRow {
  currentPrice:      number
  unrealizedPnl:     number
  unrealizedPnlPct:  number
  notionalValue:     number
  liquidationPrice:  number
}

export interface Portfolio {
  accountNumber: number
  accountType:   AccountType
  cashBalance:   number
  totalMargin:   number
  unrealizedPnl: number
  totalEquity:   number
  realizedPnl:   number
  positions:     PositionLive[]
  updatedAt:     string
}

export interface PlaceOrderResult {
  id:         string
  positionId: string
  symbol:     string
  side:       OrderSide
  quantity:   number
  fillPrice:  number
  leverage:   number
  margin:     number
  commission: number
  totalCost:  number
  takeProfit: number | undefined
  stopLoss:   number | undefined
  createdAt:  string
}

export interface ClosePositionResult {
  tradeId:    string
  symbol:     string
  side:       PositionSide
  quantity:   number
  entryPrice: number
  exitPrice:  number
  pnl:        number
  commission: number
  netPnl:     number
  openedAt:   string
  closedAt:   string
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface JWTPayload {
  userId: string
  email:  string
}

// ─── Market data (used by mockDataService / markets route) ───────────────────

export interface Symbol {
  symbol:     string
  name:       string
  assetClass: AssetClass
  baseAsset:  string
  quoteAsset: string
}

export interface Candle {
  time:   number   // Unix timestamp (seconds)
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
  session?:      'pre' | 'regular' | 'post' | 'closed'
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
  spread:   number
  midPrice: number
}

// Keep 'Trade' name for backward compat with mockDataService
export interface Trade {
  id:        string
  symbol:    string
  price:     number
  size:      number
  side:      OrderSide
  timestamp: number
}
/** @deprecated use Trade */
export type MarketTrade = Trade
