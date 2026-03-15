import React from 'react'
import { useToastStore, Toast, ToastVariant } from '../../store/toastStore'

const variantStyles: Record<ToastVariant, { bar: string; icon: string; iconPath: string }> = {
  success: {
    bar: 'bg-bull',
    icon: 'text-bull',
    iconPath: 'M5 13l4 4L19 7',
  },
  error: {
    bar: 'bg-bear',
    icon: 'text-bear',
    iconPath: 'M6 18L18 6M6 6l12 12',
  },
  warning: {
    bar: 'bg-amber-400',
    icon: 'text-amber-400',
    iconPath: 'M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z',
  },
  info: {
    bar: 'bg-brand-400',
    icon: 'text-brand-300',
    iconPath: 'M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z',
  },
}

function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore()
  const s = variantStyles[toast.variant]

  return (
    <div className="relative flex items-start gap-3 w-80 rounded-lg shadow-2xl overflow-hidden p-4 animate-slideIn" style={{ background:'#10192b', border:'1px solid rgba(255,255,255,0.08)' }}>
      {/* Color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />
      {/* Icon */}
      <div className={`mt-0.5 flex-shrink-0 ${s.icon}`}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={s.iconPath} />
        </svg>
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0 pl-1">
        <p className="text-sm font-semibold text-text-primary">{toast.title}</p>
        {toast.message && <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{toast.message}</p>}
      </div>
      {/* Close */}
      <button
        onClick={() => removeToast(toast.id)}
        className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors mt-0.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const { toasts } = useToastStore()
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => <ToastItem key={t.id} toast={t} />)}
    </div>
  )
}
