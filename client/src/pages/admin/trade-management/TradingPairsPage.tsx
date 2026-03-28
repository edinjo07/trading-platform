import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuthStore } from '../../../store/authStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type PairCategory = 'forex' | 'crypto' | 'stock' | 'commodity' | 'index'
type SpreadType   = 'fixed' | 'variable'

interface TradingPair {
  id:          string
  symbol:      string
  name:        string
  category:    PairCategory
  baseAsset:   string
  quoteAsset:  string
  spread:      number
  spreadType:  SpreadType
  commission:  number
  digits:      number
  tickSize:    number
  minLot:      number
  maxLot:      number
  stepLot:     number
  leverage:    number
  marginPct:   number
  swapLong:    number
  swapShort:   number
  enabled:     boolean
  description: string
  createdAt:   string
  updatedAt:   string
}

interface PairForm {
  symbol:      string
  name:        string
  category:    PairCategory
  baseAsset:   string
  quoteAsset:  string
  spread:      string
  spreadType:  SpreadType
  commission:  string
  digits:      string
  tickSize:    string
  minLot:      string
  maxLot:      string
  stepLot:     string
  leverage:    string
  swapLong:    string
  swapShort:   string
  description: string
}

const EMPTY_FORM: PairForm = {
  symbol: '', name: '', category: 'forex', baseAsset: '', quoteAsset: '',
  spread: '0', spreadType: 'fixed', commission: '0', digits: '5',
  tickSize: '0.00001', minLot: '0.01', maxLot: '100', stepLot: '0.01',
  leverage: '100', swapLong: '0', swapShort: '0', description: '',
}

const CATEGORY_COLORS: Record<PairCategory, string> = {
  forex:     'text-sky-400 bg-sky-400/10 border-sky-400/20',
  crypto:    'text-amber-400 bg-amber-400/10 border-amber-400/20',
  stock:     'text-violet-400 bg-violet-400/10 border-violet-400/20',
  commodity: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  index:     'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
}

const CATEGORY_TABS: { label: string; value: '' | PairCategory }[] = [
  { label: 'All',        value: '' },
  { label: 'Forex',      value: 'forex' },
  { label: 'Crypto',     value: 'crypto' },
  { label: 'Stocks',     value: 'stock' },
  { label: 'Commodities',value: 'commodity' },
  { label: 'Indices',    value: 'index' },
]

// ─── API helpers ──────────────────────────────────────────────────────────────

function useApiBase() {
  const { token } = useAuthStore()
  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }), [token])
  return headers
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: '#0c1220', borderColor: 'rgba(56,189,248,0.08)' }}>
      <p className="text-xs font-medium mb-1" style={{ color: '#6b8099' }}>{label}</p>
      <p className={`text-2xl font-bold ${color ?? 'text-text-primary'}`}>{value}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: '#6b8099' }}>{sub}</p>}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(6,9,15,0.85)', backdropFilter: 'blur(4px)' }}>
      <div
        className={`relative rounded-2xl border flex flex-col max-h-[90vh] ${wide ? 'w-full max-w-3xl' : 'w-full max-w-lg'}`}
        style={{ background: '#0c1220', borderColor: 'rgba(56,189,248,0.12)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(56,189,248,0.08)' }}>
          <h2 className="text-base font-bold text-text-primary">{title}</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}

// ─── Form Field ───────────────────────────────────────────────────────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: '#6b8099' }}>{label}</label>
      {children}
      {hint && <p className="text-xs mt-1" style={{ color: '#4a6075' }}>{hint}</p>}
    </div>
  )
}

const inputCls = `w-full rounded-lg px-3 py-2 text-sm text-text-primary border outline-none
  focus:border-info/60 transition-colors`
const inputStyle = { background: '#080d18', borderColor: 'rgba(56,189,248,0.12)' }

