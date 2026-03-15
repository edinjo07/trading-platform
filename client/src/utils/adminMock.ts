// Shared mock data generator for admin pages

export interface TradeRow {
  id: string; user: string; symbol: string; type: string; side: string
  lots: number; openPrice: number; closePrice: number; pnl: number
  status: string; openTime: string; closeTime: string
}

export interface DepositRow {
  id: string; user: string; email: string; amount: number; currency: string
  method: string; gateway: string; status: string; date: string; txRef: string
}

export interface WithdrawRow {
  id: string; user: string; email: string; amount: number; currency: string
  method: string; status: string; requestDate: string; processDate: string
}

export interface UserRow {
  id: string; username: string; email: string; country: string
  balance: number; status: string; registered: string; lastLogin: string; kyc: string
}

export interface LeadRow {
  id: string; name: string; email: string; phone: string; country: string
  source: string; assignedTo: string; status: string; created: string
}

export interface TradeAssetRow {
  symbol: string; name: string; spread: number; digits: number
  minLot: number; maxLot: number; stepLot: number; status: string; category: string
}

const USERS = ['john.doe', 'maria.k', 'alex.b', 'emma.watts', 'carlos.r', 'noah.lin', 'lisa.t', 'ben.cross', 'anne.m', 'oscar.p']
const EMAILS = USERS.map(u => `${u}@tradex.io`)
const COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'Australia', 'Canada', 'Singapore', 'UAE', 'South Africa']
const SYMBOLS = ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'BTC/USDT', 'ETH/USDT', 'AAPL', 'NVDA', 'XAUUSD', 'OIL']
const METHODS = ['Bank Wire', 'Credit Card', 'Crypto', 'Skrill', 'Neteller', 'PayPal']
const SOURCES = ['Organic', 'Referral', 'Google Ads', 'Facebook', 'Affiliate', 'Email Campaign']
const STAFF = ['Sarah Johnson', 'Mike Chen', 'Anna Kovac', 'David Lee', 'Rita Patel']

function rand(min: number, max: number) { return Math.random() * (max - min) + min }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function fmt(d: Date) { return d.toISOString().split('T')[0] }
function id(prefix: string, n: number) { return `${prefix}-${String(n).padStart(5, '0')}` }

export function generateTrades(count = 80): TradeRow[] {
  return Array.from({ length: count }, (_, i) => {
    const open = rand(1000, 50000)
    const pnl = rand(-2000, 5000)
    const status = pick(['open', 'closed', 'cancelled'])
    return {
      id: id('TRD', i + 1),
      user: pick(USERS),
      symbol: pick(SYMBOLS),
      type: pick(['market', 'limit', 'stop']),
      side: pick(['buy', 'sell']),
      lots: Math.round(rand(0.01, 5) * 100) / 100,
      openPrice: Math.round(open * 100) / 100,
      closePrice: Math.round((open + rand(-200, 200)) * 100) / 100,
      pnl: Math.round(pnl * 100) / 100,
      status,
      openTime: fmt(new Date(Date.now() - rand(0, 30 * 86400000))),
      closeTime: status === 'closed' ? fmt(new Date(Date.now() - rand(0, 5 * 86400000))) : '—',
    }
  })
}

export function generateDeposits(count = 60): DepositRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: id('DEP', i + 1),
    user: pick(USERS),
    email: pick(EMAILS),
    amount: Math.round(rand(100, 100000) * 100) / 100,
    currency: pick(['USD', 'EUR', 'GBP', 'BTC', 'ETH']),
    method: pick(METHODS),
    gateway: pick(['Stripe', 'CoinGate', 'Skrill', 'Manual', 'Wire']),
    status: pick(['completed', 'pending', 'failed']),
    date: fmt(new Date(Date.now() - rand(0, 60 * 86400000))),
    txRef: `TX${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
  }))
}

export function generateWithdraws(count = 50): WithdrawRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: id('WDR', i + 1),
    user: pick(USERS),
    email: pick(EMAILS),
    amount: Math.round(rand(50, 50000) * 100) / 100,
    currency: pick(['USD', 'EUR', 'GBP', 'USDT']),
    method: pick(METHODS),
    status: pick(['completed', 'pending', 'failed', 'approved']),
    requestDate: fmt(new Date(Date.now() - rand(1, 30) * 86400000)),
    processDate: fmt(new Date(Date.now() - rand(0, 5) * 86400000)),
  }))
}

export function generateUsers(count = 70): UserRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: id('USR', i + 1),
    username: USERS[i % USERS.length] + `_${i}`,
    email: `user${i + 1}@tradex.io`,
    country: pick(COUNTRIES),
    balance: Math.round(rand(0, 200000) * 100) / 100,
    status: i % 7 === 0 ? 'inactive' : 'active',
    registered: fmt(new Date(Date.now() - rand(30, 730) * 86400000)),
    lastLogin: fmt(new Date(Date.now() - rand(0, 30) * 86400000)),
    kyc: pick(['verified', 'unverified', 'pending']),
  }))
}

export function generateLeads(count = 65): LeadRow[] {
  const names = ['James T.', 'Laura S.', 'Max K.', 'Priya N.', 'Tom H.', 'Sara B.', 'Lena F.', 'Chris W.']
  return Array.from({ length: count }, (_, i) => ({
    id: id('LDR', i + 1),
    name: pick(names),
    email: `lead${i + 1}@prospect.io`,
    phone: `+1 ${Math.floor(rand(2000000000, 9999999999))}`,
    country: pick(COUNTRIES),
    source: pick(SOURCES),
    assignedTo: pick(STAFF),
    status: pick(['live', 'pending', 'archived', 'completed']),
    created: fmt(new Date(Date.now() - rand(0, 90) * 86400000)),
  }))
}

export function generateTradeAssets(category: string, count = 20): TradeAssetRow[] {
  const assetSets: Record<string, string[]> = {
    forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'USD/CHF'],
    commodities: ['XAUUSD', 'XAGUSD', 'OIL', 'NGAS', 'WHEAT', 'CORN', 'COFFEE', 'SUGAR'],
    index: ['SP500', 'NASDAQ', 'DJI', 'FTSE100', 'DAX40', 'CAC40', 'NIKKEI', 'ASX200'],
    crypto: ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'ADA/USDT', 'DOT/USDT', 'LINK/USDT', 'MATIC/USDT'],
    stock: ['AAPL', 'NVDA', 'TSLA', 'AMZN', 'MSFT', 'META', 'GOOGL', 'NFLX'],
  }
  const syms = assetSets[category] ?? SYMBOLS
  return Array.from({ length: Math.min(count, syms.length) }, (_, i) => ({
    symbol: syms[i],
    name: syms[i],
    spread: Math.round(rand(0.1, 3) * 10) / 10,
    digits: pick([2, 3, 4, 5]),
    minLot: 0.01,
    maxLot: pick([100, 500, 1000]),
    stepLot: 0.01,
    status: i % 5 === 0 ? 'disabled' : 'enabled',
    category,
  }))
}
