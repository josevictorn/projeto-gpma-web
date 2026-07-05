import { api } from '@/lib/axios'

export interface ContractPaymentStatusItem {
  contract_id: string
  contract_number: string
  client_id: string
  client_name: string
  billing_type: 'ONE_TIME' | 'MONTHLY' | 'INSTALLMENTS'
  monthly_fee: number
  next_due_date: string | null
  open_amount: number
  overdue_amount: number
  status: 'EM_DIA' | 'EM_ATRASO'
}

interface GetContractsPaymentStatusResponse {
  results: ContractPaymentStatusItem[]
  meta: PaginationMeta
}

export async function getContractsPaymentStatus(page = 1, search?: string) {
  const params = search ? { page, search } : { page }
  const response = await api.get<GetContractsPaymentStatusResponse>(
    '/financial/payments/contracts',
    { params }
  )

  return response.data
}
