import api from './client'

export type NotifSeverity = 'info' | 'success' | 'warning' | 'critical'

export interface AppNotification {
  id:         string
  type:       string
  severity:   NotifSeverity
  title:      string
  message:    string
  metadata:   Record<string, unknown>
  read:       boolean
  created_at: string
}

export const getNotifications = () =>
  api.get<{ notifications: AppNotification[]; unread: number }>('/notifications').then(r => r.data)

export const markNotifRead    = (id: string) => api.post(`/notifications/${id}/read`).then(r => r.data)
export const markAllNotifRead = ()           => api.post('/notifications/read-all').then(r => r.data)
export const deleteNotif      = (id: string) => api.delete(`/notifications/${id}`).then(r => r.data)
export const clearAllNotifs   = ()           => api.delete('/notifications').then(r => r.data)
