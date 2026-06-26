import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/contexts/user'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createLead } from '@/api/create-lead'
import { deleteLead } from '@/api/delete-lead'
import { getLeads } from '@/api/get-leads'
import { updateLead } from '@/api/update-lead'
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

export const Route = createFileRoute('/_app/leads/')({
  component: LeadsPage,
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
})

const statusConfig: Record<LeadStatus, { label: string; className: string }> = {
  NEW: {
    label: 'Novo',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  CONTACTED: {
    label: 'Contatado',
    className: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20',
  },
  QUALIFIED: {
    label: 'Qualificado',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  LOST: {
    label: 'Perdido',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  },
  COMPLETED: {
    label: 'Concluído',
    className: 'bg-muted text-muted-foreground border-border',
  },
}

const statusOrder: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'COMPLETED']

function StatusBadge({ status }: { status: LeadStatus }) {
  const config = statusConfig[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ── Lead form dialog (create / edit) ─────────────────────────────────────────

const leadSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone inválido'),
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'LOST', 'COMPLETED']),
})

type LeadForm = z.infer<typeof leadSchema>

interface LeadFormDialogProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
}

function LeadFormDialog({ lead, open, onClose }: LeadFormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!lead
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<LeadForm>({
    resolver: zodResolver(leadSchema),
    defaultValues: { name: '', email: '', phone: '', status: 'NEW' },
  })

  useEffect(() => {
    if (open) {
      reset(
        lead
          ? { name: lead.name, email: lead.email, phone: lead.phone, status: lead.status }
          : { name: '', email: '', phone: '', status: 'NEW' }
      )
    }
  }, [open, lead, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: LeadForm) =>
      isEditing ? updateLead(lead.id, data) : createLead(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(isEditing ? 'Lead atualizado com sucesso.' : 'Lead criado com sucesso.')
      reset()
      onClose()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, isEditing ? 'Erro ao atualizar lead.' : 'Erro ao criar lead.')),
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { reset(); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar lead' : 'Novo lead'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações deste lead.'
              : 'Cadastre um novo lead no funil de captação.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Nome completo</p>
            <Input {...register('name')} placeholder="Ex: João da Silva" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">E-mail</p>
            <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Telefone</p>
            <Input {...register('phone')} placeholder="(84) 99999-9999" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
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
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteLeadDialogProps {
  lead: Lead | null
  open: boolean
  onClose: () => void
}

function DeleteLeadDialog({ lead, open, onClose }: DeleteLeadDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteLead(lead!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
      toast.success(`${lead?.name} foi removido.`)
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Erro ao remover lead.')),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover lead</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{lead?.name}</span>?
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

function LeadsPage() {
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [deletingLead, setDeletingLead] = useState<Lead | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { page } = Route.useSearch()
  const navigate = useNavigate()

  const { userInfo } = useUser()

  const { data, isLoading } = useQuery({
    queryKey: ['leads', page],
    queryFn: () => getLeads(page),
    enabled: userInfo?.role === 'ADMIN',
  })

  const leads = data?.results ?? []
  const meta = data?.meta

  function openCreate() {
    setEditingLead(null)
    setFormOpen(true)
  }

  function openEdit(lead: Lead) {
    setEditingLead(lead)
    setFormOpen(true)
  }

  if (userInfo?.role === 'CLIENT' || userInfo?.role === 'LAWYER') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
        <p className="text-sm text-muted-foreground mt-2">Informações de leads não estão disponíveis para seu perfil.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Leads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os contatos do funil de captação de clientes.
          </p>
        </div>
        {userInfo?.role === 'ADMIN' && (
          <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-3.5" />
          Novo lead
          </Button>
        )}
      </div>

      {/* Leads table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Leads cadastrados{' '}
            <span className="ml-1 text-muted-foreground font-normal">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando leads...
          </div>
        ) : leads.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum lead cadastrado ainda.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">E-mail</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Telefone</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => (
                  <tr
                    key={lead.id}
                    className={`transition-colors hover:bg-muted/30 ${i < leads.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-medium">{lead.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{lead.email}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{lead.phone}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={lead.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(lead)} title="Editar lead">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => setDeletingLead(lead)} title="Remover lead"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="divide-y divide-border/40 sm:hidden">
              {leads.map((lead) => (
                <div key={lead.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lead.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{lead.email}</p>
                    <div className="mt-1">
                      <StatusBadge status={lead.status} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(lead)} title="Editar lead">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => setDeletingLead(lead)} title="Remover lead"
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
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
                onClick={() => navigate({ to: '/leads', search: { page: page - 1 } })}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => navigate({ to: '/leads', search: { page: page + 1 } })}
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <LeadFormDialog lead={editingLead} open={formOpen} onClose={() => setFormOpen(false)} />
      <DeleteLeadDialog lead={deletingLead} open={!!deletingLead} onClose={() => setDeletingLead(null)} />
    </div>
  )
}
