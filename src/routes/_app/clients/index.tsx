import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useUser } from '@/contexts/user'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, UserSquare2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createClient } from '@/api/create-client'
import { deleteClient } from '@/api/delete-client'
import { getClients } from '@/api/get-clients'
import { updateClient } from '@/api/update-client'
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

export const Route = createFileRoute('/_app/clients/')({
  component: ClientsPage,
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
})

// ── Client form dialog (create / edit) ───────────────────────────────────────

const clientSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  phone: z.string().min(8, 'Telefone inválido'),
  maritalStatus: z.string().min(1, 'Campo obrigatório'),
  profession: z.string().min(1, 'Campo obrigatório'),
  cpf: z.string().min(11, 'CPF inválido'),
  rg: z.string().min(1, 'Campo obrigatório'),
  issuingAgency: z.string().min(1, 'Campo obrigatório'),
  street: z.string().min(1, 'Campo obrigatório'),
  number: z.string().min(1, 'Campo obrigatório'),
  neighborhood: z.string().min(1, 'Campo obrigatório'),
  city: z.string().min(1, 'Campo obrigatório'),
  state: z.string().min(1, 'Campo obrigatório'),
  zipCode: z.string().min(8, 'CEP inválido'),
})

type ClientForm = z.infer<typeof clientSchema>

const emptyClient: ClientForm = {
  name: '', email: '', phone: '', maritalStatus: '', profession: '',
  cpf: '', rg: '', issuingAgency: '', street: '', number: '',
  neighborhood: '', city: '', state: '', zipCode: '',
}

function clientToForm(client: Client): ClientForm {
  return {
    name: client.name,
    email: client.email,
    phone: client.phone,
    maritalStatus: client.marital_status,
    profession: client.profession,
    cpf: client.cpf,
    rg: client.rg,
    issuingAgency: client.issuing_agency,
    street: client.street,
    number: client.number,
    neighborhood: client.neighborhood,
    city: client.city,
    state: client.state,
    zipCode: client.zip_code,
  }
}

