import { api } from '@/lib/axios'

export interface UpdateCaseBody {
  title?: string
  description?: string
  status?: CaseStatus
  clientId?: string
  assignedLawyerId?: string
}

export async function updateCase(id: string, body: UpdateCaseBody) {
  const response = await api.patch<Case>(`/cases/${id}`, body)
  return response.data
}
