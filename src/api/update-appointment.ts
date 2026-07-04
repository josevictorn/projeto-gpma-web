import { api } from '@/lib/axios'

export interface UpdateAppointmentBody {
  title: string
  description?: string
  startsAt: string
}

export interface UpdateAppointmentResponse {
  id: string
}

export async function updateAppointment(id: string, body: UpdateAppointmentBody) {
  const response = await api.patch<UpdateAppointmentResponse>(`/appointments/${id}`, body)
  return response.data
}