import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  duration?: number   // ms, 0 = sticky
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = uuidv4()
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...toast, id }] }))  // keep last 5
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), duration)
    }
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}))
