import { api } from '@/lib/axios'

export interface GetLeadsResponse {
  results: Lead[]
  meta: PaginationMeta
}

export async function getLeads(page = 1, search?: string) {
  const params = search ? { page, search } : { page }
  const response = await api.get<GetLeadsResponse>('/leads', { params })
  return response.data
}
