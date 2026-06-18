import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useKYCStore } from '../store/kycStore'

// ─── Types ────────────────────────────────────────────────────────────────────
type DocStatus = 'empty' | 'uploaded' | 'pending' | 'verified' | 'rejected'

interface DocFile {
  name: string
  size: number
  dataUrl: string
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: DocStatus }) {
  const cfg = {
    empty:    { label: 'Not Submitted', bg: 'rgba(107,128,153,0.12)', color: '#6b8099', border: 'rgba(107,128,153,0.2)' },
    uploaded: { label: 'Ready',         bg: 'rgba(14,165,233,0.12)',  color: '#38bdf8', border: 'rgba(14,165,233,0.25)' },
    pending:  { label: 'Under Review',  bg: 'rgba(245,158,11,0.12)',  color: '#fbbf24', border: 'rgba(245,158,11,0.25)' },
    verified: { label: 'Verified',      bg: 'rgba(0,200,120,0.12)',   color: '#00c878', border: 'rgba(0,200,120,0.25)' },
    rejected: { label: 'Rejected',      bg: 'rgba(255,48,71,0.12)',   color: '#ff3047', border: 'rgba(255,48,71,0.25)' },
  }[status]
  return (
    <span className="text-2xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
          style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {status === 'verified' && '✓ '}{cfg.label}
    </span>
  )
}

