import { api } from '@/lib/axios'

interface LostLeadsPoint {
  month: string
  label: string
  total: number
}

interface LostLeadsSummary {
  total_leads_lost: number
  average_per_month: number
  peak: LostLeadsPoint
}

export interface MonthlyLostLeadsReportResponse {
  points: LostLeadsPoint[]
  summary: LostLeadsSummary
}

export async function getMonthlyLostLeadsReport(months = 12) {
  const response = await api.get<MonthlyLostLeadsReportResponse>(
    '/reports/leads-lost/monthly',
    {
      params: { months },
    }
  )

  return response.data
}
