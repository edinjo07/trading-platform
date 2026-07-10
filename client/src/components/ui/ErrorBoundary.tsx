import React from 'react'

interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; fallback?: React.ReactNode }, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex items-center justify-center h-full w-full min-h-[200px]"
          style={{ background: 'var(--t-bg)' }}>
          <div className="text-center px-6">
            <div style={{ width: 44, height: 44, borderRadius: 12, margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--t-warn-s)', color: 'var(--t-warn)' }}>
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <p className="text-text-muted text-sm font-mono">Something went wrong loading this panel.</p>
            <button
              className="mt-4 px-4 py-1.5 rounded text-xs font-semibold"
              style={{ background: 'rgba(79,140,255,0.15)', color: '#7aa7ff', border: '1px solid rgba(79,140,255,0.3)' }}
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
