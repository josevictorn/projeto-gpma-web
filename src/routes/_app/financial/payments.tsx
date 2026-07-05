import { useQuery } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { AlertCircle, CalendarClock, CheckCircle2, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { getContractsPaymentStatus } from '@/api/get-contracts-payment-status'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'

export const Route = createFileRoute('/_app/financial/payments')({
  component: PaymentsPage,
  beforeLoad: ({ context }) => {
    if (context.userRole !== 'ADMIN') {
      throw redirect({ to: '/dashboard', search: { unauthorized: true } })
    }
  },
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
    search: z.string().optional(),
  }),
})

function statusBadge(status: 'EM_DIA' | 'EM_ATRASO') {
  if (status === 'EM_DIA') {
    return {
      label: 'Em dia',
      className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
    }
  }

  return {
    label: 'Em atraso',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    icon: AlertCircle,
  }
}

function PaymentsPage() {
  const navigate = useNavigate()
  const { page, search } = Route.useSearch()
  const { userInfo } = useUser()
  const [searchTerm, setSearchTerm] = useState(search ?? '')

  useEffect(() => {
    setSearchTerm(search ?? '')
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['financial', 'payments-status', page, search],
    queryFn: () => getContractsPaymentStatus(page, search),
    enabled: userInfo?.role === 'ADMIN',
  })

  const contracts = data?.results ?? []
  const meta = data?.meta

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pagamentos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Acompanhe contratos ativos, cliente vinculado e situação financeira (em dia ou em atraso).
          </p>
        </div>
        <div className="flex w-full items-center gap-2 sm:w-[360px]">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por cliente ou contrato"
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                navigate({
                  to: '/financial/payments',
                  search: { page: 1, search: searchTerm.trim() || undefined },
                })
              }
            }}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              navigate({
                to: '/financial/payments',
                search: { page: 1, search: searchTerm.trim() || undefined },
              })
            }
          >
            <Search className="mr-2 size-3.5" />
            Buscar
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <CalendarClock className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Contratos ativos{' '}
            <span className="ml-1 font-normal text-muted-foreground">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando pagamentos...
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum contrato ativo encontrado.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Contrato</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Próx. vencimento</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Em aberto</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Em atraso</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Situação</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((item, index) => {
                const badge = statusBadge(item.status)
                const Icon = badge.icon

                return (
                  <tr
                    key={item.contract_id}
                    className={`transition-colors hover:bg-muted/30 ${index < contracts.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-medium">{item.contract_number}</td>
                    <td className="px-5 py-3.5 text-muted-foreground">{item.client_name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                      {item.next_due_date
                        ? new Date(item.next_due_date).toLocaleDateString('pt-BR')
                        : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">
                      {formatCurrencyBRL(item.open_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">
                      {formatCurrencyBRL(item.overdue_amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>
                        <Icon className="size-3.5" />
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
            <span className="text-xs text-muted-foreground">
              Página {meta.currentPage} de {meta.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => navigate({ to: '/financial/payments', search: { page: page - 1, search } })}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => navigate({ to: '/financial/payments', search: { page: page + 1, search } })}
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
