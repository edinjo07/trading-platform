import api from './client'

export interface AdminOverview {
  users: number; newUsers7d: number
  realBalance: number; demoBalance: number
  openPositions: number; exposure: number; trades: number
  kycPending: number; kycVerified: number
  pendingWithdrawals: number; pendingWithdrawAmount: number
}
export interface AdminUser {
  id: string; email: string; username: string
  created_at: string; last_sign_in_at: string | null
  real: number | null; demo: number | null
}
export interface AdminTx {
  id: string; user_id: string; email: string; type: 'deposit' | 'withdrawal'
  amount: number; currency: string; method: string | null; status: string
  details: Record<string, unknown> | null; created_at: string; reviewed_at: string | null
}
export interface AdminKyc {
  user_id: string; email: string; username: string; status: string
  id_type: string | null; id_doc_name: string | null; id_status: string
  poa_type: string | null; poa_doc_name: string | null; poa_status: string
  reject_reason: string | null; submitted_at: string | null; reviewed_at: string | null
}

export interface AdminPosition {
  id: string; user_id: string; email: string; mode: string; symbol: string
  side: 'long' | 'short'; quantity: number; avg_price: number; leverage: number
  margin: number; take_profit: number | null; stop_loss: number | null; opened_at: string
}
export interface AdminOrder {
  id: string; user_id: string; email: string; mode: string; symbol: string
  side: 'buy' | 'sell'; type: string; status: string; quantity: number
  fill_price: number | null; leverage: number; take_profit: number | null
  stop_loss: number | null; created_at: string
}

export const adminCheck      = () => api.get<{ ok: boolean }>('/admin/check').then(r => r.data.ok).catch(() => false)
export const getTrades       = (userId?: string) =>
  api.get<{ positions: AdminPosition[]; orders: AdminOrder[] }>('/admin/trades', { params: userId ? { userId } : {} }).then(r => r.data)
export const patchPosition   = (id: string, patch: Partial<AdminPosition>) => api.patch(`/admin/positions/${id}`, patch).then(r => r.data)
export const patchOrder      = (id: string, patch: Partial<AdminOrder>) => api.patch(`/admin/orders/${id}`, patch).then(r => r.data)
export const getOverview     = () => api.get<AdminOverview>('/admin/overview').then(r => r.data)
export const getUsers        = () => api.get<AdminUser[]>('/admin/users').then(r => r.data)
export const getUserDetail   = (id: string) => api.get(`/admin/users/${id}`).then(r => r.data)
export const setBalance      = (id: string, mode: 'demo' | 'real', op: 'set' | 'add', amount: number) =>
  api.post(`/admin/users/${id}/balance`, { mode, op, amount }).then(r => r.data)
export const getTransactions = (params?: { status?: string; type?: string }) =>
  api.get<{ rows: AdminTx[]; migrated: boolean }>('/admin/transactions', { params }).then(r => r.data)
export const reviewTx        = (id: string, action: 'approve' | 'reject') =>
  api.post(`/admin/transactions/${id}/${action}`).then(r => r.data)
export const getKyc          = () => api.get<{ rows: AdminKyc[]; migrated: boolean }>('/admin/kyc').then(r => r.data)
export const reviewKyc       = (userId: string, action: 'approve' | 'reject', reason?: string) =>
  api.post(`/admin/kyc/${userId}/${action}`, { reason }).then(r => r.data)
