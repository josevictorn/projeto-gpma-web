import { api } from '@/lib/axios'

export interface LeadObservation {
  id: string
  lead_id: string
  description: string
  created_at: string
  updated_at: string
}

export async function getLeadObservations(leadId: string) {
  const response = await api.get<{ observations: LeadObservation[] }>(`/leads/${leadId}/observacoes`)
  return response.data.observations
}