interface ClientFormDialogProps {
  client: Client | null
  open: boolean
  onClose: () => void
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

function ClientFormDialog({ client, open, onClose }: ClientFormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!client
  const { register, handleSubmit, formState: { errors }, reset } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: emptyClient,
  })

  useEffect(() => {
    if (open) {
      reset(client ? clientToForm(client) : emptyClient)
    }
  }, [open, client, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ClientForm) =>
      isEditing ? updateClient(client.id, data) : createClient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(isEditing ? 'Cliente atualizado com sucesso.' : 'Cliente criado com sucesso.')
      reset()
      onClose()
    },
    onError: (error) => {
      // The backend sends a specific message for duplicates (409), e.g.
      // "E-mail já cadastrado." — so we just surface whatever message comes.
      toast.error(
        getErrorMessage(error, isEditing ? 'Erro ao atualizar cliente.' : 'Erro ao criar cliente.')
      )
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { reset(); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados cadastrais deste cliente.'
              : 'Cadastre um novo cliente no sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-5">
          {/* Dados pessoais */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dados pessoais</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nome completo" error={errors.name?.message}>
                <Input {...register('name')} placeholder="Ex: João da Silva" />
              </Field>
              <Field label="E-mail" error={errors.email?.message}>
                <Input {...register('email')} type="email" placeholder="email@exemplo.com" />
              </Field>
              <Field label="Telefone" error={errors.phone?.message}>
                <Input {...register('phone')} placeholder="(84) 99999-9999" />
              </Field>
              <Field label="Estado civil" error={errors.maritalStatus?.message}>
                <Input {...register('maritalStatus')} placeholder="Ex: Solteiro(a)" />
              </Field>
              <Field label="Profissão" error={errors.profession?.message}>
                <Input {...register('profession')} placeholder="Ex: Engenheiro" />
              </Field>
            </div>
          </div>

          {/* Documentos */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentos</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="CPF" error={errors.cpf?.message}>
                <Input {...register('cpf')} placeholder="000.000.000-00" />
              </Field>
              <Field label="RG" error={errors.rg?.message}>
                <Input {...register('rg')} placeholder="0000000" />
              </Field>
              <Field label="Órgão emissor" error={errors.issuingAgency?.message}>
                <Input {...register('issuingAgency')} placeholder="Ex: SSP/RN" />
              </Field>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Endereço</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
              <div className="sm:col-span-4">
                <Field label="Logradouro" error={errors.street?.message}>
                  <Input {...register('street')} placeholder="Rua / Avenida" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Número" error={errors.number?.message}>
                  <Input {...register('number')} placeholder="123" />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Bairro" error={errors.neighborhood?.message}>
                  <Input {...register('neighborhood')} placeholder="Bairro" />
                </Field>
              </div>
              <div className="sm:col-span-3">
                <Field label="Cidade" error={errors.city?.message}>
                  <Input {...register('city')} placeholder="Cidade" />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Estado" error={errors.state?.message}>
                  <Input {...register('state')} placeholder="UF" />
                </Field>
              </div>
              <div className="sm:col-span-4">
                <Field label="CEP" error={errors.zipCode?.message}>
                  <Input {...register('zipCode')} placeholder="00000-000" />
                </Field>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ───────────────────────────────────────────────

interface DeleteClientDialogProps {
  client: Client | null
  open: boolean
  onClose: () => void
}

function DeleteClientDialog({ client, open, onClose }: DeleteClientDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteClient(client!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success(`${client?.name} foi removido.`)
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Erro ao remover cliente.')),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover cliente</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{client?.name}</span>?
            Todos os casos vinculados serão removidos junto. Esta ação não pode ser desfeita.
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

function ClientsPage() {
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { page } = Route.useSearch()
  const navigate = useNavigate()

  const { userInfo } = useUser()

  const { data, isLoading } = useQuery({
    queryKey: ['clients', page],
    queryFn: () => getClients(page),
    enabled: userInfo?.role === 'ADMIN',
  })

  const clients = data?.results ?? []
  const meta = data?.meta

  function openCreate() {
    setEditingClient(null)
    setFormOpen(true)
  }

  function openEdit(client: Client) {
    setEditingClient(client)
    setFormOpen(true)
  }

  if (userInfo?.role === 'CLIENT' || userInfo?.role === 'LAWYER') {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
        <p className="text-sm text-muted-foreground mt-2">Informações de clientes não estão disponíveis para seu perfil.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie o cadastro completo dos clientes do escritório.
          </p>
        </div>
        {userInfo?.role === 'ADMIN' && (
          <Button size="sm" onClick={openCreate} className="w-full sm:w-auto">
          <Plus className="size-3.5" />
          Novo cliente
          </Button>
        )}
      </div>

      {/* Clients table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <UserSquare2 className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Clientes cadastrados{' '}
            <span className="ml-1 text-muted-foreground font-normal">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum cliente cadastrado ainda.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Nome</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">E-mail</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">CPF</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Cidade/UF</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr
                    key={client.id}
                    className={`transition-colors hover:bg-muted/30 ${i < clients.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {client.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{client.email}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">{client.cpf}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">
                      {client.city}/{client.state}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => openEdit(client)} title="Editar cliente">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => setDeletingClient(client)} title="Remover cliente"
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
              {clients.map((client) => (
                <div key={client.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {client.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{client.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEdit(client)} title="Editar cliente">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => setDeletingClient(client)} title="Remover cliente"
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
                onClick={() => navigate({ to: '/clients', search: { page: page - 1 } })}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => navigate({ to: '/clients', search: { page: page + 1 } })}
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <ClientFormDialog client={editingClient} open={formOpen} onClose={() => setFormOpen(false)} />
      <DeleteClientDialog client={deletingClient} open={!!deletingClient} onClose={() => setDeletingClient(null)} />
    </div>
  )
}
