import { create } from 'zustand'
import { listAlerts, createAlert, dismissAlertApi, deleteAlertApi } from '../api/alerts'

export type AlertCondition = 'above' | 'below'
export type AlertStatus = 'active' | 'triggered' | 'dismissed'

export interface PriceAlert {
  id: string
  symbol: string
  condition: AlertCondition
  targetPrice: number
  currentPrice?: number
  status: AlertStatus
  note: string
  createdAt: string
  triggeredAt?: string
}

interface AlertsState {
  alerts: PriceAlert[]
  loaded: boolean
  fetchAlerts: () => Promise<void>
  addAlert: (input: { symbol: string; condition: AlertCondition; targetPrice: number; note: string; currentPrice?: number }) => Promise<void>
  dismissAlert: (id: string) => void
  deleteAlert: (id: string) => void
  // Kept for API compatibility with tradingStore. Alerts are now evaluated
  // server-side (see server/services/alertMonitor.ts), so this never triggers.
  checkAlerts: (tickers: Record<string, { price: number }>) => PriceAlert[]
}

export const useAlertsStore = create<AlertsState>()((set) => ({
  alerts: [],
  loaded: false,

  fetchAlerts: async () => {
    try {
      const alerts = await listAlerts()
      set({ alerts, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  addAlert: async (input) => {
    const alert = await createAlert({
      symbol: input.symbol, condition: input.condition,
      targetPrice: input.targetPrice, note: input.note ?? '',
    })
    set(s => ({ alerts: [alert, ...s.alerts] }))
  },

  dismissAlert: (id) => {
    set(s => ({ alerts: s.alerts.map(a => a.id === id ? { ...a, status: 'dismissed' } : a) }))
    dismissAlertApi(id).catch(() => {})
  },

  deleteAlert: (id) => {
    set(s => ({ alerts: s.alerts.filter(a => a.id !== id) }))
    deleteAlertApi(id).catch(() => {})
  },

  checkAlerts: () => [],
}))
