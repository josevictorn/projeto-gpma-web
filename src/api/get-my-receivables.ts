import { api } from '@/lib/axios'

export type ClientReceivableStatus = 'OPEN' | 'PARTIAL' | 'PAID' | 'CANCELED'

export interface ClientReceivableItem {
  receivable_id: string
  contract_id: string
  contract_number: string
  payment_terms: string
  competence_month: string
  due_date: string
  amount: number
  amount_paid: number
  outstanding_amount: number
  status: ClientReceivableStatus
}

interface GetMyReceivablesResponse {
  results: ClientReceivableItem[]
  meta: PaginationMeta
}

export async function getMyReceivables(
  page = 1,
  status?: 'OPEN' | 'PARTIAL' | 'PAID'
) {
  const params = status ? { page, status } : { page }
  const response = await api.get<GetMyReceivablesResponse>(
    '/financial/payments/my-receivables',
    { params }
  )

  return response.data
}
