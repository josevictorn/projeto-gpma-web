import { api } from '@/lib/axios'

export async function getLead(id: string) {
  const response = await api.get<Lead>(`/leads/${id}`)
  return response.data
}
