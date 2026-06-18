import { create } from 'zustand'
import { getKYC, submitKYC, KYCRecord, OverallStatus, SubmitKYCInput } from '../api/kyc'

const DEFAULT: KYCRecord = {
  status: 'unverified',
  id_type: null,  id_doc_name: null,  id_status: 'empty',
  poa_type: null, poa_doc_name: null, poa_status: 'empty',
  reject_reason: null, submitted_at: null, reviewed_at: null,
}

interface KYCState {
  record:  KYCRecord
  loaded:  boolean
  load:    () => Promise<void>
  submit:  (input: SubmitKYCInput) => Promise<void>
  start:   () => void
  stop:    () => void
}

let timer: ReturnType<typeof setInterval> | null = null

export const useKYCStore = create<KYCState>((set, get) => ({
  record: DEFAULT,
  loaded: false,

  load: async () => {
    try {
      const record = await getKYC()
      set({ record, loaded: true })
    } catch {
      set({ loaded: true })
    }
  },

  submit: async (input) => {
    const record = await submitKYC(input)
    set({ record, loaded: true })
  },

  start: () => {
    if (timer) return
    get().load()
    // Poll so the simulated review (pending → verified) reflects without a refresh.
    timer = setInterval(() => get().load(), 30_000)
  },

  stop: () => { if (timer) { clearInterval(timer); timer = null } },
}))

/** Convenience selector matching the old getKYCStatus() shape. */
export function kycStatusFrom(record: KYCRecord): OverallStatus {
  return record.status
}
