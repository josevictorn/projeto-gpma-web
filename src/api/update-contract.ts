import { api } from '@/lib/axios'
import type { CreateContractBody } from './create-contract'

export type UpdateContractBody = Partial<CreateContractBody>

export async function updateContract(id: string, body: UpdateContractBody) {
  const response = await api.patch<Contract>(`/contracts/${id}`, body)
  return response.data
}