import { api } from '@/lib/axios'

// `status` is accepted but ignored on creation (always created as "OPEN").
export interface CreateCaseBody {
  title: string
  description: string
  clientId: string
  assignedLawyerId: string
}

// This endpoint wraps the created resource in a `case` key.
export interface CreateCaseResponse {
  case: Case
}

export async function createCase(body: CreateCaseBody) {
  const response = await api.post<CreateCaseResponse>('/cases', body)
  return response.data.case
}
