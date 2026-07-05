import { api } from '@/lib/axios'

export async function payMyReceivable(receivableId: string) {
  await api.post(`/financial/payments/my-receivables/${receivableId}/pay`)
}
