import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowUpRight,
  Briefcase,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  Users,
} from 'lucide-react'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { z } from 'zod'
import { getCases } from '@/api/get-cases'
import { getClients } from '@/api/get-clients'
import { getLeads } from '@/api/get-leads'
import { useUser } from '@/contexts/user'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const Route = createFileRoute('/_app/dashboard/')({
  component: DashboardPage,
  validateSearch: z.object({
    unauthorized: z.boolean().optional(),
  }),
})

const caseStatusConfig: Record<CaseStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Aberto',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  PENDING: {
    label: 'Pendente',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  CLOSED: {
    label: 'Encerrado',
    className: 'bg-muted text-muted-foreground',
  },
}

// Agenda/audiências ainda não têm módulo no backend — dados ilustrativos.
const upcomingHearings = [
  {
    id: 1,
    process: 'Processo nº 0001234-12.2026',
    client: 'Carlos Mendonça',
    time: '09:00',
    date: 'Hoje',
    location: 'Vara do Trabalho — Natal',
    urgent: true,
  },
  {
    id: 2,
    process: 'Processo nº 0005678-45.2026',
    client: 'Roberto Alves',
    time: '14:30',
    date: 'Hoje',
    location: '2ª Vara Criminal — Natal',
    urgent: true,
  },
  {
    id: 3,
    process: 'Processo nº 0009012-78.2026',
    client: 'Ana Paula Ferreira',
    time: '10:00',
    date: 'Amanhã',
    location: '3ª Vara Cível — Natal',
    urgent: false,
  },
]

function DashboardPage() {
  const { unauthorized } = Route.useSearch()

  useEffect(() => {
    if (unauthorized) {
      toast.error('Acesso negado. Você não tem permissão para acessar esta área.')
    }
  }, [unauthorized])

  const { userInfo } = useUser()

  const { data: leadsData } = useQuery({ queryKey: ['leads', 1], queryFn: () => getLeads(1), enabled: userInfo?.role !== 'CLIENT' })
  const { data: clientsData } = useQuery({ queryKey: ['clients', 1], queryFn: () => getClients(1), enabled: userInfo?.role !== 'CLIENT' })
  const { data: casesData, isLoading: loadingCases } = useQuery({
    queryKey: ['cases', 1],
    queryFn: () => getCases(1),
  })

  const clientNameById = new Map((clientsData?.results ?? []).map((c) => [c.id, c.name]))
  const recentCases = (casesData?.results ?? []).slice(0, 5)

  const fmt = (n?: number) => (n === undefined ? '—' : String(n))

  const metrics: Array<{
    label: string
    value: string
    hint: string
    icon: React.ElementType
    color: string
    bg: string
  }> = [
    {
      label: 'Casos',
      value: fmt(casesData?.meta.totalCount),
      hint: 'Total cadastrado',
      icon: Briefcase,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Leads',
      value: fmt(leadsData?.meta.totalCount),
      hint: 'No funil de captação',
      icon: Users,
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Clientes',
      value: fmt(clientsData?.meta.totalCount),
      hint: 'Cadastrados',
      icon: UserCheck,
      color: 'text-emerald-500',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Audiências Hoje',
      value: '—',
      hint: 'Agenda não integrada',
      icon: Calendar,
      color: 'text-violet-500',
      bg: 'bg-violet-500/10',
    },
  ]

  const visibleMetrics = (userInfo?.role === 'CLIENT' || userInfo?.role === 'LAWYER')
    ? metrics.filter((m) => m.label === 'Casos' || m.label === 'Audiências Hoje')
    : metrics

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  // If logged user is a CLIENT, show upcoming hearings only for their cases
  // If logged user is a LAWYER, show upcoming hearings only for cases assigned to them
  const displayedHearings = userInfo?.role === 'CLIENT'
    ? (casesData?.results ?? []).slice(0, 5).map((c) => ({
        id: c.id,
        process: `Caso: ${c.title}`,
        client: userInfo.name,
        time: new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        date: new Date(c.created_at).toLocaleDateString('pt-BR'),
        location: 'Tribunal (não integrado)',
        urgent: false,
      }))
    : userInfo?.role === 'LAWYER'
    ? (casesData?.results ?? [])
        .filter((c) => c.assigned_lawyer_id === userInfo.id)
        .slice(0, 5)
        .map((c) => ({
          id: c.id,
          process: `Caso: ${c.title}`,
          client: clientNameById.get(c.client_id) ?? '—',
          time: new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          date: new Date(c.created_at).toLocaleDateString('pt-BR'),
          location: 'Tribunal (não integrado)',
          urgent: false,
        }))
    : upcomingHearings

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Meu Painel</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {visibleMetrics.map((metric) => {
          const Icon = metric.icon
          return (
            <Card key={metric.label} className="relative overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-3xl font-bold tracking-tight">{metric.value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${metric.bg}`}>
                    <Icon className={`size-5 ${metric.color}`} />
                  </div>
                </div>
                <div className="mt-4 text-xs text-muted-foreground">{metric.hint}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent cases */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold">Casos Recentes</CardTitle>
            <Link
              to="/cases"
              search={{ page: 1 }}
              className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-4"
            >
              Ver todos
              <ArrowUpRight className="size-3" />
            </Link>
          </CardHeader>
          <Separator />
          <CardContent className="p-0">
            {loadingCases ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Carregando casos...
              </div>
            ) : recentCases.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Nenhum caso cadastrado ainda.
              </div>
            ) : (
              <>
                {/* Desktop table */}
                <table className="hidden w-full text-sm md:table">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Título</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Cliente</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Abertura</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentCases.map((caso, i) => (
                      <tr
                        key={caso.id}
                        className={`transition-colors hover:bg-muted/40 ${i < recentCases.length - 1 ? 'border-b border-border/40' : ''}`}
                      >
                        <td className="px-5 py-3.5 font-medium">{caso.title}</td>
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {clientNameById.get(caso.client_id) ?? '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${caseStatusConfig[caso.status].className}`}>
                            {caseStatusConfig[caso.status].label}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">
                          {new Date(caso.created_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile card list */}
                <div className="divide-y divide-border/40 md:hidden">
                  {recentCases.map((caso) => (
                    <div key={caso.id} className="flex flex-col gap-2 px-4 py-3.5 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm truncate">{caso.title}</span>
                        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${caseStatusConfig[caso.status].className}`}>
                          {caseStatusConfig[caso.status].label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{clientNameById.get(caso.client_id) ?? '—'}</span>
                        <span className="ml-auto">{new Date(caso.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Upcoming hearings — agenda ainda não integrada ao backend */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-semibold">Próximas Audiências</CardTitle>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                Em breve
              </span>
            </div>
          </CardHeader>
          <Separator />
          <CardContent className="p-4 space-y-3">
            {displayedHearings.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                Sem audiências marcadas.
              </div>
            ) : (
              displayedHearings.map((hearing) => (
                <div
                  key={hearing.id}
                  className={`rounded-lg border p-3.5 transition-colors hover:bg-muted/30 ${hearing.urgent ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-xs font-medium leading-tight line-clamp-1">
                      {hearing.client}
                    </p>
                    {hearing.urgent ? (
                      <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                        Hoje
                      </span>
                    ) : (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {hearing.date}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-mono text-muted-foreground mb-2 line-clamp-1">
                    {hearing.process}
                  </p>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {hearing.time}
                    </span>
                    <span className="flex items-center gap-1 line-clamp-1">
                      <MapPin className="size-3 shrink-0" />
                      <span className="truncate">{hearing.location}</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
