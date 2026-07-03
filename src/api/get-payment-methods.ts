import { api } from '@/lib/axios'

export interface GetPaymentMethodsResponse {
  results: PaymentMethod[]
  meta: PaginationMeta
}

export async function getPaymentMethods(page = 1, search?: string) {
  const params = search ? { page, search } : { page }
  const response = await api.get<GetPaymentMethodsResponse>('/payment-methods', {
    params,
  })
  return response.data
}
