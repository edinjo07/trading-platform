import React from 'react'

// Espresso + gold, matching the rest of the platform
export const NIGHT  = '#121010'
export const NIGHT2 = '#1c1717'
export const PANEL  = '#171313'
export const IVORY  = '#f7f2e6'
export const BODY   = '#c9bcae'
export const DIM    = '#8d7d6a'
export const GOLD   = '#f2b84b'
export const GOLD_G = 'linear-gradient(120deg, #f9d98c 0%, #f2b84b 45%, #dd9c2f 100%)'
export const BULL   = '#18c98a'
export const BEAR   = '#ff5a72'
export const BLUE   = '#6f9dff'
export const HAIR   = 'rgba(242,184,75,0.1)'
export const MONO   = 'ui-monospace, "JetBrains Mono", monospace'

export const money = (n: number, ccy = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, maximumFractionDigits: 0 }).format(n || 0)
export const money2 = (n: number, ccy = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: ccy, minimumFractionDigits: 2 }).format(n || 0)
export const dateShort = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
export const dateTime = (s?: string | null) =>
  s ? new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: PANEL, border: `1px solid ${HAIR}`, borderRadius: 16, ...style }}>{children}</div>
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: IVORY, margin: 0, letterSpacing: '-0.02em' }}>{title}</h1>
        {sub && <p style={{ fontSize: 13, color: DIM, margin: '3px 0 0' }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

export function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <Card style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: DIM }}>{label}</div>
      <div style={{ fontFamily: MONO, fontSize: 24, fontWeight: 800, color: accent ?? IVORY, marginTop: 6, letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: DIM, marginTop: 3 }}>{sub}</div>}
    </Card>
  )
}

export function Pill({ text, tone }: { text: string; tone: 'good' | 'bad' | 'warn' | 'muted' }) {
  const c = tone === 'good' ? BULL : tone === 'bad' ? BEAR : tone === 'warn' ? GOLD : DIM
  const bg = tone === 'good' ? 'rgba(24,201,138,0.12)' : tone === 'bad' ? 'rgba(255,90,114,0.12)' : tone === 'warn' ? 'rgba(242,184,75,0.12)' : 'rgba(141,125,106,0.14)'
  return <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', color: c, background: bg, padding: '3px 9px', borderRadius: 999 }}>{text}</span>
}

export function GoldBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: disabled ? 'rgba(242,184,75,0.35)' : GOLD_G, color: '#221503', border: 'none',
      borderRadius: 9, fontSize: 12.5, fontWeight: 800, padding: '8px 16px', cursor: disabled ? 'not-allowed' : 'pointer',
    }}>{children}</button>
  )
}

export function GhostBtn({ children, onClick, tone }: { children: React.ReactNode; onClick?: () => void; tone?: 'bad' }) {
  const c = tone === 'bad' ? BEAR : BODY
  const b = tone === 'bad' ? 'rgba(255,90,114,0.3)' : HAIR
  return (
    <button onClick={onClick} style={{
      background: 'none', color: c, border: `1px solid ${b}`, borderRadius: 9,
      fontSize: 12.5, fontWeight: 700, padding: '8px 16px', cursor: 'pointer',
    }}>{children}</button>
  )
}

export function Empty({ title, sub }: { title: string; sub?: string }) {
  return (
    <Card style={{ padding: '48px 24px', textAlign: 'center' }}>
      <p style={{ fontSize: 15, fontWeight: 700, color: IVORY, margin: 0 }}>{title}</p>
      {sub && <p style={{ fontSize: 13, color: DIM, margin: '6px 0 0' }}>{sub}</p>}
    </Card>
  )
}

export function MigrationNote({ file }: { file: string }) {
  return (
    <Card style={{ padding: '16px 18px', borderColor: 'rgba(242,184,75,0.3)', background: 'rgba(242,184,75,0.06)', marginBottom: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>Table not set up yet</div>
      <div style={{ fontSize: 12.5, color: BODY, marginTop: 4, lineHeight: 1.6 }}>
        Run <code style={{ fontFamily: MONO, color: IVORY }}>{file}</code> in the Supabase SQL editor to enable this. Until then this list stays empty.
      </div>
    </Card>
  )
}
