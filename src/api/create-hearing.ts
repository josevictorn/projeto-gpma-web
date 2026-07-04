import { api } from '@/lib/axios'

export interface CreateHearingBody {
  caseId: string
  title: string
  description?: string
  scheduledAt: string
  courtroom?: string
}

export interface CreateHearingResponse {
  id: string
}

export async function createHearing(body: CreateHearingBody) {
  const response = await api.post<CreateHearingResponse>('/audiencias', body)
  return response.data
}