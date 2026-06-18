/**
 * kycService.ts
 *
 * Identity-verification (KYC) state, persisted per user in `kyc_submissions`.
 * Resilient to a missing table (degrades to "unverified") so nothing else breaks
 * before the migration is run.
 *
 * Review flow:
 *   submit  → documents go to `pending`
 *   review  → a (simulated) compliance step flips them to `verified` / `rejected`
 *
 * Because there is no human compliance desk, an optional auto-review monitor
 * (startKycMonitor) approves pending submissions after KYC_AUTO_REVIEW_MS so the
 * demo can actually reach a verified state. Set KYC_AUTO_REVIEW_MS=0 to disable.
 */

import { supabase } from '../db'
import { createNotification } from './notificationService'

export type DocStatus     = 'empty' | 'pending' | 'verified' | 'rejected'
export type OverallStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export interface KYCRecord {
  status:        OverallStatus
  id_type:       string | null
  id_doc_name:   string | null
  id_status:     DocStatus
  poa_type:      string | null
  poa_doc_name:  string | null
  poa_status:    DocStatus
  reject_reason: string | null
  submitted_at:  string | null
  reviewed_at:   string | null
}

const DEFAULT_KYC: KYCRecord = {
  status: 'unverified',
  id_type: null,  id_doc_name: null,  id_status: 'empty',
  poa_type: null, poa_doc_name: null, poa_status: 'empty',
  reject_reason: null, submitted_at: null, reviewed_at: null,
}

const SELECT =
  'status, id_type, id_doc_name, id_status, poa_type, poa_doc_name, poa_status, reject_reason, submitted_at, reviewed_at'

/** Derive the overall status from the two document statuses. */
function overallFrom(idS: DocStatus, poaS: DocStatus): OverallStatus {
  if (idS === 'verified' && poaS === 'verified') return 'verified'
  if (idS === 'rejected' || poaS === 'rejected') return 'rejected'
  if (idS === 'pending'  || poaS === 'pending')  return 'pending'
  return 'unverified'
}

/** Read the user's KYC record (defaults to unverified if none / table missing). */
export async function getKYC(userId: string): Promise<KYCRecord> {
  try {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select(SELECT)
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return { ...DEFAULT_KYC }
    return data as KYCRecord
  } catch {
    return { ...DEFAULT_KYC }
  }
}

export interface SubmitInput {
  idType?:     string
  idDocName?:  string
  poaType?:    string
  poaDocName?: string
}

/**
 * Submit (or re-submit) documents for review. Only documents included in the
 * payload move to `pending`; already-verified documents are left untouched.
 */
export async function submitKYC(userId: string, input: SubmitInput): Promise<KYCRecord> {
  const current = await getKYC(userId)
  const now = new Date().toISOString()

  const next: KYCRecord = { ...current }

  if (input.idType && input.idDocName && current.id_status !== 'verified') {
    next.id_type = input.idType
    next.id_doc_name = input.idDocName
    next.id_status = 'pending'
  }
  if (input.poaType && input.poaDocName && current.poa_status !== 'verified') {
    next.poa_type = input.poaType
    next.poa_doc_name = input.poaDocName
    next.poa_status = 'pending'
  }

  next.reject_reason = null
  next.status = overallFrom(next.id_status, next.poa_status)
  next.submitted_at = now

  try {
    await supabase.from('kyc_submissions').upsert({
      user_id: userId,
      ...next,
      updated_at: now,
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('[KYC] submit failed (run add_kyc.sql?):', err instanceof Error ? err.message : err)
  }

  createNotification(userId, {
    type: 'kyc', severity: 'info',
    title: 'Documents submitted',
    message: 'Your verification documents are under review. This usually takes 1–2 business days.',
    metadata: { silent: true },
  })

  return next
}

/** Approve or reject a user's pending submission (compliance / admin action). */
export async function reviewKYC(
  userId: string, decision: 'approve' | 'reject', reason?: string
): Promise<KYCRecord> {
  const current = await getKYC(userId)
  const now = new Date().toISOString()
  const next: KYCRecord = { ...current, reviewed_at: now }

  if (decision === 'approve') {
    if (current.id_status === 'pending')  next.id_status = 'verified'
    if (current.poa_status === 'pending') next.poa_status = 'verified'
    next.reject_reason = null
  } else {
    if (current.id_status === 'pending')  next.id_status = 'rejected'
    if (current.poa_status === 'pending') next.poa_status = 'rejected'
    next.reject_reason = reason ?? 'Document could not be verified. Please upload a clearer copy.'
  }
  next.status = overallFrom(next.id_status, next.poa_status)

  try {
    await supabase.from('kyc_submissions').upsert({
      user_id: userId, ...next, updated_at: now,
    }, { onConflict: 'user_id' })
  } catch (err) {
    console.warn('[KYC] review failed:', err instanceof Error ? err.message : err)
  }

  if (next.status === 'verified') {
    createNotification(userId, {
      type: 'kyc', severity: 'success',
      title: 'Account verified',
      message: 'Your identity has been verified. All withdrawal limits are now unlocked.',
    })
  } else if (decision === 'reject') {
    createNotification(userId, {
      type: 'kyc', severity: 'warning',
      title: 'Verification needs attention',
      message: next.reject_reason!,
    })
  }

  return next
}

// ── Simulated auto-review (no human compliance desk) ──────────────────────────────
const AUTO_REVIEW_MS = Number(process.env.KYC_AUTO_REVIEW_MS ?? 90_000)

export function startKycMonitor(): void {
  if (AUTO_REVIEW_MS <= 0) {
    console.log('[KYC] auto-review disabled (KYC_AUTO_REVIEW_MS=0)')
    return
  }
  const tick = async () => {
    try {
      const cutoff = new Date(Date.now() - AUTO_REVIEW_MS).toISOString()
      const { data, error } = await supabase
        .from('kyc_submissions')
        .select('user_id')
        .eq('status', 'pending')
        .lte('submitted_at', cutoff)
        .limit(25)
      if (error || !data?.length) return
      for (const row of data as { user_id: string }[]) {
        await reviewKYC(row.user_id, 'approve')
      }
    } catch {
      // table missing or transient — ignore
    }
  }
  setInterval(tick, 30_000)
  console.log(`[KYC] auto-review monitor started (approves pending after ${Math.round(AUTO_REVIEW_MS / 1000)}s)`)
}
