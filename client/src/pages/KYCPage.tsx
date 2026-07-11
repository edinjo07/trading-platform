import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKYCStore } from '../store/kycStore'

// ── Theme palette (flips with light/dark) ─────────────────────────────────────
const S = {
  surface:  'var(--t-surface)',
  surface2: 'var(--t-surface-2)',
  border:   'var(--t-border)',
  text1:    'var(--t-text-1)',
  text2:    'var(--t-text-2)',
  text3:    'var(--t-text-3)',
  bull:     'var(--t-bull)',
  bear:     'var(--t-bear)',
  warn:     'var(--t-warn)',
  accent:   'var(--t-accent)',
}

type DocStatus = 'empty' | 'uploaded' | 'pending' | 'verified' | 'rejected'
interface DocFile { name: string; size: number; dataUrl: string }

// status → { label, color }
const STATUS_META: Record<DocStatus, { label: string; color: string }> = {
  empty:    { label: 'Not submitted', color: S.text3  },
  uploaded: { label: 'Ready',         color: S.accent },
  pending:  { label: 'Under review',  color: S.warn   },
  verified: { label: 'Verified',      color: S.bull   },
  rejected: { label: 'Rejected',      color: S.bear   },
}

function StatusPill({ status, big }: { status: DocStatus; big?: boolean }) {
  const m = STATUS_META[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: big ? 12 : 10.5, fontWeight: 700, padding: big ? '5px 12px' : '3px 9px',
      borderRadius: 99, background: `${m.color}1e`, color: m.color, letterSpacing: '0.02em', whiteSpace: 'nowrap',
    }}>
      {status === 'verified' && <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
      {status === 'pending' && <span style={{ width: 6, height: 6, borderRadius: 99, background: m.color }} className="animate-pulse2" />}
      {m.label}
    </span>
  )
}

// ── Circular progress ring (hero) ─────────────────────────────────────────────
function ProgressRing({ pct, color, children }: { pct: number; color: string; children: React.ReactNode }) {
  const R = 34, C = 2 * Math.PI * R
  return (
    <div style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}>
      <svg width="84" height="84" viewBox="0 0 84 84" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(var(--ink),0.09)" strokeWidth="6" />
        <circle cx="42" cy="42" r={R} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={C - (C * pct) / 100} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</div>
    </div>
  )
}

// ── Upload zone ────────────────────────────────────────────────────────────────
function UploadZone({ file, onFile, disabled, accent }: { file: DocFile | null; onFile: (f: DocFile) => void; disabled: boolean; accent: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (f: File) => {
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => onFile({ name: f.name, size: f.size, dataUrl: reader.result as string })
    reader.readAsDataURL(f)
  }
  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      {file ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, background: `${accent}0d`, border: `1px solid ${accent}33` }}>
          {file.dataUrl.startsWith('data:image') ? (
            <img src={file.dataUrl} alt="doc" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: `1px solid ${accent}40` }} />
          ) : (
            <div style={{ width: 52, height: 52, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}1a`, color: accent }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: S.text1, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
            <p style={{ fontSize: 12, color: S.text3, margin: '2px 0 0' }}>{file.size > 0 ? fmtSize(file.size) : 'On file'}</p>
          </div>
          {!disabled && (
            <button onClick={() => inputRef.current?.click()}
              style={{ fontSize: 12, fontWeight: 700, padding: '7px 13px', borderRadius: 9, background: `${accent}1a`, color: accent, border: `1px solid ${accent}33`, cursor: 'pointer', flexShrink: 0 }}>
              Replace
            </button>
          )}
        </div>
      ) : (
        <button disabled={disabled} onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); if (!disabled) { const f = e.dataTransfer.files?.[0]; if (f) handle(f) } }}
          style={{ width: '100%', padding: '26px 16px', borderRadius: 12, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            background: dragging ? `${accent}12` : 'rgba(var(--ink),0.02)',
            border: `2px dashed ${dragging ? accent : 'rgba(var(--ink),0.12)'}`, transition: 'all 0.15s' }}>
          <div style={{ width: 40, height: 40, borderRadius: 99, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}14`, color: accent, marginBottom: 2 }}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          </div>
          <p style={{ fontSize: 14, fontWeight: 700, color: S.text1, margin: 0 }}>Click or drag &amp; drop</p>
          <p style={{ fontSize: 12, color: S.text3, margin: 0 }}>JPG, PNG or PDF · max 10 MB</p>
        </button>
      )}
    </div>
  )
}

