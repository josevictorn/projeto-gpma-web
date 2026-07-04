import { api } from '@/lib/axios'

export type ContractFeeType = 'FIXED' | 'HOURLY' | 'SUCCESS' | 'MIXED'
export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface CreateContractBody {
  contractNumber: string
  lawyerId: string
  clientId: string
  caseId: string
  signedAt: string
  serviceDescription: string
  feeType: ContractFeeType
  feeValue: number
  paymentTerms: string
  status: ContractStatus
}

export interface CreateContractResponse {
  id: string
}

export async function createContract(body: CreateContractBody) {
  const response = await api.post<CreateContractResponse>('/contracts', body)
  return response.data
}