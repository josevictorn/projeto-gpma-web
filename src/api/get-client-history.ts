import { api } from '@/lib/axios'

interface GetClientHistoryResponse {
  history: ClientHistoryEntry[]
}

// Returns the client's cases ordered from newest to oldest (desc by created_at).
export async function getClientHistory(clientId: string) {
  const response = await api.get<GetClientHistoryResponse>(`/clients/${clientId}/history`)
  return response.data.history
}
