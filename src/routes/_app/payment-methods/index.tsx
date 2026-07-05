import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createPaymentMethod } from '@/api/create-payment-method'
import { deletePaymentMethod } from '@/api/delete-payment-method'
import { getPaymentMethods } from '@/api/get-payment-methods'
import { updatePaymentMethod } from '@/api/update-payment-method'
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
import { useUser } from '@/contexts/user'
import { getErrorMessage } from '@/lib/get-error-message'

export const Route = createFileRoute('/_app/payment-methods/')({
  component: PaymentMethodsPage,
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

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-muted text-muted-foreground border-border'
      }`}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

// ── Form dialog (create / edit) ───────────────────────────────────────────────

const paymentMethodSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  isActive: z.boolean(),
})

const paymentMethodTypeOptions = [
  'Crédito',
  'Boleto',
  'Dinheiro',
  'Pix',
] as const

type PaymentMethodForm = z.infer<typeof paymentMethodSchema>

const emptyPaymentMethod: PaymentMethodForm = {
  name: 'Crédito',
  description: '',
  isActive: true,
}

function paymentMethodToForm(method: PaymentMethod): PaymentMethodForm {
  return {
    name: method.name,
    description: method.description ?? '',
    isActive: method.is_active,
  }
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">{label}</p>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}

interface FormDialogProps {
  method: PaymentMethod | null
  open: boolean
  onClose: () => void
}

function PaymentMethodFormDialog({ method, open, onClose }: FormDialogProps) {
  const queryClient = useQueryClient()
  const isEditing = !!method
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<PaymentMethodForm>({
    resolver: zodResolver(paymentMethodSchema),
    defaultValues: emptyPaymentMethod,
  })

  useEffect(() => {
    if (open) {
      reset(method ? paymentMethodToForm(method) : emptyPaymentMethod)
    }
  }, [open, method, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: PaymentMethodForm) => {
      const body = {
        name: data.name,
        description: data.description?.trim() || undefined,
        isActive: data.isActive,
      }
      return isEditing
        ? updatePaymentMethod(method.id, body)
        : createPaymentMethod(body)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast.success(
        isEditing
          ? 'Forma de pagamento atualizada com sucesso.'
          : 'Forma de pagamento criada com sucesso.'
      )
      reset()
      onClose()
    },
    onError: (error) => {
      // The backend returns 409 for a duplicate name and 400 (with `issues`)
      // for validation errors — getErrorMessage surfaces the right message.
      toast.error(
        getErrorMessage(
          error,
          isEditing
            ? 'Erro ao atualizar forma de pagamento.'
            : 'Erro ao criar forma de pagamento.'
        )
      )
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset()
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar forma de pagamento' : 'Nova forma de pagamento'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados desta forma de pagamento.'
              : 'Cadastre uma nova forma de pagamento no sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => mutate(data))}
          className="space-y-4"
        >
          <Field label="Tipo" error={errors.name?.message}>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodTypeOptions.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Descrição" error={errors.description?.message}>
            <Input
              {...register('description')}
              placeholder="Opcional"
            />
          </Field>
          <Field label="Status" error={errors.isActive?.message}>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ? 'active' : 'inactive'}
                  onValueChange={(value) => field.onChange(value === 'active')}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              type="button"
              onClick={onClose}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Salvando...'
                : isEditing
                  ? 'Salvar'
                  : 'Criar forma de pagamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ────────────────────────────────────────────────

function DeletePaymentMethodDialog({ method, open, onClose }: FormDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deletePaymentMethod(method!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] })
      toast.success(`${method?.name} foi removida.`)
      onClose()
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Erro ao remover forma de pagamento.')),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover forma de pagamento</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{method?.name}</span>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={() => mutate()}
            disabled={isPending}
          >
            {isPending ? 'Removendo...' : 'Remover'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Page ────────────────────────────────────────────────────────────────────

function PaymentMethodsPage() {
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null)
  const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(
    null
  )
  const [formOpen, setFormOpen] = useState(false)

  const { page, search } = Route.useSearch()
  const navigate = useNavigate()

  const { userInfo } = useUser()
  const isAdmin = userInfo?.role === 'ADMIN'
  const [searchTerm, setSearchTerm] = useState(search ?? '')

  useEffect(() => {
    setSearchTerm(search ?? '')
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['payment-methods', page, search],
    queryFn: () => getPaymentMethods(page, search),
  })

  const methods = data?.results ?? []
  const meta = data?.meta

  function openCreate() {
    setEditingMethod(null)
    setFormOpen(true)
  }

  function openEdit(method: PaymentMethod) {
    setEditingMethod(method)
    setFormOpen(true)
  }

  function submitSearch() {
    navigate({
      to: '/payment-methods',
      search: { page: 1, search: searchTerm.trim() || undefined },
    })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Formas de Pagamento
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os tipos de pagamento disponíveis para cobranças.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-[320px]">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar forma de pagamento"
              className="w-full"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  submitSearch()
                }
              }}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={submitSearch}
              className="whitespace-nowrap"
            >
              <Search className="size-3.5 mr-2" />
              Buscar
            </Button>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                navigate({ to: '/payment-methods', search: { page: 1 } })
              }}
              className="w-full sm:w-auto"
            >
              Limpar
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                onClick={openCreate}
                className="w-full sm:w-auto"
              >
                <Plus className="size-3.5" />
                Nova forma
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4 flex items-center gap-2">
          <CreditCard className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Formas cadastradas{' '}
            <span className="ml-1 text-muted-foreground font-normal">
              ({meta?.totalCount ?? 0})
            </span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando formas de pagamento...
          </div>
        ) : methods.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhuma forma de pagamento cadastrada ainda.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                    Nome
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">
                    Descrição
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  {isAdmin && (
                    <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">
                      Ações
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {methods.map((method, i) => (
                  <tr
                    key={method.id}
                    className={`transition-colors hover:bg-muted/30 ${i < methods.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5 font-medium">{method.name}</td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                      {method.description || '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge active={method.is_active} />
                    </td>
                    {isAdmin && (
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => openEdit(method)}
                            title="Editar forma de pagamento"
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingMethod(method)}
                            title="Remover forma de pagamento"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile card list */}
            <div className="divide-y divide-border/40 sm:hidden">
              {methods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">
                        {method.name}
                      </p>
                      <StatusBadge active={method.is_active} />
                    </div>
                    {method.description && (
                      <p className="text-xs text-muted-foreground truncate">
                        {method.description}
                      </p>
                    )}
                  </div>
                  {isAdmin && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => openEdit(method)}
                        title="Editar forma de pagamento"
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingMethod(method)}
                        title="Remover forma de pagamento"
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  )}
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
                onClick={() =>
                  navigate({
                    to: '/payment-methods',
                    search: { page: page - 1, search },
                  })
                }
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() =>
                  navigate({
                    to: '/payment-methods',
                    search: { page: page + 1, search },
                  })
                }
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <PaymentMethodFormDialog
        method={editingMethod}
        open={formOpen}
        onClose={() => setFormOpen(false)}
      />
      <DeletePaymentMethodDialog
        method={deletingMethod}
        open={!!deletingMethod}
        onClose={() => setDeletingMethod(null)}
      />
    </div>
  )
}
