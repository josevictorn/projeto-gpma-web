import { api } from '@/lib/axios'

export async function deletePaymentMethod(id: string) {
  const response = await api.delete(`/payment-methods/${id}`)
  return response.data
}
