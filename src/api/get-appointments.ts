import { api } from '@/lib/axios'

interface GetAppointmentsResponse {
  appointments: Appointment[]
}

export async function getAppointments(month: number, year: number) {
  const response = await api.get<GetAppointmentsResponse>('/appointments', {
    params: { month, year },
  })

  return response.data.appointments
}