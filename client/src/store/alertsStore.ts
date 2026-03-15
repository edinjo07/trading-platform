import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'status'>) => void
  dismissAlert: (id: string) => void
  deleteAlert: (id: string) => void
  checkAlerts: (tickers: Record<string, { price: number }>) => PriceAlert[]
}

export const useAlertsStore = create<AlertsState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (newAlert) => {
        const alert: PriceAlert = {
          ...newAlert,
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: new Date().toISOString(),
          status: 'active',
        }
        set(s => ({ alerts: [alert, ...s.alerts] }))
      },

      dismissAlert: (id) => {
        set(s => ({
          alerts: s.alerts.map(a => a.id === id ? { ...a, status: 'dismissed' } : a),
        }))
      },

      deleteAlert: (id) => {
        set(s => ({ alerts: s.alerts.filter(a => a.id !== id) }))
      },

      // Call this from useWebSocket or a polling effect; returns newly-triggered alerts
      checkAlerts: (tickers) => {
        const justTriggered: PriceAlert[] = []
        set(s => ({
          alerts: s.alerts.map(a => {
            if (a.status !== 'active') return a
            const ticker = tickers[a.symbol]
            if (!ticker) return a
            const price = ticker.price
            const hit =
              (a.condition === 'above' && price >= a.targetPrice) ||
              (a.condition === 'below' && price <= a.targetPrice)
            if (hit) {
              const triggered = { ...a, status: 'triggered' as AlertStatus, triggeredAt: new Date().toISOString(), currentPrice: price }
              justTriggered.push(triggered)
              return triggered
            }
            return { ...a, currentPrice: price }
          }),
        }))
        return justTriggered
      },
    }),
    { name: 'tradex-alerts' }
  )
)
