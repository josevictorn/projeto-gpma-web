import { api } from '@/lib/axios'

// Body uses camelCase (isActive), while responses return snake_case (is_active).
export interface CreatePaymentMethodBody {
  name: string
  description?: string
  isActive?: boolean
}

export interface CreatePaymentMethodResponse {
  id: string
}

export async function createPaymentMethod(body: CreatePaymentMethodBody) {
  const response = await api.post<CreatePaymentMethodResponse>(
    '/payment-methods',
    body
  )
  return response.data
}
