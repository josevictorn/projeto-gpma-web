import { api } from '@/lib/axios'

interface GetCaseUpdatesResponse {
  case_updates: CaseUpdate[]
}

// Returns the case movements already ordered chronologically (asc by date).
export async function getCaseUpdates(caseId: string) {
  const response = await api.get<GetCaseUpdatesResponse>(`/cases/${caseId}/updates`)
  return response.data.case_updates
}
