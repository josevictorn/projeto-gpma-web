import { api } from '@/lib/axios'

export async function getCase(id: string) {
  const response = await api.get<Case>(`/cases/${id}`)
  return response.data
}