interface DocCardProps {
  step: number; title: string; subtitle: string; accent: string
  typeOptions: { value: string; label: string; icon: React.ReactNode }[]
  docType: string; setDocType: (v: string) => void
  file: DocFile | null; setFile: (f: DocFile) => void
  status: DocStatus; requirements: string[]
}

function DocCard({ step, title, subtitle, accent, typeOptions, docType, setDocType, file, setFile, status, requirements }: DocCardProps) {
  const locked = status === 'pending' || status === 'verified'
  const done   = status === 'verified'
  return (
    <div style={{ background: S.surface, border: `1px solid ${done ? `${S.bull}33` : S.border}`, borderRadius: 18, overflow: 'hidden', boxShadow: 'var(--t-shadow-sm)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${S.border}`, background: `${accent}08` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{ width: 36, height: 36, borderRadius: 11, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800,
            background: done ? 'var(--t-bull-s)' : `${accent}1f`, border: `1px solid ${done ? `${S.bull}55` : `${accent}40`}`, color: done ? S.bull : accent }}>
            {done ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.6}><polyline points="20 6 9 17 4 12"/></svg> : step}
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: S.text1, margin: 0 }}>{title}</p>
            <p style={{ fontSize: 12, color: S.text3, margin: '2px 0 0' }}>{subtitle}</p>
          </div>
        </div>
        <StatusPill status={status} />
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* Type picker */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Document type</p>
          <div className="grid grid-cols-1 sm:grid-cols-3" style={{ gap: 8 }}>
            {typeOptions.map(opt => {
              const on = docType === opt.value
              return (
                <button key={opt.value} disabled={locked} onClick={() => setDocType(opt.value)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderRadius: 12, cursor: locked ? 'not-allowed' : 'pointer', opacity: locked && !on ? 0.5 : 1, textAlign: 'left',
                    background: on ? `${accent}16` : 'rgba(var(--ink),0.025)', border: `1px solid ${on ? `${accent}55` : S.border}`, color: on ? accent : S.text2 }}>
                  <span style={{ flexShrink: 0, display: 'flex' }}>{opt.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: on ? accent : S.text1, flex: 1 }}>{opt.label}</span>
                  {on && <span style={{ width: 16, height: 16, borderRadius: 99, flexShrink: 0, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth={3.5}><polyline points="20 6 9 17 4 12"/></svg>
                  </span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Upload */}
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px' }}>Upload document</p>
          <UploadZone file={file} onFile={setFile} disabled={locked || !docType} accent={accent} />
        </div>

        {/* Requirements */}
        <div style={{ borderRadius: 12, padding: 14, background: 'rgba(var(--ink),0.02)', border: `1px solid ${S.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: S.text3, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px' }}>Requirements</p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {requirements.map(r => (
              <li key={r} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: S.text2, lineHeight: 1.4 }}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke={accent} strokeWidth={2.4} style={{ marginTop: 2, flexShrink: 0 }}><polyline points="20 6 9 17 4 12"/></svg>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* State banners */}
        {status === 'rejected' && (
          <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: 11, background: 'var(--t-bear-s)', border: `1px solid ${S.bear}33` }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={S.bear} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <p style={{ fontSize: 12, color: S.bear, margin: 0, lineHeight: 1.4 }}>This document was rejected. Please upload a clearer, unedited copy and resubmit.</p>
          </div>
        )}
        {status === 'pending' && (
          <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: 11, background: 'var(--t-warn-s)', border: `1px solid ${S.warn}33` }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={S.warn} strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p style={{ fontSize: 12, color: S.warn, margin: 0, lineHeight: 1.4 }}>Under review, we'll notify you once it's checked, usually within 1–2 business days.</p>
          </div>
        )}
        {status === 'verified' && (
          <div style={{ display: 'flex', gap: 10, padding: 13, borderRadius: 11, background: 'var(--t-bull-s)', border: `1px solid ${S.bull}33` }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={S.bull} strokeWidth={2.4} style={{ flexShrink: 0, marginTop: 1 }}><polyline points="20 6 9 17 4 12"/></svg>
            <p style={{ fontSize: 12, color: S.bull, margin: 0, fontWeight: 600 }}>Document verified successfully.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Document catalogues ─────────────────────────────────────────────────────────
const ID_TYPES = [
  { value: 'passport', label: 'Passport', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="3" y="2" width="18" height="20" rx="2"/><circle cx="12" cy="10" r="3"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg> },
  { value: 'national_id', label: 'National ID', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="12" r="2"/><path d="M13 9h5M13 12h3M13 15h4"/></svg> },
  { value: 'drivers_license', label: "Driver's License", icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M13 9h4M13 12h3M5 17h14"/></svg> },
]
const POA_TYPES = [
  { value: 'utility_bill', label: 'Utility Bill', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/></svg> },
  { value: 'bank_statement', label: 'Bank Statement', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M3 10h18M3 10V6l9-3 9 3v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8"/></svg> },
  { value: 'government_letter', label: 'Gov. Letter', icon: <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
]
const ID_REQUIREMENTS = [
  'Valid and not expired',
  'All four corners visible',
  'Full name & date of birth readable',
  'In colour, black & white not accepted',
]
const POA_REQUIREMENTS = [
  'Issued within the last 3 months',
  'Full name & residential address visible',
  'Not cropped or edited in any way',
  'Bank logo / official letterhead shown',
]

const BENEFITS = [
  { title: 'Unlimited withdrawals', desc: 'Remove the unverified withdrawal cap', icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { title: 'Higher leverage tiers', desc: 'Access the platform\'s maximum leverage', icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg> },
  { title: 'Priority support', desc: 'A dedicated account manager', icon: <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
]

const STEPS: { key: string; label: string; done: (i: DocStatus, p: DocStatus) => boolean }[] = [
  { key: 'id',     label: 'Identity', done: (i, _p) => i === 'verified' || i === 'pending' },
  { key: 'poa',    label: 'Address',  done: (_i, p) => p === 'verified' || p === 'pending' },
  { key: 'review', label: 'Verified', done: (i, p)  => i === 'verified' && p === 'verified' },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function KYCPage() {
  const navigate = useNavigate()
  const { record, load, submit } = useKYCStore()

  const [idType,  setIdType]  = useState('')
  const [idFile,  setIdFile]  = useState<DocFile | null>(null)
  const [poaType, setPoaType] = useState('')
  const [poaFile, setPoaFile] = useState<DocFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (record.id_type)  setIdType(record.id_type)
    if (record.poa_type) setPoaType(record.poa_type)
  }, [record.id_type, record.poa_type])

  const idServer  = record.id_status
  const poaServer = record.poa_status
  const idDisplay:  DocStatus = idServer  !== 'empty' ? idServer  : (idFile  ? 'uploaded' : 'empty')
  const poaDisplay: DocStatus = poaServer !== 'empty' ? poaServer : (poaFile ? 'uploaded' : 'empty')
  const idFileShown  = idFile  ?? (record.id_doc_name  ? { name: record.id_doc_name,  size: 0, dataUrl: '' } : null)
  const poaFileShown = poaFile ?? (record.poa_doc_name ? { name: record.poa_doc_name, size: 0, dataUrl: '' } : null)

  const canSubmitId  = !!idType  && !!idFile  && idServer  !== 'pending' && idServer  !== 'verified'
  const canSubmitPoa = !!poaType && !!poaFile && poaServer !== 'pending' && poaServer !== 'verified'
  const canSubmitAll = canSubmitId || canSubmitPoa

  const overall  = record.status
  const stepsDone = STEPS.filter(s => s.done(idServer, poaServer)).length
  const progress  = Math.round((stepsDone / STEPS.length) * 100)

  const heroColor = overall === 'verified' ? S.bull : overall === 'rejected' ? S.bear : overall === 'pending' ? S.warn : S.accent
  const heroMsg   = overall === 'verified'
    ? 'Your identity is fully verified, all limits unlocked.'
    : overall === 'rejected'
    ? 'A document needs attention. Re-upload a clearer copy below.'
    : overall === 'pending'
    ? 'Your documents are under review. We\'ll notify you once checked.'
    : 'Two quick documents and you\'re fully verified.'

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submit({
        idType:     canSubmitId  ? idType       : undefined,
        idDocName:  canSubmitId  ? idFile!.name  : undefined,
        poaType:    canSubmitPoa ? poaType       : undefined,
        poaDocName: canSubmitPoa ? poaFile!.name : undefined,
      })
    } finally { setSubmitting(false) }
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: 'transparent' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: '28px 20px 110px' }}>

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button onClick={() => navigate('/dashboard')}
            style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0, background: 'rgba(var(--ink),0.05)', border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: S.text2 }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: S.text1, margin: 0, letterSpacing: '-0.01em' }}>Account Verification</h1>
            <p style={{ fontSize: 13, color: S.text3, margin: '2px 0 0' }}>Confirm your identity to unlock the full platform.</p>
          </div>
        </div>

        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 20, padding: 22, marginBottom: 18,
          background: `linear-gradient(135deg, ${heroColor}1f 0%, var(--t-surface) 62%)`, border: `1px solid ${heroColor}33`, boxShadow: 'var(--t-shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <ProgressRing pct={progress} color={heroColor}>
              {overall === 'verified'
                ? <svg width="30" height="30" fill="none" viewBox="0 0 24 24" stroke={heroColor} strokeWidth={2.4}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                : <span style={{ fontSize: 22, fontWeight: 800, color: heroColor, fontFamily: 'ui-monospace,monospace' }}>{progress}%</span>}
            </ProgressRing>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, color: S.text1, margin: 0 }}>
                  {overall === 'verified' ? 'You\'re verified' : overall === 'pending' ? 'Review in progress' : overall === 'rejected' ? 'Action needed' : 'Get verified'}
                </h2>
                <StatusPill big status={overall === 'unverified' ? 'empty' : overall as DocStatus} />
              </div>
              <p style={{ fontSize: 13, color: S.text2, margin: 0, lineHeight: 1.5 }}>{heroMsg}</p>

              {/* Stepper */}
              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16 }}>
                {STEPS.map((s, i) => {
                  const done = s.done(idServer, poaServer)
                  return (
                    <React.Fragment key={s.key}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 24, height: 24, borderRadius: 99, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800,
                          background: done ? heroColor : 'rgba(var(--ink),0.06)', color: done ? '#fff' : S.text3, border: done ? 'none' : `1px solid ${S.border}` }}>
                          {done ? <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg> : i + 1}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: done ? S.text1 : S.text3 }}>{s.label}</span>
                      </div>
                      {i < STEPS.length - 1 && <div style={{ flex: 1, height: 2, margin: '0 10px', borderRadius: 2, background: done ? `${heroColor}66` : 'rgba(var(--ink),0.08)', minWidth: 16 }} />}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ── Two-column body ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3" style={{ gap: 18, alignItems: 'start' }}>

          {/* Main: document cards */}
          <div className="lg:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
            <DocCard step={1} title="Identity Document" subtitle="A government-issued photo ID" accent="#4f8cff"
              typeOptions={ID_TYPES} docType={idType} setDocType={setIdType} file={idFileShown} setFile={setIdFile} status={idDisplay} requirements={ID_REQUIREMENTS} />
            <DocCard step={2} title="Proof of Address" subtitle="A recent document with your address" accent="#8b5cf6"
              typeOptions={POA_TYPES} docType={poaType} setDocType={setPoaType} file={poaFileShown} setFile={setPoaFile} status={poaDisplay} requirements={POA_REQUIREMENTS} />
          </div>

          {/* Side rail */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0, position: 'sticky', top: 16 }}>

            {/* Submit / status card */}
            {overall === 'verified' ? (
              <div style={{ background: 'linear-gradient(135deg, var(--t-bull-s) 0%, var(--t-surface) 70%)', border: `1px solid ${S.bull}40`, borderRadius: 18, padding: 22, textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 99, margin: '0 auto 14px', background: 'var(--t-bull-s)', border: `1px solid ${S.bull}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke={S.bull} strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: S.bull, margin: '0 0 6px' }}>Account verified</p>
                <p style={{ fontSize: 13, color: S.text2, margin: '0 0 16px', lineHeight: 1.5 }}>All features and withdrawal limits are unlocked. Thank you.</p>
                <button onClick={() => navigate('/dashboard')}
                  style={{ width: '100%', padding: '12px', borderRadius: 11, background: S.bull, border: 'none', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  Go to Dashboard
                </button>
              </div>
            ) : overall === 'pending' ? (
              <div style={{ background: S.surface, border: `1px solid ${S.warn}33`, borderRadius: 18, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flexShrink: 0, background: 'var(--t-warn-s)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke={S.warn} strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: S.text1, margin: 0 }}>Under review</p>
                </div>
                <p style={{ fontSize: 13, color: S.text2, margin: 0, lineHeight: 1.5 }}>
                  Submitted {record.submitted_at ? new Date(record.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : 'recently'}. Our team typically reviews documents within <strong style={{ color: S.text1 }}>1–2 business days</strong>, you'll get a notification when it's done.
                </p>
              </div>
            ) : (
              <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, padding: 20 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: S.text1, margin: '0 0 4px' }}>{canSubmitAll ? 'Ready to submit' : 'Add your documents'}</p>
                <p style={{ fontSize: 13, color: S.text3, margin: '0 0 16px', lineHeight: 1.5 }}>
                  {canSubmitAll ? 'Submit for review, you\'ll be notified once verified.' : 'Pick a document type and upload a file for each step to continue.'}
                </p>
                <button onClick={handleSubmit} disabled={!canSubmitAll || submitting}
                  style={{ width: '100%', padding: 13, borderRadius: 11, border: 'none', fontSize: 14, fontWeight: 700, cursor: (!canSubmitAll || submitting) ? 'not-allowed' : 'pointer',
                    background: (!canSubmitAll || submitting) ? 'var(--t-accent-s)' : S.accent, color: (!canSubmitAll || submitting) ? S.text3 : '#fff' }}>
                  {submitting ? 'Submitting…' : 'Submit for Verification'}
                </button>
              </div>
            )}

            {/* Benefits */}
            <div style={{ background: S.surface, border: `1px solid ${S.border}`, borderRadius: 18, padding: 20 }}>
              <p style={{ fontSize: 13, fontWeight: 800, color: S.text1, margin: '0 0 14px' }}>Why verify?</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {BENEFITS.map(b => (
                  <div key={b.title} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: 'var(--t-accent-s)', color: S.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{b.icon}</div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 700, color: S.text1, margin: 0 }}>{b.title}</p>
                      <p style={{ fontSize: 12, color: S.text3, margin: '2px 0 0', lineHeight: 1.4 }}>{b.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security note */}
            <div style={{ display: 'flex', gap: 10, padding: '14px 16px', borderRadius: 14, background: 'rgba(var(--ink),0.02)', border: `1px solid ${S.border}` }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={S.text3} strokeWidth={1.8} style={{ flexShrink: 0, marginTop: 1 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <p style={{ fontSize: 12, color: S.text3, margin: 0, lineHeight: 1.5 }}>
                Your data is encrypted and used solely for identity verification, in line with our Privacy Policy and applicable regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
