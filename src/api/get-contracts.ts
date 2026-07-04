import { api } from '@/lib/axios'

interface GetContractsResponse {
  results: Contract[]
  meta: PaginationMeta
}

export async function getContracts(page = 1, search?: string) {
  const params = search ? { page, search } : { page }
  const response = await api.get<GetContractsResponse>('/contracts', { params })
  return response.data
}