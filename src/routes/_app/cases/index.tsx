import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import type { AxiosError } from 'axios'
import { Briefcase, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useUser } from '@/contexts/user'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createCase } from '@/api/create-case'
import { deleteCase } from '@/api/delete-case'
import { getCases } from '@/api/get-cases'
import { getClients } from '@/api/get-clients'
import { updateCase } from '@/api/update-case'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { getErrorMessage } from '@/lib/get-error-message'

export const Route = createFileRoute('/_app/cases/')({
  component: CasesPage,
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
})

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  OPEN: {
    label: 'Aberto',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  PENDING: {
    label: 'Pendente',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  CLOSED: {
    label: 'Encerrado',
    className: 'bg-muted text-muted-foreground border-border',
  },
}

const statusOrder: CaseStatus[] = ['OPEN', 'PENDING', 'CLOSED']

function StatusBadge({ status }: { status: CaseStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ── Case form dialog (create / edit) ─────────────────────────────────────────

const caseSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  description: z.string().min(1, 'Campo obrigatório'),
  clientId: z.string().uuid('Selecione um cliente'),
  status: z.enum(['OPEN', 'PENDING', 'CLOSED']),
})

type CaseForm = z.infer<typeof caseSchema>

interface CaseFormDialogProps {
  caseItem: Case | null
  clients: Client[]
  open: boolean
  onClose: () => void
}

function CaseFormDialog({ caseItem, clients, open, onClose }: CaseFormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!caseItem
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<CaseForm>({
    resolver: zodResolver(caseSchema),
    defaultValues: { title: '', description: '', clientId: '', status: 'OPEN' },
  })

  useEffect(() => {
    if (open) {
      reset(
        caseItem
          ? {
              title: caseItem.title,
              description: caseItem.description,
              clientId: caseItem.client_id,
              status: caseItem.status,
            }
          : { title: '', description: '', clientId: '', status: 'OPEN' }
      )
    }
  }, [open, caseItem, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CaseForm) =>
      isEditing
        ? updateCase(caseItem.id, data)
        : createCase({ title: data.title, description: data.description, clientId: data.clientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success(isEditing ? 'Caso atualizado com sucesso.' : 'Caso criado com sucesso.')
      reset()
      onClose()
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 404) {
        toast.error('Cliente vinculado não encontrado.')
      } else {
        toast.error(getErrorMessage(error, isEditing ? 'Erro ao atualizar caso.' : 'Erro ao criar caso.'))
      }
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { reset(); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar caso' : 'Novo caso'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações deste caso.'
              : 'Abra um novo caso vinculado a um cliente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Título</p>
            <Input {...register('title')} placeholder="Ex: Ação trabalhista" />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Descrição</p>
            <textarea
              {...register('description')}
              rows={3}
              placeholder="Descreva o caso..."
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Cliente</p>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.clientId && <p className="text-xs text-destructive">{errors.clientId.message}</p>}
            {clients.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Cadastre um cliente antes de abrir um caso.
              </p>
            )}
          </div>
          {isEditing && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Status</p>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOrder.map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusConfig[status].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending || (!isEditing && clients.length === 0)}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar caso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteCaseDialogProps {
  caseItem: Case | null
  open: boolean
  onClose: () => void
}

function DeleteCaseDialog({ caseItem, open, onClose }: DeleteCaseDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteCase(caseItem!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      toast.success('Caso removido.')
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Erro ao remover caso.')),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover caso</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{caseItem?.title}</span>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button variant="destructive" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function CasesPage() {
  const [editingCase, setEditingCase] = useState<Case | null>(null)
  const [deletingCase, setDeletingCase] = useState<Case | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { page } = Route.useSearch()
  const navigate = useNavigate()

  const { userInfo } = useUser()

  const { data, isLoading } = useQuery({
    queryKey: ['cases', page],
    queryFn: () => getCases(page),
    // cases endpoint already scopes CLIENT on backend, keep enabled
  })

  // Used both for the client selector and to resolve client_id -> name.
  const { data: clientsData } = useQuery({
    queryKey: ['clients', 1],
    queryFn: () => getClients(1),
    enabled: userInfo?.role === 'ADMIN',
  })

  const cases = data?.results ?? []
  const meta = data?.meta
  const clients = userInfo?.role === 'CLIENT' ? [] : clientsData?.results ?? []
  const clientNameById = new Map(clients.map((c) => [c.id, c.name]))

  function openCreate() {
    setEditingCase(null)
    setFormOpen(true)
  }

  function openEdit(caseItem: Case) {
    setEditingCase(caseItem)
    setFormOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Casos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Acompanhe os casos jurídicos vinculados aos clientes.
          </p>
        </div>
        {userInfo?.role === 'ADMIN' && (
          <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
            <Plus className="size-3.5" />
            Novo caso
          </Button>
        )}
      </div>

      {/* Cases table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <Briefcase className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Casos cadastrados{' '}
            <span className="ml-1 text-muted-foreground font-normal">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando casos...
          </div>
        ) : cases.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum caso cadastrado ainda.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Título</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Abertura</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((caseItem, i) => (
                  <tr
                    key={caseItem.id}
                    className={`transition-colors hover:bg-muted/30 ${i < cases.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-medium">{caseItem.title}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                      {clientNameById.get(caseItem.client_id) ?? '—'}
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={caseItem.status} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(caseItem.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {userInfo?.role === 'ADMIN' && (
                          <>
                            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(caseItem)} title="Editar caso">
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost" size="icon-sm"
                              onClick={() => setDeletingCase(caseItem)} title="Remover caso"
                              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="divide-y divide-border/40 sm:hidden">
              {cases.map((caseItem) => (
                <div key={caseItem.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{caseItem.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {clientNameById.get(caseItem.client_id) ?? '—'}
                    </p>
                    <div className="mt-1">
                      <StatusBadge status={caseItem.status} />
                    </div>
                  </div>
                    <div className="flex shrink-0 gap-1">
                      {userInfo?.role !== 'CLIENT' && (
                        <>
                          <Button variant="ghost" size="icon-sm" onClick={() => openEdit(caseItem)} title="Editar caso">
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost" size="icon-sm"
                            onClick={() => setDeletingCase(caseItem)} title="Remover caso"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                </div>
              ))}
            </div>
          </>
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
                onClick={() => navigate({ to: '/cases', search: { page: page - 1 } })}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => navigate({ to: '/cases', search: { page: page + 1 } })}
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <CaseFormDialog caseItem={editingCase} clients={clients} open={formOpen} onClose={() => setFormOpen(false)} />
      <DeleteCaseDialog caseItem={deletingCase} open={!!deletingCase} onClose={() => setDeletingCase(null)} />
    </div>
  )
}
