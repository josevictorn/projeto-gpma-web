import { api } from '@/lib/axios'

export interface MonthlyRevenuePoint {
  month: string
  label: string
  expected: number
  received: number
}

export interface GetMonthlyRevenueReportResponse {
  points: MonthlyRevenuePoint[]
  summary: {
    total_expected: number
    total_received: number
    total_outstanding: number
  }
}

export async function getMonthlyRevenueReport(months = 12) {
  const response = await api.get<GetMonthlyRevenueReportResponse>(
    '/reports/revenue/monthly',
    { params: { months } }
  )

  return response.data
}
