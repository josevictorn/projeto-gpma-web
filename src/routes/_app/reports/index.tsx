import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { BarChart3, TrendingUp, Users } from 'lucide-react'
import { useMemo, useState } from 'react'
import { getMonthlyAcquiredClientsReport } from '@/api/get-monthly-acquired-clients-report'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_app/reports/')({
  component: ReportsPage,
  beforeLoad: ({ context }) => {
    if (context.userRole === 'CLIENT') {
      throw redirect({ to: '/dashboard', search: { unauthorized: true } })
    }
  },
})

function ReportsLineChart({ points }: { points: Array<{ label: string; total: number }> }) {
  const width = 900
  const height = 320
  const paddingTop = 24
  const paddingBottom = 52
  const paddingLeft = 28
  const paddingRight = 24
  const innerWidth = width - paddingLeft - paddingRight
  const innerHeight = height - paddingTop - paddingBottom
  const maxValue = Math.max(...points.map((point) => point.total), 1)
  const stepX = points.length > 1 ? innerWidth / (points.length - 1) : innerWidth

  const chartPoints = points.map((point, index) => {
    const x = paddingLeft + index * stepX
    const y = paddingTop + innerHeight - (point.total / maxValue) * innerHeight
    return { ...point, x, y }
  })

  const polylinePoints = chartPoints.map((point) => `${point.x},${point.y}`).join(' ')
  const yTicks = Array.from({ length: 5 }, (_, index) => {
    const value = Math.round((maxValue / 4) * index)
    const y = paddingTop + innerHeight - (value / maxValue) * innerHeight
    return { value, y }
  })

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="min-w-[680px] w-full h-[320px]"
        role="img"
        aria-label="Gráfico de clientes adquiridos por mês"
      >
        <defs>
          <linearGradient id="line-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yTicks.map((tick) => (
          <g key={tick.y}>
            <line
              x1={paddingLeft}
              y1={tick.y}
              x2={width - paddingRight}
              y2={tick.y}
              stroke="var(--border)"
              strokeDasharray="3 6"
            />
            <text
              x={paddingLeft - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize="11"
            >
              {tick.value}
            </text>
          </g>
        ))}

        {chartPoints.length > 1 && (
          <polygon
            points={`${paddingLeft},${paddingTop + innerHeight} ${polylinePoints} ${paddingLeft + innerWidth},${paddingTop + innerHeight}`}
            fill="url(#line-fill)"
          />
        )}

        <polyline
          points={polylinePoints}
          fill="none"
          stroke="var(--chart-1)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chartPoints.map((point, index) => (
          <g key={`${point.label}-${point.total}`}>
            <circle
              cx={point.x}
              cy={point.y}
              r="4"
              fill="var(--background)"
              stroke="var(--chart-1)"
              strokeWidth="2"
            />
            {(index === 0 || index === chartPoints.length - 1 || index % 2 === 0) && (
              <text
                x={point.x}
                y={height - 18}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize="11"
              >
                {point.label}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function ReportsPage() {
  const [months, setMonths] = useState(12)

  const { data, isLoading } = useQuery({
    queryKey: ['reports', 'clients-acquired-monthly', months],
    queryFn: () => getMonthlyAcquiredClientsReport(months),
  })

  const lastMonth = useMemo(() => {
    if (!data?.points.length) {
      return null
    }

    return data.points[data.points.length - 1]
  }, [data])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Relatórios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Evolução mensal de clientes adquiridos (conversão de lead e cadastro direto).
          </p>
        </div>

        <div className="w-full sm:w-52">
          <p className="text-xs text-muted-foreground mb-1.5">Período</p>
          <Select value={String(months)} onValueChange={(value) => setMonths(Number(value))}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes no período</p>
                <p className="text-3xl font-bold tracking-tight mt-2">
                  {isLoading ? '...' : data?.summary.total_clients_acquired ?? 0}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-500/10">
                <Users className="size-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média mensal</p>
                <p className="text-3xl font-bold tracking-tight mt-2">
                  {isLoading ? '...' : (data?.summary.average_per_month ?? 0).toFixed(1)}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-500/10">
                <BarChart3 className="size-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pico mensal</p>
                <p className="text-3xl font-bold tracking-tight mt-2">
                  {isLoading ? '...' : data?.summary.peak.total ?? 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {isLoading ? '' : data?.summary.peak.label}
                </p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-500/10">
                <TrendingUp className="size-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Clientes adquiridos por mês</CardTitle>
        </CardHeader>
        <Separator />
        <CardContent className="pt-5">
          {isLoading ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              Carregando relatório...
            </div>
          ) : (data?.points.length ?? 0) === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-sm text-muted-foreground">
              Sem dados para o período selecionado.
            </div>
          ) : (
            <ReportsLineChart points={data?.points ?? []} />
          )}
        </CardContent>
      </Card>

      {lastMonth && (
        <p className="text-xs text-muted-foreground">
          Último mês ({lastMonth.label}): <span className="font-medium text-foreground">{lastMonth.total}</span>{' '}
          cliente(s) adquirido(s).
        </p>
      )}
    </div>
  )
}
