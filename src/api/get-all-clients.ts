import { api } from '@/lib/axios'
import type { GetClientsResponse } from '@/api/get-clients'

/**
 * Fetches every client by paging through `/clients`. The backend offers no
 * search param, so the client selector loads the full list once and filters
 * locally. Used by the case form combobox.
 */
export async function getAllClients() {
  const first = await api.get<GetClientsResponse>('/clients', { params: { page: 1 } })
  const all = [...first.data.results]

  for (let page = 2; page <= first.data.meta.totalPages; page++) {
    const { data } = await api.get<GetClientsResponse>('/clients', { params: { page } })
    all.push(...data.results)
  }

  return all
}
