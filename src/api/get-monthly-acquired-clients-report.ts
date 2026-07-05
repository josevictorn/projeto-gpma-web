import { api } from '@/lib/axios'

export interface MonthlyAcquiredClientsPoint {
  month: string
  label: string
  total: number
}

export interface GetMonthlyAcquiredClientsReportResponse {
  points: MonthlyAcquiredClientsPoint[]
  summary: {
    total_clients_acquired: number
    average_per_month: number
    peak: MonthlyAcquiredClientsPoint
  }
}

export async function getMonthlyAcquiredClientsReport(months = 12) {
  const response = await api.get<GetMonthlyAcquiredClientsReportResponse>(
    '/reports/clients-acquired/monthly',
    { params: { months } }
  )

  return response.data
}
