import React from 'react'

/**
 * TradeX brand mark — "The X is the crossing."
 *
 * Two chart lines cross to form the X:
 *   - the SIGNAL line rises in Signal Blue (#4f8cff)
 *   - the NOISE line falls in muted slate
 * Everything decisive in a market happens at a crossing — two moving averages,
 * price and a level, signal and noise. The mark is that moment.
 *
 * Motto: "Trade the signal. Not the noise."
 */

export function BrandMark({ size = 32, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3)
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: 'linear-gradient(135deg, #16203a 0%, #0b0f1a 100%)',
        border: '1px solid rgba(122,167,255,0.28)',
        boxShadow: '0 0 18px rgba(79,140,255,0.22), inset 0 1px 0 rgba(233,238,248,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none">
        {/* noise line — falling, muted */}
        <path d="M3 5l5.5 6.5L12 12l4.5 4L21 19" stroke="#5f6d85" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
        {/* signal line — rising, Signal Blue */}
        <path d="M3 19l5-4.5L12 12l4-4.5L21 5" stroke="#4f8cff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        {/* the crossing */}
        <circle cx="12" cy="12" r="2.1" fill="#e9eef8" />
      </svg>
    </div>
  )
}

export function BrandLogo({
  size = 32, wordmark = true, tagline = false, pro = true,
}: { size?: number; wordmark?: boolean; tagline?: boolean; pro?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.34), minWidth: 0 }}>
      <BrandMark size={size} />
      {wordmark && (
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: size * 0.5, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.15, whiteSpace: 'nowrap' }}>
            <span style={{ color: 'var(--t-text-1, #e9eef8)' }}>Trade</span>
            <span style={{ color: '#4f8cff' }}>X</span>
            {pro && <span style={{ color: 'var(--t-text-3, #5f6d85)', fontWeight: 700 }}> Pro</span>}
          </div>
          {tagline && (
            <div style={{ fontSize: Math.max(10, size * 0.28), color: 'var(--t-text-3, #5f6d85)', letterSpacing: '0.01em', marginTop: 2, whiteSpace: 'nowrap' }}>
              Trade the signal. Not the noise.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