function UploadZone({
  file, onFile, disabled, accent
}: {
  file: DocFile | null
  onFile: (f: DocFile) => void
  disabled: boolean
  accent: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handle = (file: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onFile({ name: file.name, size: file.size, dataUrl: reader.result as string })
    }
    reader.readAsDataURL(file)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const f = e.dataTransfer.files?.[0]
    if (f) handle(f)
  }

  const fmtSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
             onChange={e => { const f = e.target.files?.[0]; if (f) handle(f) }} />
      {file ? (
        <div className="rounded-xl p-4 flex items-center gap-3"
             style={{ background: `${accent}0a`, border: `1px solid ${accent}28` }}>
          {/* preview or icon */}
          {file.dataUrl.startsWith('data:image') ? (
            <img src={file.dataUrl} alt="doc" className="w-14 h-14 rounded-lg object-cover shrink-0 border"
                 style={{ borderColor: `${accent}30` }} />
          ) : (
            <div className="w-14 h-14 rounded-lg flex items-center justify-center shrink-0"
                 style={{ background: `${accent}15`, border: `1px solid ${accent}25`, color: accent }}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-text-primary truncate">{file.name}</p>
            <p className="text-xs text-text-muted mt-0.5">{file.size > 0 ? fmtSize(file.size) : 'On file'}</p>
          </div>
          {!disabled && (
            <button onClick={() => inputRef.current?.click()}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg transition-all shrink-0"
              style={{ background: `${accent}15`, color: accent, border: `1px solid ${accent}25` }}>
              Replace
            </button>
          )}
        </div>
      ) : (
        <button
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className="w-full rounded-xl py-8 flex flex-col items-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          style={{
            background: dragging ? `${accent}10` : 'rgba(255,255,255,0.02)',
            border: `2px dashed ${dragging ? accent : 'rgba(255,255,255,0.1)'}`,
          }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
               style={{ background: `${accent}12`, color: accent }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-text-primary">Click or drag &amp; drop</p>
          <p className="text-xs text-text-muted">JPG, PNG or PDF · max 10 MB</p>
        </button>
      )}
    </div>
  )
}

interface DocSectionProps {
  step: 1 | 2
  title: string
  subtitle: string
  accent: string
  typeLabel: string
  typeOptions: { value: string; label: string; icon: React.ReactNode }[]
  docType: string
  setDocType: (v: string) => void
  file: DocFile | null
  setFile: (f: DocFile) => void
  status: DocStatus
  requirements: string[]
}

function DocSection({
  step, title, subtitle, accent, typeLabel, typeOptions,
  docType, setDocType, file, setFile, status, requirements
}: DocSectionProps) {
  const locked = status === 'pending' || status === 'verified'
  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 gap-3 flex-wrap"
           style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: `${accent}06` }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
               style={{ background: `${accent}20`, border: `1px solid ${accent}30`, color: accent }}>
            {status === 'verified' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
            ) : String(step)}
          </div>
          <div>
            <p className="font-bold text-sm text-text-primary">{title}</p>
            <p className="text-xs text-text-muted">{subtitle}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="p-6 space-y-5">
        {/* Document type picker */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2.5">{typeLabel}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {typeOptions.map(opt => (
              <button
                key={opt.value}
                disabled={locked}
                onClick={() => setDocType(opt.value)}
                className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl text-left transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                style={docType === opt.value
                  ? { background: `${accent}15`, border: `1px solid ${accent}40`, color: accent }
                  : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', color: '#94a3b8' }}
                onMouseEnter={e => docType !== opt.value && !locked && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.14)')}
                onMouseLeave={e => docType !== opt.value && !locked && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)')}
              >
                <span className="shrink-0">{opt.icon}</span>
                <span className="text-xs font-semibold text-text-primary">{opt.label}</span>
                {docType === opt.value && (
                  <span className="ml-auto shrink-0 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: accent }}>
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2.5">Upload Document</p>
          <UploadZone file={file} onFile={setFile} disabled={locked || !docType} accent={accent} />
        </div>

        {/* Requirements checklist */}
        <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}>
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Requirements</p>
          <ul className="space-y-1.5">
            {requirements.map(r => (
              <li key={r} className="flex items-start gap-2 text-xs text-text-secondary">
                <svg className="w-3.5 h-3.5 mt-0.5 shrink-0 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {status === 'rejected' && (
          <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(255,48,71,0.08)', border: '1px solid rgba(255,48,71,0.2)' }}>
            <svg className="w-4 h-4 text-bear shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <p className="text-xs text-bear">Your document was rejected. Please upload a clearer, unedited copy of a valid document and resubmit.</p>
          </div>
        )}

        {status === 'pending' && (
          <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <p className="text-xs" style={{ color: '#fbbf24' }}>Your document is under review. This typically takes 1–2 business days. We'll notify you by email once reviewed.</p>
          </div>
        )}

        {status === 'verified' && (
          <div className="rounded-xl p-4 flex gap-3" style={{ background: 'rgba(0,200,120,0.07)', border: '1px solid rgba(0,200,120,0.2)' }}>
            <svg className="w-4 h-4 text-bull shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
            <p className="text-xs text-bull">Document verified successfully.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const ID_TYPES = [
  {
    value: 'passport',
    label: 'Passport',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="3" y="2" width="18" height="20" rx="2" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      </svg>
    ),
  },
  {
    value: 'national_id',
    label: 'National ID',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="8" cy="12" r="2" />
        <path d="M13 9h5M13 12h3M13 15h4" />
      </svg>
    ),
  },
  {
    value: 'drivers_license',
    label: "Driver's License",
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <circle cx="8" cy="11" r="2" />
        <path d="M13 9h4M13 12h3M5 17h14" />
      </svg>
    ),
  },
]

const POA_TYPES = [
  {
    value: 'utility_bill',
    label: 'Utility Bill',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="8" y1="13" x2="16" y2="13" />
        <line x1="8" y1="17" x2="12" y2="17" />
      </svg>
    ),
  },
  {
    value: 'bank_statement',
    label: 'Bank Statement',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M3 10h18M3 10V6l9-3 9 3v4M3 10v8a1 1 0 001 1h16a1 1 0 001-1v-8" />
      </svg>
    ),
  },
  {
    value: 'government_letter',
    label: 'Gov. Letter',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
      </svg>
    ),
  },
]

const ID_REQUIREMENTS = [
  'Document must be valid and not expired',
  'All four corners of the document must be visible',
  'Your full name and date of birth must be clearly readable',
  'Photo must be in colour - black & white not accepted',
  'File must be JPG, PNG or PDF - maximum 10 MB',
]

