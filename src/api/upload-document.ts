import { api } from '@/lib/axios'

interface UploadDocumentInput {
  caseId: string
  category: DocumentCategory
  title: string
  visibleToClient: boolean
  file: File
}

export async function uploadDocument(input: UploadDocumentInput) {
  const formData = new FormData()
  formData.append('caseId', input.caseId)
  formData.append('category', input.category)
  formData.append('title', input.title)
  formData.append('visibleToClient', String(input.visibleToClient))
  formData.append('file', input.file)

  const response = await api.post<CaseDocument>('/documents/upload', formData)

  return response.data
}
