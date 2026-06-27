import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, FileText, History, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createCaseUpdate } from '@/api/create-case-update'
import { getCaseUpdate } from '@/api/get-case-update'
import { getCaseUpdates } from '@/api/get-case-updates'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { getErrorMessage } from '@/lib/get-error-message'

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Create movement dialog ───────────────────────────────────────────────────

const updateSchema = z.object({
  date: z.string().min(1, 'Informe a data'),
  type: z.string().min(1, 'Campo obrigatório'),
  description: z.string().min(1, 'Campo obrigatório'),
})

type UpdateForm = z.infer<typeof updateSchema>

function CaseUpdateFormDialog({
  caseId,
  open,
  onClose,
}: {
  caseId: string
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, reset } = useForm<UpdateForm>({
    resolver: zodResolver(updateSchema),
    defaultValues: { date: '', type: '', description: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ date: '', type: '', description: '' })
    }
  }, [open, reset])

  const { mutate, isPending } = useMutation({
    // `datetime-local` yields local time without zone — normalize to ISO 8601.
    mutationFn: (data: UpdateForm) =>
      createCaseUpdate(caseId, {
        date: new Date(data.date).toISOString(),
        type: data.type,
        description: data.description,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-updates', caseId] })
      toast.success('Movimentação registrada.')
      reset()
      onClose()
    },
    onError: (error) => {
      if ((error as { response?: { status?: number } }).response?.status === 404) {
        toast.error('Processo não encontrado.')
      } else {
        toast.error(getErrorMessage(error, 'Erro ao registrar movimentação.'))
      }
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) { reset(); onClose() } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova movimentação</DialogTitle>
          <DialogDescription>Registre um andamento deste processo.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Data</p>
            <Input type="datetime-local" {...register('date')} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Tipo</p>
            <Input {...register('type')} placeholder="Ex: Petição, Audiência, Despacho" />
            {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Descrição</p>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Descreva a movimentação..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
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

// ── Movement detail dialog ───────────────────────────────────────────────────

function CaseUpdateDetailDialog({
  updateId,
  open,
  onClose,
}: {
  updateId: string | null
  open: boolean
  onClose: () => void
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['case-update', updateId],
    queryFn: () => getCaseUpdate(updateId as string),
    enabled: open && !!updateId,
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Detalhe da movimentação</DialogTitle>
          <DialogDescription>
            {data ? formatDateTime(data.date) : 'Carregando...'}
          </DialogDescription>
        </DialogHeader>
        {isLoading || !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Tipo</p>
              <p className="text-sm font-medium">{data.type}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Descrição</p>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{data.description}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Registrado em</p>
              <p className="text-sm">{formatDateTime(data.created_at)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export function CaseUpdates({ caseId, canManage }: { caseId: string; canManage: boolean }) {
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const { data: updates, isLoading } = useQuery({
    queryKey: ['case-updates', caseId],
    queryFn: () => getCaseUpdates(caseId),
  })

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Movimentações{' '}
            <span className="ml-1 text-muted-foreground font-normal">({updates?.length ?? 0})</span>
          </h2>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="size-3.5" />
            Nova movimentação
          </Button>
        )}
      </div>
      <Separator />

      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Carregando movimentações...
        </div>
      ) : !updates || updates.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Nenhuma movimentação registrada ainda.
        </div>
      ) : (
        <ol className="relative px-5 py-4">
          {updates.map((update, i) => (
            <li key={update.id} className="relative flex gap-4 pb-5 last:pb-0">
              {/* Timeline rail */}
              <div className="flex flex-col items-center">
                <span className="mt-1 size-2.5 shrink-0 rounded-full bg-primary ring-4 ring-primary/10" />
                {i < updates.length - 1 && <span className="w-px flex-1 bg-border" />}
              </div>
              <button
                type="button"
                onClick={() => setDetailId(update.id)}
                className="flex-1 min-w-0 rounded-md text-left -mt-0.5 outline-none hover:opacity-80 transition-opacity"
                title="Ver detalhe"
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  {formatDateTime(update.date)}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-medium">
                  <FileText className="size-3.5 text-muted-foreground" />
                  {update.type}
                </p>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                  {update.description}
                </p>
              </button>
            </li>
          ))}
        </ol>
      )}

      <CaseUpdateFormDialog caseId={caseId} open={formOpen} onClose={() => setFormOpen(false)} />
      <CaseUpdateDetailDialog updateId={detailId} open={!!detailId} onClose={() => setDetailId(null)} />
    </div>
  )
}
