import api from './client'

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

export interface SubmitKYCInput {
  idType?:     string
  idDocName?:  string
  poaType?:    string
  poaDocName?: string
}

export const getKYC = () =>
  api.get<KYCRecord>('/kyc').then(r => r.data)

export const submitKYC = (input: SubmitKYCInput) =>
  api.post<KYCRecord>('/kyc/submit', input).then(r => r.data)
