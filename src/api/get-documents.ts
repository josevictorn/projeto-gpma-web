import { api } from '@/lib/axios'

interface GetDocumentsResponse {
  results: CaseDocument[]
  meta: PaginationMeta
}

export async function getDocuments(caseId: string, page = 1) {
  const response = await api.get<GetDocumentsResponse>('/documents', {
    params: { caseId, page },
  })

  return response.data
}
