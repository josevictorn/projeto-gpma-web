import { api } from '@/lib/axios'

export interface CreateCaseUpdateBody {
  // ISO 8601 date/time, e.g. "2026-06-26T14:30:00Z"
  date: string
  type: string
  description: string
}

interface CreateCaseUpdateResponse {
  case_update: CaseUpdate
}

export async function createCaseUpdate(caseId: string, body: CreateCaseUpdateBody) {
  const response = await api.post<CreateCaseUpdateResponse>(`/cases/${caseId}/updates`, body)
  return response.data.case_update
}
