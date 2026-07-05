import { api } from '@/lib/axios'
import type { CreateHearingBody } from './create-hearing'

interface UpdateHearingResponse {
  id: string
}

export async function updateHearing(
  appointmentId: string,
  body: CreateHearingBody
) {
  const response = await api.patch<UpdateHearingResponse>(
    `/audiencias/appointment/${appointmentId}`,
    body
  )

  return response.data
}
