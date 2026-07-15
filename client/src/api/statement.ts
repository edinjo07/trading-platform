import api from './client'

export interface StmtOpenPosition {
  opened_at: string; id: string; symbol: string; side: 'long' | 'short'
  quantity: number; open_price: number; current_price: number
  stop_loss: number | null; take_profit: number | null
  leverage: number; notional: number; unrealised_pnl: number
}
export interface StmtClosedPosition {
  opened_at: string; closed_at: string; id: string; symbol: string; side: 'long' | 'short'
  quantity: number; open_price: number; close_price: number
  leverage: number; notional: number; realised_pnl: number; commission: number
}
export interface StmtLedgerRow {
  time: string; id: string; description: string; type: string; amount: number; balance: number
}
export interface StatementData {
  client: { name: string; email: string; accountNumber: string; accountType: string; currency: string }
  period: { from: string; to: string; generated: string }
  openSummary: { longCount: number; shortCount: number; longNotional: number; shortNotional: number }
  summary: {
    openingBalance: number; openingUnrealised: number; openingEquity: number
    deposits: number; realisedPnl: number; withdrawals: number; pendingWithdrawals: number
    closingBalance: number; closingUnrealised: number; closingEquity: number
  }
  openPositions: StmtOpenPosition[]
  closedPositions: StmtClosedPosition[]
  ledger: StmtLedgerRow[]
}

/** Fetch a real-account trading statement for a date range (YYYY-MM-DD). */
export const getStatement = (from: string, to: string) =>
  api.get<StatementData>('/statement', { params: { from, to } }).then(r => r.data)
