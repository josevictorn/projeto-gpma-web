import { api } from '@/lib/axios'

export interface ConvertLeadToClientBody {
  name: string
  email: string
  phone: string
  maritalStatus: string
  profession: string
  cpf: string
  rg: string
  issuingAgency: string
  street: string
  number: string
  neighborhood: string
  city: string
  state: string
  zipCode: string
}

export interface ConvertLeadToClientResponse {
  id: string
}

export async function convertLeadToClient(leadId: string, body: ConvertLeadToClientBody) {
  const response = await api.post<ConvertLeadToClientResponse>(`/leads/${leadId}/convert`, body)
  return response.data
}