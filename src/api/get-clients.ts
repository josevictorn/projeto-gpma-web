import { api } from '@/lib/axios'

export interface GetClientsResponse {
  results: Client[]
  meta: PaginationMeta
}

export async function getClients(page = 1, search?: string) {
  const params = search ? { page, search } : { page }
  const response = await api.get<GetClientsResponse>('/clients', { params })
  return response.data
}
