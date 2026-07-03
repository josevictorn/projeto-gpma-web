import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLeadObservation } from '@/api/create-lead-observation'
import { getLead } from '@/api/get-lead'
import { getLeadObservations } from '@/api/get-lead-observations'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { useUser } from '@/contexts/user'
import { getErrorMessage } from '@/lib/get-error-message'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_app/leads/$leadId')({
  component: LeadDetailPage,
})

const observationSchema = z.object({
  description: z.string().min(1, 'Informe a observação'),
})

type ObservationForm = z.infer<typeof observationSchema>

function ObservationFormDialog({
  leadId,
  open,
  onClose,
}: {
  leadId: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ObservationForm>({
    resolver: zodResolver(observationSchema),
    defaultValues: { description: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ description: '' })
    }
  }, [open, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ObservationForm) =>
      createLeadObservation({ leadId, description: data.description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead-observations', leadId] })
      toast.success('Observação registrada com sucesso.')
      reset()
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao registrar observação.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova observação</DialogTitle>
          <DialogDescription>Registre uma observação para este lead.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Observação</p>
            <textarea
              {...register('description')}
              rows={5}
              className="min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Digite a observação..."
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function LeadObservationsTimeline({
  observations,
  isLoading,
}: {
  observations?: LeadObservation[];
  isLoading: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="px-5 py-4">
        <h2 className="text-sm font-semibold">Histórico de observações</h2>
      </div>
      <Separator />
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Carregando observações...
        </div>
      ) : !observations || observations.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma observação registrada ainda.
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {observations.map((item) => (
            <li key={item.id} className="px-5 py-4">
              <p className="text-sm font-medium">{item.description}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Registrado em {new Date(item.created_at).toLocaleString('pt-BR')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function LeadDetailPage() {
  const { leadId } = Route.useParams()
  const { userInfo } = useUser()
  const [formOpen, setFormOpen] = useState(false)

  const { data: lead, isLoading, isError } = useQuery({
    queryKey: ['lead', leadId],
    queryFn: () => getLead(leadId),
  })

  const { data: observations, isLoading: isObservationsLoading } = useQuery({
    queryKey: ['lead-observations', leadId],
    queryFn: () => getLeadObservations(leadId),
    enabled: !!leadId,
  })

  const canManage = userInfo?.role === 'ADMIN'

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            to="/leads"
            search={{ page: 1 }}
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="inline-block size-4 mr-2 align-text-bottom" />
            Voltar para leads
          </Link>
          <h1 className="mt-4 text-xl font-semibold tracking-tight">Detalhe do lead</h1>
          <p className="text-sm text-muted-foreground mt-1">Registre observações para acompanhar o atendimento.</p>
        </div>
        {canManage && (
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            Nova observação
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
          Carregando lead...
        </div>
      ) : isError || !lead ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-muted-foreground">Lead não encontrado.</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/leads" search={{ page: 1 }}>Voltar para leads</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-lg border border-border bg-card">
            <div className="px-5 py-4">
              <h2 className="text-sm font-semibold">Informações do lead</h2>
            </div>
            <Separator />
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Nome</p>
                <p className="mt-1 text-sm font-medium">{lead.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="mt-1 text-sm font-medium">{lead.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Telefone</p>
                <p className="mt-1 text-sm font-medium">{lead.phone}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="mt-1 text-sm font-medium">{lead.status}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Criado em</p>
                <p className="mt-1 text-sm font-medium">{new Date(lead.created_at).toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Atualizado em</p>
                <p className="mt-1 text-sm font-medium">{new Date(lead.updated_at).toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <LeadObservationsTimeline observations={observations} isLoading={isObservationsLoading} />
        </div>
      )}

      <ObservationFormDialog leadId={leadId} open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  )
}
