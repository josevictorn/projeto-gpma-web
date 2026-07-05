import { api } from '@/lib/axios'

export async function deleteDocument(documentId: string) {
  await api.delete(`/documents/${documentId}`)
}
