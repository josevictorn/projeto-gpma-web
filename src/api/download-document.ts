import { api } from '@/lib/axios'

export async function downloadDocument(documentId: string) {
  const response = await api.get(`/documents/${documentId}/download`, {
    responseType: 'blob',
  })

  return response.data as Blob
}
