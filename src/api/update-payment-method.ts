import { api } from '@/lib/axios'
import type { CreatePaymentMethodBody } from './create-payment-method'

// Any subset of the create fields (camelCase).
export type UpdatePaymentMethodBody = Partial<CreatePaymentMethodBody>

export async function updatePaymentMethod(
  id: string,
  body: UpdatePaymentMethodBody
) {
  const response = await api.patch<PaymentMethod>(
    `/payment-methods/${id}`,
    body
  )
  return response.data
}
