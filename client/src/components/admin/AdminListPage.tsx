import React, { useState, useMemo } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────────
export type ColumnDef<T> = {
  key: keyof T | string
  header: string
  width?: string
  render?: (row: T) => React.ReactNode
}

export interface AdminListPageProps<T extends Record<string, unknown>> {
  title: string
  subtitle?: string
  columns: ColumnDef<T>[]
  data: T[]
  actions?: React.ReactNode
  filters?: React.ReactNode
  onRowClick?: (row: T) => void
  rowKey: (row: T) => string
  emptyMessage?: string
}

// ─── Status badge helper ───────────────────────────────────────────────────────
export function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ color, background: bg }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: color }} />
      {label}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, { color: string; bg: string }> = {
    active:     { color: '#00c878', bg: 'rgba(0,200,120,0.1)' },
    inactive:   { color: '#6b8099', bg: 'rgba(107,128,153,0.1)' },
    pending:    { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    completed:  { color: '#00c878', bg: 'rgba(0,200,120,0.1)' },
    failed:     { color: '#ff3047', bg: 'rgba(255,48,71,0.1)' },
    open:       { color: '#38bdf8', bg: 'rgba(56,189,248,0.1)' },
    closed:     { color: '#6b8099', bg: 'rgba(107,128,153,0.1)' },
    approved:   { color: '#00c878', bg: 'rgba(0,200,120,0.1)' },
    rejected:   { color: '#ff3047', bg: 'rgba(255,48,71,0.1)' },
    live:       { color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
    archived:   { color: '#6b8099', bg: 'rgba(107,128,153,0.1)' },
    verified:   { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
    unverified: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    enabled:    { color: '#00c878', bg: 'rgba(0,200,120,0.1)' },
    disabled:   { color: '#ff3047', bg: 'rgba(255,48,71,0.1)' },
  }
  const s = map[status.toLowerCase()] ?? { color: '#6b8099', bg: 'rgba(107,128,153,0.1)' }
  return <Badge label={status} color={s.color} bg={s.bg} />
}

// ─── Pagination ────────────────────────────────────────────────────────────────
function Pagination({
  page, total, perPage, onChange,
}: { page: number; total: number; perPage: number; onChange: (p: number) => void }) {
  const pages = Math.ceil(total / perPage)
  if (pages <= 1) return null

  const visible: (number | '...')[] = []
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || (i >= page - 1 && i <= page + 1)) {
      visible.push(i)
    } else if (visible[visible.length - 1] !== '...') {
      visible.push('...')
    }
  }

  return (
    <div className="flex items-center gap-1.5 px-5 py-3" style={{ borderTop: '1px solid rgba(56,189,248,0.06)' }}>
      <button
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="px-2.5 py-1 rounded text-xs text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors"
        style={{ border: '1px solid rgba(56,189,248,0.1)' }}
      >
        ‹
      </button>
      {visible.map((v, i) =>
        v === '...' ? (
          <span key={i} className="px-2 text-xs text-text-muted">…</span>
        ) : (
          <button
            key={i}
            onClick={() => onChange(v as number)}
            className="px-2.5 py-1 rounded text-xs font-mono transition-all"
            style={{
              background: v === page ? 'rgba(14,165,233,0.15)' : 'transparent',
              color: v === page ? '#38bdf8' : '#6b8099',
              border: `1px solid ${v === page ? 'rgba(56,189,248,0.25)' : 'rgba(56,189,248,0.08)'}`,
            }}
          >
            {v}
          </button>
        )
      )}
      <button
        disabled={page === pages}
        onClick={() => onChange(page + 1)}
        className="px-2.5 py-1 rounded text-xs text-text-secondary disabled:opacity-30 hover:text-text-primary transition-colors"
        style={{ border: '1px solid rgba(56,189,248,0.1)' }}
      >
        ›
      </button>
      <span className="ml-auto text-2xs text-text-muted font-mono" style={{ fontSize: '10px' }}>
        {total.toLocaleString()} total records
      </span>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
const PER_PAGE = 12

export default function AdminListPage<T extends Record<string, unknown>>({
  title,
  subtitle,
  columns,
  data,
  actions,
  filters,
  onRowClick,
  rowKey,
  emptyMessage = 'No records found',
}: AdminListPageProps<T>) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const filtered = useMemo(() => {
    let d = data
    if (search.trim()) {
      const q = search.toLowerCase()
      d = d.filter(row =>
        Object.values(row).some(v => String(v).toLowerCase().includes(q))
      )
    }
    if (sortKey) {
      d = [...d].sort((a, b) => {
        const av = String(a[sortKey] ?? '')
        const bv = String(b[sortKey] ?? '')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      })
    }
    return d
  }, [data, search, sortKey, sortDir])

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-text-primary">{title}</h1>
          {subtitle && <p className="text-xs text-text-secondary mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#0c1220', border: '1px solid rgba(56,189,248,0.08)' }}>
        {/* Toolbar */}
        <div
          className="flex flex-wrap items-center gap-3 px-5 py-3"
          style={{ borderBottom: '1px solid rgba(56,189,248,0.07)' }}
        >
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-[200px]" style={{
            background: 'rgba(14,165,233,0.05)',
            border: '1px solid rgba(56,189,248,0.1)',
            borderRadius: '8px',
            padding: '6px 12px',
          }}>
            <svg className="w-3.5 h-3.5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search..."
              className="flex-1 bg-transparent text-xs text-text-primary placeholder-text-muted focus:outline-none"
            />
          </div>

          {filters}

          {/* Export */}
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-text-primary transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.06)' }}>
                {columns.map(col => (
                  <th
                    key={String(col.key)}
                    className="text-left px-5 py-3 font-semibold uppercase tracking-wider cursor-pointer select-none transition-colors hover:text-text-primary text-text-muted"
                    style={{ fontSize: '10px', width: col.width }}
                    onClick={() => handleSort(String(col.key))}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {sortKey === String(col.key) && (
                        <span className="text-brand-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </span>
                  </th>
                ))}
                <th className="px-5 py-3 text-right text-text-muted font-semibold uppercase tracking-wider" style={{ fontSize: '10px' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-5 py-12 text-center text-text-muted">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginated.map(row => (
                  <tr
                    key={rowKey(row)}
                    className="transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(56,189,248,0.04)' }}
                    onClick={() => onRowClick?.(row)}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(14,165,233,0.03)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                  >
                    {columns.map(col => (
                      <td key={String(col.key)} className="px-5 py-3 text-text-secondary">
                        {col.render
                          ? col.render(row)
                          : <span className="text-text-primary">{String(row[col.key as string] ?? '—')}</span>
                        }
                      </td>
                    ))}
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="p-1.5 rounded text-text-muted hover:text-brand-300 transition-colors"
                          style={{ background: 'rgba(14,165,233,0.05)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 rounded text-text-muted hover:text-warning transition-colors"
                          style={{ background: 'rgba(245,158,11,0.05)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="p-1.5 rounded text-text-muted hover:text-bear transition-colors"
                          style={{ background: 'rgba(255,48,71,0.05)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} total={filtered.length} perPage={PER_PAGE} onChange={setPage} />
      </div>
    </div>
  )
}
