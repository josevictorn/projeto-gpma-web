import { api } from '@/lib/axios'

// Generic CRUD endpoint — tolerate both a raw object and a wrapped response.
export async function getCaseUpdate(id: string) {
  const response = await api.get<CaseUpdate | { case_update: CaseUpdate }>(`/case-updates/${id}`)
  const data = response.data
  return 'case_update' in data ? data.case_update : data
}
