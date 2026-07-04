import { api } from '@/lib/axios'

export interface CreateAppointmentBody {
  title: string
  description?: string
  startsAt: string
}

export interface CreateAppointmentResponse {
  id: string
}

export async function createAppointment(body: CreateAppointmentBody) {
  const response = await api.post<CreateAppointmentResponse>('/appointments', body)
  return response.data
}