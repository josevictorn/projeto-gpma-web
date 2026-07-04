import { api } from '@/lib/axios'

export async function deleteContract(id: string) {
  const response = await api.delete(`/contracts/${id}`)
  return response.data
}