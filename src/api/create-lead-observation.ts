import { api } from '@/lib/axios'

export interface CreateLeadObservationBody {
  leadId: string
  description: string
}

export interface CreateLeadObservationResponse {
  id: string
}

export async function createLeadObservation(body: CreateLeadObservationBody) {
  const response = await api.post<CreateLeadObservationResponse>('/observacoes', body)
  return response.data
}
