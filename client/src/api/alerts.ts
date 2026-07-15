import api from './client'
import type { PriceAlert, AlertCondition } from '../store/alertsStore'

export const listAlerts = () =>
  api.get<{ alerts: PriceAlert[] }>('/alerts').then(r => r.data.alerts)

export const createAlert = (input: { symbol: string; condition: AlertCondition; targetPrice: number; note: string }) =>
  api.post<{ alert: PriceAlert }>('/alerts', input).then(r => r.data.alert)

export const dismissAlertApi = (id: string) =>
  api.patch(`/alerts/${id}/dismiss`).then(r => r.data)

export const deleteAlertApi = (id: string) =>
  api.delete(`/alerts/${id}`).then(r => r.data)