const POA_REQUIREMENTS = [
  'Document must be issued within the last 3 months',
  'Your full name and current residential address must be visible',
  'Document must not be cropped or edited in any way',
  'Bank statements must show the bank logo or official letterhead',
  'File must be JPG, PNG or PDF - maximum 10 MB',
]

const OVERALL_STEPS: { key: string; label: string; done: (idS: DocStatus, poaS: DocStatus) => boolean }[] = [
  { key: 'id',  label: 'Identity Document', done: (idS) => idS === 'verified' || idS === 'pending' },
  { key: 'poa', label: 'Proof of Address',  done: (_idS, poaS) => poaS === 'verified' || poaS === 'pending' },
  { key: 'review', label: 'Under Review',   done: (idS, poaS) => idS === 'verified' && poaS === 'verified' },
]

export default function KYCPage() {
  const navigate = useNavigate()
  const { record, load, submit } = useKYCStore()

  // Local (ephemeral) document selections. File previews stay client-side in this
  // simulator — only the document type + filename are sent to the backend.
  const [idType,  setIdType]  = useState('')
  const [idFile,  setIdFile]  = useState<DocFile | null>(null)
  const [poaType, setPoaType] = useState('')
  const [poaFile, setPoaFile] = useState<DocFile | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { load() }, [load])

  // Prefill the type pickers from any saved submission
  useEffect(() => {
    if (record.id_type)  setIdType(record.id_type)
    if (record.poa_type) setPoaType(record.poa_type)
  }, [record.id_type, record.poa_type])

  const idServer  = record.id_status
  const poaServer = record.poa_status

  // Display status: a server decision wins; a locally-picked-but-unsent file = "uploaded".
  const idDisplay:  DocStatus = idServer  !== 'empty' ? idServer  : (idFile  ? 'uploaded' : 'empty')
  const poaDisplay: DocStatus = poaServer !== 'empty' ? poaServer : (poaFile ? 'uploaded' : 'empty')

  // For submitted docs with no local preview, synthesize a placeholder from the filename.
  const idFileShown  = idFile  ?? (record.id_doc_name  ? { name: record.id_doc_name,  size: 0, dataUrl: '' } : null)
  const poaFileShown = poaFile ?? (record.poa_doc_name ? { name: record.poa_doc_name, size: 0, dataUrl: '' } : null)

  const canSubmitId  = !!idType  && !!idFile  && idServer  !== 'pending' && idServer  !== 'verified'
  const canSubmitPoa = !!poaType && !!poaFile && poaServer !== 'pending' && poaServer !== 'verified'
  const canSubmitAll = canSubmitId || canSubmitPoa

  const overallStatus = record.status

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      await submit({
        idType:     canSubmitId  ? idType        : undefined,
        idDocName:  canSubmitId  ? idFile!.name   : undefined,
        poaType:    canSubmitPoa ? poaType        : undefined,
        poaDocName: canSubmitPoa ? poaFile!.name  : undefined,
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard')} className="text-text-muted hover:text-text-primary transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Account Verification</h1>
          <p className="text-text-muted text-sm mt-0.5">
            Verify your identity to unlock full trading features and higher withdrawal limits.
          </p>
        </div>
      </div>

      {/* ── Overall progress ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Verification Progress</p>
          {overallStatus === 'verified' && <StatusBadge status="verified" />}
          {overallStatus === 'pending'  && <StatusBadge status="pending" />}
          {overallStatus === 'rejected' && <StatusBadge status="rejected" />}
          {overallStatus === 'unverified' && <StatusBadge status="empty" />}
        </div>

        {/* Step track */}
        <div className="flex items-center gap-0 mb-4">
          {OVERALL_STEPS.map((step, i) => {
            const done = step.done(idServer, poaServer)
            const isLast = i === OVERALL_STEPS.length - 1
            return (
              <React.Fragment key={step.key}>
                <div className="flex flex-col items-center min-w-[80px]">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all"
                       style={done
                         ? { background: 'rgba(0,200,120,0.15)', borderColor: '#00c878', color: '#00c878' }
                         : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.12)', color: '#6b8099' }}>
                    {done
                      ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
                      : String(i + 1)}
                  </div>
                  <p className="text-2xs text-text-muted mt-1 text-center leading-tight">{step.label}</p>
                </div>
                {!isLast && (
                  <div className="flex-1 h-0.5 mb-4 transition-all"
                       style={{ background: done ? 'rgba(0,200,120,0.4)' : 'rgba(255,255,255,0.06)' }} />
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* Why verify */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Unlimited Withdrawals', icon: '💸', desc: 'Remove all withdrawal restrictions' },
            { label: 'Higher Leverage',        icon: '📈', desc: 'Access maximum leverage tiers' },
            { label: 'Priority Support',       icon: '🛡', desc: 'Dedicated account manager access' },
          ].map(b => (
            <div key={b.label} className="rounded-xl p-3 flex gap-2.5 items-start"
                 style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}>
              <span className="text-lg shrink-0">{b.icon}</span>
              <div>
                <p className="text-xs font-semibold text-text-primary">{b.label}</p>
                <p className="text-2xs text-text-muted mt-0.5">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Step 1: Identity ─────────────────────────────────────────────── */}
      <DocSection
        step={1}
        title="Identity Document"
        subtitle="A government-issued photo ID confirming who you are"
        accent="#0ea5e9"
        typeLabel="Select Document Type"
        typeOptions={ID_TYPES}
        docType={idType}
        setDocType={setIdType}
        file={idFileShown}
        setFile={setIdFile}
        status={idDisplay}
        requirements={ID_REQUIREMENTS}
      />

      {/* ── Step 2: Proof of Address ─────────────────────────────────────── */}
      <DocSection
        step={2}
        title="Proof of Address"
        subtitle="A recent document confirming your residential address"
        accent="#8b5cf6"
        typeLabel="Select Document Type"
        typeOptions={POA_TYPES}
        docType={poaType}
        setDocType={setPoaType}
        file={poaFileShown}
        setFile={setPoaFile}
        status={poaDisplay}
        requirements={POA_REQUIREMENTS}
      />

      {/* ── Submit button ─────────────────────────────────────────────────── */}
      {canSubmitAll && (
        <div className="card p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-text-primary">Ready to submit?</p>
            <p className="text-xs text-text-muted mt-0.5">
              Submit your documents for review. You'll be notified within 1–2 business days.
            </p>
          </div>
          <button onClick={handleSubmit} disabled={submitting}
            className="btn-primary px-6 py-2.5 text-sm shrink-0 disabled:opacity-50">
            {submitting ? 'Submitting…' : 'Submit for Verification'}
          </button>
        </div>
      )}

      {overallStatus === 'pending' && (
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
               style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}>
            <svg className="w-5 h-5" style={{ color: '#fbbf24' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Verification in progress</p>
            <p className="text-xs text-text-muted mt-0.5">
              Submitted {record.submitted_at ? new Date(record.submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'recently'} ·
              Our compliance team typically reviews documents within <strong className="text-text-primary">1–2 business days</strong>.
            </p>
          </div>
        </div>
      )}

      {overallStatus === 'verified' && (
        <div className="card p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center"
               style={{ background: 'rgba(0,200,120,0.12)', border: '1px solid rgba(0,200,120,0.3)' }}>
            <svg className="w-5 h-5 text-bull" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-bull">Account Fully Verified</p>
            <p className="text-xs text-text-muted mt-0.5">All features and limits are now unlocked. Thank you for completing verification.</p>
          </div>
          <button onClick={() => navigate('/dashboard')} className="ml-auto btn-primary px-4 py-2 text-sm shrink-0">
            Go to Dashboard
          </button>
        </div>
      )}

      {/* Privacy note */}
      <div className="flex items-start gap-2.5 px-1">
        <svg className="w-4 h-4 shrink-0 mt-0.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <p className="text-xs text-text-muted leading-relaxed">
          Your personal data is handled in accordance with our Privacy Policy and applicable data protection regulations.
          Documents are encrypted, stored securely, and used solely for identity verification purposes.
        </p>
      </div>

    </div>
  )
}
