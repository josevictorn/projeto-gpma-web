import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Calendar, Clock, FileText, User } from 'lucide-react'
import { getAllClients } from '@/api/get-all-clients'
import { getCase } from '@/api/get-case'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'
import { CaseStatusControl } from './-case-status'
import { CaseUpdates } from './-case-updates'

export const Route = createFileRoute('/_app/cases/$caseId')({
  component: CaseDetailPage,
})

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-3.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  )
}

function CaseDetailPage() {
  const { caseId } = Route.useParams()
  const { userInfo } = useUser()
  const canManage = userInfo?.role === 'ADMIN'

  const { data: caseItem, isLoading, isError } = useQuery({
    queryKey: ['case', caseId],
    queryFn: () => getCase(caseId),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients', 'all'],
    queryFn: getAllClients,
    enabled: userInfo?.role === 'ADMIN' || userInfo?.role === 'LAWYER',
  })

  const clientName = clients?.find((client) => client.id === caseItem?.client_id)?.name

  return (
    <div className="p-6 space-y-6">
      <Link to="/cases" search={{ page: 1 }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" />
        Voltar para casos
      </Link>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Carregando caso...
        </div>
      ) : isError || !caseItem ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">Caso não encontrado.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/cases" search={{ page: 1 }}>Voltar para casos</Link>
          </Button>
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{caseItem.title}</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Detalhes do processo jurídico.
              </p>
            </div>
            <CaseStatusControl caseItem={caseItem} canEdit={canManage} />
          </div>

          {/* Case info */}
          <div className="rounded-lg border border-border bg-card">
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold">Informações</h2>
            </div>
            <Separator />
            <div className="divide-y divide-border/40">
              <InfoRow icon={User} label="Cliente">
                {clientName ?? (
                  <span className="text-muted-foreground">{caseItem.client_id}</span>
                )}
              </InfoRow>
              <InfoRow icon={FileText} label="Descrição">
                <p className="whitespace-pre-wrap text-foreground/90">{caseItem.description}</p>
              </InfoRow>
              <InfoRow icon={Calendar} label="Aberto em">
                {new Date(caseItem.created_at).toLocaleString('pt-BR')}
              </InfoRow>
              <InfoRow icon={Clock} label="Última atualização">
                {new Date(caseItem.updated_at).toLocaleString('pt-BR')}
              </InfoRow>
            </div>
          </div>

          {/* Movements timeline (issue #25) */}
          <CaseUpdates caseId={caseItem.id} canManage={canManage} />
        </>
      )}
    </div>
  )
}