function Input({ value, onChange, type = 'text', placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <input
      type={type} value={value} placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      className={inputCls} style={inputStyle}
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { label: string; value: string }[]
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className={inputCls} style={inputStyle}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

// ─── Pair Form component ─────────────────────────────────────────────────────

function PairFormFields({ form, setForm }: {
  form: PairForm
  setForm: React.Dispatch<React.SetStateAction<PairForm>>
}) {
  const set = (k: keyof PairForm) => (v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="px-6 py-5 grid grid-cols-2 gap-4">
      {/* Row 1 */}
      <Field label="Symbol *" hint="e.g. EUR/USD, BTC/USDT">
        <Input value={form.symbol} onChange={set('symbol')} placeholder="EUR/USD" />
      </Field>
      <Field label="Name *">
        <Input value={form.name} onChange={set('name')} placeholder="Euro / US Dollar" />
      </Field>
      {/* Row 2 */}
      <Field label="Category *">
        <Select value={form.category} onChange={set('category')} options={[
          { label: 'Forex',       value: 'forex' },
          { label: 'Crypto',      value: 'crypto' },
          { label: 'Stock',       value: 'stock' },
          { label: 'Commodity',   value: 'commodity' },
          { label: 'Index',       value: 'index' },
        ]} />
      </Field>
      <Field label="Spread Type">
        <Select value={form.spreadType} onChange={set('spreadType')} options={[
          { label: 'Fixed',    value: 'fixed' },
          { label: 'Variable', value: 'variable' },
        ]} />
      </Field>
      {/* Row 3 */}
      <Field label="Base Asset *" hint="e.g. EUR, BTC, AAPL">
        <Input value={form.baseAsset} onChange={set('baseAsset')} placeholder="EUR" />
      </Field>
      <Field label="Quote Asset *" hint="e.g. USD, USDT">
        <Input value={form.quoteAsset} onChange={set('quoteAsset')} placeholder="USD" />
      </Field>
      {/* Row 4 */}
      <Field label="Spread" hint="Fixed spread in price units">
        <Input value={form.spread} onChange={set('spread')} type="number" placeholder="0.00010" />
      </Field>
      <Field label="Commission" hint="Per-lot commission">
        <Input value={form.commission} onChange={set('commission')} type="number" placeholder="0" />
      </Field>
      {/* Row 5 */}
      <Field label="Digits" hint="Decimal places for price">
        <Input value={form.digits} onChange={set('digits')} type="number" placeholder="5" />
      </Field>
      <Field label="Tick Size" hint="Minimum price increment">
        <Input value={form.tickSize} onChange={set('tickSize')} type="number" placeholder="0.00001" />
      </Field>
      {/* Row 6 */}
      <Field label="Min Lot">
        <Input value={form.minLot} onChange={set('minLot')} type="number" placeholder="0.01" />
      </Field>
      <Field label="Max Lot">
        <Input value={form.maxLot} onChange={set('maxLot')} type="number" placeholder="100" />
      </Field>
      {/* Row 7 */}
      <Field label="Lot Step">
        <Input value={form.stepLot} onChange={set('stepLot')} type="number" placeholder="0.01" />
      </Field>
      <Field label="Leverage" hint="e.g. 500 means 1:500">
        <Input value={form.leverage} onChange={set('leverage')} type="number" placeholder="100" />
      </Field>
      {/* Row 8 */}
      <Field label="Swap Long" hint="Overnight swap rate (long)">
        <Input value={form.swapLong} onChange={set('swapLong')} type="number" placeholder="-0.52" />
      </Field>
      <Field label="Swap Short" hint="Overnight swap rate (short)">
        <Input value={form.swapShort} onChange={set('swapShort')} type="number" placeholder="0.18" />
      </Field>
      {/* Description - full width */}
      <div className="col-span-2">
        <Field label="Description">
          <textarea
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={2} placeholder="Short description of this instrument..."
            className={`${inputCls} resize-none`} style={inputStyle}
          />
        </Field>
      </div>
    </div>
  )
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteModal({ pair, onConfirm, onCancel, loading }: {
  pair: TradingPair; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <Modal title="Delete Trading Pair" onClose={onCancel}>
      <div className="px-6 py-6 text-center">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(255,48,71,0.12)' }}>
          <svg className="w-7 h-7 text-bear" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
        </div>
        <p className="text-base font-semibold text-text-primary mb-1">Delete {pair.symbol}?</p>
        <p className="text-sm" style={{ color: '#6b8099' }}>
          This will permanently remove <span className="text-text-primary font-medium">{pair.name}</span> from the trading pairs list.
          Active trades on this pair will not be affected.
        </p>
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-text-secondary border transition-colors hover:text-text-primary"
            style={{ borderColor: 'rgba(56,189,248,0.12)', background: '#080d18' }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-opacity disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#ff3047,#c01030)' }}
          >
            {loading ? 'Deleting…' : 'Delete Pair'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TradingPairsPage() {
  const headers = useApiBase()

  const [pairs,      setPairs]      = useState<TradingPair[]>([])
  const [stats,      setStats]      = useState<{ total: number; enabled: number; disabled: number; byCategory: Record<string, number> } | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')

  const [activeTab,  setActiveTab]  = useState<'' | PairCategory>('')
  const [search,     setSearch]     = useState('')
  const [sortKey,    setSortKey]    = useState<keyof TradingPair>('symbol')
  const [sortDir,    setSortDir]    = useState<'asc' | 'desc'>('asc')
  const [page,       setPage]       = useState(1)
  const PAGE_SIZE = 15

  const [showAdd,    setShowAdd]    = useState(false)
  const [editPair,   setEditPair]   = useState<TradingPair | null>(null)
  const [deletePair, setDeletePair] = useState<TradingPair | null>(null)
  const [form,       setForm]       = useState<PairForm>(EMPTY_FORM)
  const [formErr,    setFormErr]    = useState('')

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [pairsRes, statsRes] = await Promise.all([
        fetch(`/api/admin/pairs${activeTab ? `?category=${activeTab}` : ''}`, { headers }),
        fetch('/api/admin/pairs/stats', { headers }),
      ])
      if (!pairsRes.ok) throw new Error('Failed to load pairs')
      setPairs(await pairsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (e: any) {
      // Fallback to empty - server may not be running
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [headers, activeTab])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Filtering / Sorting ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = pairs.filter(p =>
      !q || p.symbol.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) ||
      p.baseAsset.toLowerCase().includes(q) || p.quoteAsset.toLowerCase().includes(q)
    )
    list = [...list].sort((a, b) => {
      const av = String(a[sortKey] ?? '').toLowerCase()
      const bv = String(b[sortKey] ?? '').toLowerCase()
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
    return list
  }, [pairs, search, sortKey, sortDir])

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const handleSort  = (k: keyof TradingPair) => {
    if (k === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
    setPage(1)
  }

  // ── Toggle enabled ─────────────────────────────────────────────────────────
  const handleToggle = async (pair: TradingPair) => {
    try {
      const res = await fetch(`/api/admin/pairs/${pair.id}/toggle`, { method: 'PATCH', headers })
      if (!res.ok) return
      const updated: TradingPair = await res.json()
      setPairs(prev => prev.map(p => p.id === updated.id ? updated : p))
    } catch { /* ignore */ }
  }

  // ── Add form submit ────────────────────────────────────────────────────────
  const handleAdd = async () => {
    setFormErr('')
    if (!form.symbol.trim() || !form.name.trim() || !form.baseAsset.trim() || !form.quoteAsset.trim()) {
      setFormErr('Symbol, Name, Base Asset, and Quote Asset are required.')
      return
    }
    setSaving(true)
    try {
      const body = {
        symbol:      form.symbol.trim().toUpperCase(),
        name:        form.name.trim(),
        category:    form.category,
        baseAsset:   form.baseAsset.trim().toUpperCase(),
        quoteAsset:  form.quoteAsset.trim().toUpperCase(),
        spread:      parseFloat(form.spread)     || 0,
        spreadType:  form.spreadType,
        commission:  parseFloat(form.commission) || 0,
        digits:      parseInt(form.digits)       || 5,
        tickSize:    parseFloat(form.tickSize)   || 0.00001,
        minLot:      parseFloat(form.minLot)     || 0.01,
        maxLot:      parseFloat(form.maxLot)     || 100,
        stepLot:     parseFloat(form.stepLot)    || 0.01,
        leverage:    parseInt(form.leverage)     || 100,
        swapLong:    parseFloat(form.swapLong)   || 0,
        swapShort:   parseFloat(form.swapShort)  || 0,
        description: form.description.trim(),
      }
      const res = await fetch('/api/admin/pairs', { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? 'Failed to create pair'); return }
      setPairs(prev => [...prev, data])
      setStats(s => s ? { ...s, total: s.total + 1, enabled: s.enabled + 1, byCategory: { ...s.byCategory, [form.category]: (s.byCategory[form.category] ?? 0) + 1 } } : s)
      setShowAdd(false)
      setForm(EMPTY_FORM)
    } catch (e: any) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Edit form submit ───────────────────────────────────────────────────────
  const handleEdit = async () => {
    if (!editPair) return
    setFormErr('')
    if (!form.name.trim()) { setFormErr('Name is required.'); return }
    setSaving(true)
    try {
      const body = {
        name:        form.name.trim(),
        category:    form.category,
        spread:      parseFloat(form.spread)     || 0,
        spreadType:  form.spreadType,
        commission:  parseFloat(form.commission) || 0,
        digits:      parseInt(form.digits)       || 5,
        tickSize:    parseFloat(form.tickSize)   || 0.00001,
        minLot:      parseFloat(form.minLot)     || 0.01,
        maxLot:      parseFloat(form.maxLot)     || 100,
        stepLot:     parseFloat(form.stepLot)    || 0.01,
        leverage:    parseInt(form.leverage)     || 100,
        swapLong:    parseFloat(form.swapLong)   || 0,
        swapShort:   parseFloat(form.swapShort)  || 0,
        description: form.description.trim(),
      }
      const res  = await fetch(`/api/admin/pairs/${editPair.id}`, { method: 'PUT', headers, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) { setFormErr(data.error ?? 'Failed to update pair'); return }
      setPairs(prev => prev.map(p => p.id === data.id ? data : p))
      setEditPair(null)
    } catch (e: any) {
      setFormErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Delete confirm ─────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deletePair) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/pairs/${deletePair.id}`, { method: 'DELETE', headers })
      if (!res.ok) return
      setPairs(prev => prev.filter(p => p.id !== deletePair.id))
      setStats(s => s ? {
        ...s,
        total:       s.total - 1,
        enabled:     deletePair.enabled ? s.enabled - 1 : s.enabled,
        disabled:    !deletePair.enabled ? s.disabled - 1 : s.disabled,
        byCategory:  { ...s.byCategory, [deletePair.category]: Math.max(0, (s.byCategory[deletePair.category] ?? 1) - 1) },
      } : s)
      setDeletePair(null)
    } finally {
      setSaving(false)
    }
  }

  // ── Open edit modal ────────────────────────────────────────────────────────
  const openEdit = (p: TradingPair) => {
    setEditPair(p)
    setFormErr('')
    setForm({
      symbol:      p.symbol,
      name:        p.name,
      category:    p.category,
      baseAsset:   p.baseAsset,
      quoteAsset:  p.quoteAsset,
      spread:      String(p.spread),
      spreadType:  p.spreadType,
      commission:  String(p.commission),
      digits:      String(p.digits),
      tickSize:    String(p.tickSize),
      minLot:      String(p.minLot),
      maxLot:      String(p.maxLot),
      stepLot:     String(p.stepLot),
      leverage:    String(p.leverage),
      swapLong:    String(p.swapLong),
      swapShort:   String(p.swapShort),
      description: p.description,
    })
  }

  const openAdd = () => {
    setForm(EMPTY_FORM)
    setFormErr('')
    setShowAdd(true)
  }

  // ── Sort indicator ─────────────────────────────────────────────────────────
  const SortIcon = ({ k }: { k: keyof TradingPair }) =>
    sortKey === k ? (
      <span className="ml-1 text-info">{sortDir === 'asc' ? '↑' : '↓'}</span>
    ) : null

  const thCls = 'px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider select-none cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap'

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 p-6">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Trading Pairs</h1>
          <p className="text-sm mt-0.5" style={{ color: '#6b8099' }}>
            Manage all tradeable instruments, spreads, leverage, and lot settings
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add Pair
        </button>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard label="Total Pairs"  value={stats?.total   ?? pairs.length}   />
        <StatCard label="Enabled"      value={stats?.enabled ?? '-'} color="text-bull" />
        <StatCard label="Disabled"     value={stats?.disabled ?? '-'} color="text-bear" />
        <StatCard label="Forex"        value={stats?.byCategory?.forex     ?? '-'} color="text-sky-400" />
        <StatCard label="Crypto"       value={stats?.byCategory?.crypto    ?? '-'} color="text-amber-400" />
        <StatCard label="Commodities"  value={stats?.byCategory?.commodity ?? '-'} color="text-orange-400" />
        <StatCard label="Indices"      value={stats?.byCategory?.index     ?? '-'} color="text-emerald-400" />
      </div>

      {/* ── Table card ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border flex flex-col" style={{ background: '#0c1220', borderColor: 'rgba(56,189,248,0.08)' }}>

        {/* Category tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4 pb-3 border-b" style={{ borderColor: 'rgba(56,189,248,0.06)' }}>
          {/* Tabs */}
          <div className="flex gap-1 flex-wrap">
            {CATEGORY_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => { setActiveTab(tab.value); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.value
                    ? 'text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                style={activeTab === tab.value
                  ? { background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }
                  : { background: 'rgba(14,165,233,0.06)' }
                }
              >
                {tab.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: '#6b8099' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text" value={search} placeholder="Search pairs…"
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="pl-8 pr-3 py-2 rounded-lg text-sm text-text-primary outline-none border focus:border-info/50 transition-colors"
              style={{ background: '#080d18', borderColor: 'rgba(56,189,248,0.12)', width: 200 }}
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-20 text-center text-text-secondary text-sm">Loading trading pairs…</div>
        ) : error ? (
          <div className="py-20 text-center text-bear text-sm">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(56,189,248,0.07)', color: '#6b8099' }}>
                  <th className={thCls} onClick={() => handleSort('symbol')}>Symbol <SortIcon k="symbol" /></th>
                  <th className={thCls} onClick={() => handleSort('name')}>Name <SortIcon k="name" /></th>
                  <th className={thCls} onClick={() => handleSort('category')}>Category <SortIcon k="category" /></th>
                  <th className={thCls} onClick={() => handleSort('spread')}>Spread <SortIcon k="spread" /></th>
                  <th className={thCls} onClick={() => handleSort('digits')}>Digits <SortIcon k="digits" /></th>
                  <th className={thCls} onClick={() => handleSort('minLot')}>Min Lot <SortIcon k="minLot" /></th>
                  <th className={thCls} onClick={() => handleSort('maxLot')}>Max Lot <SortIcon k="maxLot" /></th>
                  <th className={thCls} onClick={() => handleSort('leverage')}>Leverage <SortIcon k="leverage" /></th>
                  <th className={thCls} onClick={() => handleSort('swapLong')}>Swap L/S <SortIcon k="swapLong" /></th>
                  <th className={thCls} onClick={() => handleSort('enabled')}>Status <SortIcon k="enabled" /></th>
                  <th className={thCls}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 ? (
                  <tr><td colSpan={11} className="py-16 text-center text-text-secondary text-sm">No pairs found</td></tr>
                ) : paginated.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: '1px solid rgba(56,189,248,0.04)',
                      background: i % 2 === 1 ? 'rgba(14,165,233,0.015)' : 'transparent',
                    }}
                  >
                    <td className="px-3 py-3">
                      <span className="font-mono font-bold text-text-primary">{p.symbol}</span>
                    </td>
                    <td className="px-3 py-3 text-text-secondary max-w-[160px]">
                      <span className="truncate block">{p.name}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${CATEGORY_COLORS[p.category]}`}>
                        {p.category}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-info text-xs">{p.spread}</span>
                      {p.spreadType === 'variable' && <span className="ml-1 text-xs" style={{ color: '#6b8099' }}>var</span>}
                    </td>
                    <td className="px-3 py-3 font-mono text-text-secondary">{p.digits}</td>
                    <td className="px-3 py-3 font-mono text-text-secondary">{p.minLot}</td>
                    <td className="px-3 py-3 font-mono text-text-secondary">{p.maxLot}</td>
                    <td className="px-3 py-3">
                      <span className="font-mono text-text-primary">1:{p.leverage}</span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs">
                      <span className={p.swapLong >= 0 ? 'text-bull' : 'text-bear'}>{p.swapLong > 0 ? '+' : ''}{p.swapLong}</span>
                      <span className="text-text-secondary mx-1">/</span>
                      <span className={p.swapShort >= 0 ? 'text-bull' : 'text-bear'}>{p.swapShort > 0 ? '+' : ''}{p.swapShort}</span>
                    </td>
                    {/* Toggle */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleToggle(p)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${p.enabled ? 'bg-bull/70' : 'bg-surface'}`}
                        style={!p.enabled ? { background: 'rgba(56,189,248,0.1)' } : {}}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${p.enabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </td>
                    {/* Actions */}
                    <td className="px-3 py-3">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-md transition-colors hover:text-info"
                          style={{ color: '#6b8099', background: 'rgba(56,189,248,0.06)' }}
                          title="Edit"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletePair(p)}
                          className="p-1.5 rounded-md transition-colors hover:text-bear"
                          style={{ color: '#6b8099', background: 'rgba(255,48,71,0.06)' }}
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: 'rgba(56,189,248,0.06)' }}>
            <span className="text-xs" style={{ color: '#6b8099' }}>
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex gap-1.5">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <button
                  key={n} onClick={() => setPage(n)}
                  className={`w-7 h-7 rounded-md text-xs font-medium transition-colors ${n === page ? 'text-white' : 'text-text-secondary hover:text-text-primary'}`}
                  style={n === page ? { background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' } : { background: 'rgba(56,189,248,0.06)' }}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Add Modal ──────────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add Trading Pair" onClose={() => setShowAdd(false)} wide>
          <PairFormFields form={form} setForm={setForm} />
          {formErr && (
            <p className="px-6 pb-2 text-xs text-bear">{formErr}</p>
          )}
          <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: 'rgba(56,189,248,0.08)' }}>
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-text-secondary border transition-colors hover:text-text-primary"
              style={{ borderColor: 'rgba(56,189,248,0.12)', background: '#080d18' }}
            >
              Cancel
            </button>
            <button
              onClick={handleAdd} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}
            >
              {saving ? 'Creating…' : 'Create Pair'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ─────────────────────────────────────────────────────── */}
      {editPair && (
        <Modal title={`Edit - ${editPair.symbol}`} onClose={() => setEditPair(null)} wide>
          <PairFormFields form={form} setForm={setForm} />
          {formErr && (
            <p className="px-6 pb-2 text-xs text-bear">{formErr}</p>
          )}
          <div className="flex gap-3 px-6 py-4 border-t" style={{ borderColor: 'rgba(56,189,248,0.08)' }}>
            <button
              onClick={() => setEditPair(null)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-text-secondary border transition-colors hover:text-text-primary"
              style={{ borderColor: 'rgba(56,189,248,0.12)', background: '#080d18' }}
            >
              Cancel
            </button>
            <button
              onClick={handleEdit} disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-all hover:brightness-110"
              style={{ background: 'linear-gradient(135deg,#0ea5e9,#0369a1)' }}
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── Delete Modal ───────────────────────────────────────────────────── */}
      {deletePair && (
        <DeleteModal
          pair={deletePair}
          onConfirm={handleDelete}
          onCancel={() => setDeletePair(null)}
          loading={saving}
        />
      )}
    </div>
  )
}
