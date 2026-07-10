import React from 'react'

/**
 * TradeX brand mark — "The X is the apex."
 *
 * An F1 car is fast, built by the best engineers, and exists to win.
 * In racing, everything is decided at the apex — the one point in a corner
 * where the racing line touches the geometry and maximum speed meets total
 * control. The X in TradeX is that moment:
 *
 *   - the RACING LINE sweeps through in Signal Blue (the driver's line)
 *   - the GEOMETRIC LINE cuts across in slate (the track, the market)
 *   - the APEX POINT where they meet is marked in Victory Gold
 *
 * Motto: "Engineered to win."
 */

export function BrandMark({ size = 32, radius }: { size?: number; radius?: number }) {
  const r = radius ?? Math.round(size * 0.3)
  return (
    <div
      aria-hidden
      style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        background: 'linear-gradient(135deg, #2a2338 0%, #14121a 100%)',
        border: '1px solid rgba(122,167,255,0.28)',
        boxShadow: '0 0 18px rgba(79,140,255,0.22), inset 0 1px 0 rgba(233,238,248,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 24 24" fill="none">
        {/* speed trails */}
        <path d="M1.5 7.5h3.2M1 12h2.6M1.5 16.5h3.2" stroke="#5f6d85" strokeWidth="1.5" strokeLinecap="round" opacity="0.55" />
        {/* geometric line — the track, falling */}
        <path d="M8.5 5.5L21 18.5" stroke="#5f6d85" strokeWidth="2.1" strokeLinecap="round" />
        {/* racing line — the driver's line, sweeping up through the apex */}
        <path d="M8.5 18.5C12 16.5 13.5 13.5 15 11S18.5 6.5 21 5.5" stroke="#4f8cff" strokeWidth="2.4" strokeLinecap="round" />
        {/* the apex — victory gold */}
        <circle cx="14.6" cy="12" r="2" fill="#f6c453" />
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
            <div style={{ fontSize: Math.max(10, size * 0.28), color: 'var(--t-text-3, #5f6d85)', letterSpacing: '0.04em', marginTop: 2, whiteSpace: 'nowrap', textTransform: 'uppercase', fontWeight: 600 }}>
              Engineered to win
            </div>
          )}
        </div>
      )}
    </div>
  )
}
