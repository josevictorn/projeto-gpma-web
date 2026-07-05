import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  createContract,
  type ContractBillingType,
  type ContractFeeType,
  type ContractStatus,
} from '@/api/create-contract'
import { deleteContract } from '@/api/delete-contract'
import { getCases } from '@/api/get-cases'
import { getClients } from '@/api/get-clients'
import { getContracts } from '@/api/get-contracts'
import { getPaymentMethods } from '@/api/get-payment-methods'
import { getUsers } from '@/api/get-users'
import { updateContract } from '@/api/update-contract'
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

export const Route = createFileRoute('/_app/financial/contracts')({
  component: ContractsPage,
  beforeLoad: ({ context }) => {
    if (context.userRole !== 'ADMIN' && context.userRole !== 'LAWYER') {
      throw redirect({ to: '/dashboard', search: { unauthorized: true } })
    }
  },
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
    search: z.string().optional(),
  }),
})

const statusLabel: Record<ContractStatus, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  CLOSED: 'Encerrado',
}

const feeTypeLabel: Record<ContractFeeType, string> = {
  FIXED: 'Fixo',
  HOURLY: 'Hora',
  SUCCESS: 'Êxito',
  MIXED: 'Misto',
}

const billingTypeLabel: Record<ContractBillingType, string> = {
  ONE_TIME: 'Pagamento único',
  MONTHLY: 'Mensal',
  INSTALLMENTS: 'Parcelado',
}

function StatusBadge({ status }: { status: ContractStatus }) {
  const className =
    status === 'ACTIVE'
      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
      : status === 'DRAFT'
        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
        : 'bg-muted text-muted-foreground border-border'

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
      {statusLabel[status]}
    </span>
  )
}

const contractSchema = z.object({
  contractNumber: z.string().min(1, 'Número do contrato é obrigatório'),
  lawyerId: z.string().uuid('Advogado é obrigatório'),
  clientId: z.string().uuid('Cliente é obrigatório'),
  caseId: z.string().uuid('Caso é obrigatório'),
  signedAt: z.string().min(1, 'Data de assinatura é obrigatória'),
  serviceDescription: z.string().min(1, 'Objeto do contrato é obrigatório'),
  feeType: z.enum(['FIXED', 'HOURLY', 'SUCCESS', 'MIXED']),
  feeValue: z
    .number({ error: 'Informe um valor válido de honorários.' })
    .finite('Informe um valor válido de honorários.')
    .positive('Informe valor maior que zero.'),
  paymentTerms: z.string().min(1, 'Forma de pagamento é obrigatória'),
  billingType: z.enum(['ONE_TIME', 'MONTHLY', 'INSTALLMENTS']),
  installments: z.number().int().positive('Quantidade de parcelas inválida'),
  firstDueDate: z.string().min(1, 'Primeiro vencimento é obrigatório'),
  graceDays: z.number().int().min(0, 'Carência inválida'),
  lateFeePercent: z.number().min(0, 'Multa inválida'),
  interestPercentMonthly: z.number().min(0, 'Juros inválidos'),
  status: z.enum(['DRAFT', 'ACTIVE', 'CLOSED']),
}).superRefine((data, ctx) => {
  if (data.billingType === 'INSTALLMENTS' && data.installments < 2) {
    ctx.addIssue({
      code: 'custom',
      path: ['installments'],
      message: 'Para parcelado, informe ao menos 2 parcelas.',
    })
  }

  if (data.billingType === 'ONE_TIME' && data.installments !== 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['installments'],
      message: 'Para pagamento único, a quantidade deve ser 1.',
    })
  }
})

type ContractForm = z.infer<typeof contractSchema>

const emptyContract: ContractForm = {
  contractNumber: '',
  lawyerId: '',
  clientId: '',
  caseId: '',
  signedAt: '',
  serviceDescription: '',
  feeType: 'FIXED',
  feeValue: 0,
  paymentTerms: '',
  billingType: 'MONTHLY',
  installments: 12,
  firstDueDate: '',
  graceDays: 5,
  lateFeePercent: 2,
  interestPercentMonthly: 1,
  status: 'ACTIVE',
}

function contractToForm(contract: Contract): ContractForm {
  const signedDate = new Date(contract.signed_at)

  const year = signedDate.getFullYear()
  const month = String(signedDate.getMonth() + 1).padStart(2, '0')
  const day = String(signedDate.getDate()).padStart(2, '0')

  return {
    contractNumber: contract.contract_number,
    lawyerId: contract.lawyer_id,
    clientId: contract.client_id,
    caseId: contract.case_id,
    signedAt: `${year}-${month}-${day}`,
    serviceDescription: contract.service_description,
    feeType: contract.fee_type,
    feeValue: contract.fee_value,
    paymentTerms: contract.payment_terms,
    billingType: contract.billing_type,
    installments: contract.installments,
    firstDueDate: toDateInputValue(new Date(contract.first_due_date)),
    graceDays: contract.grace_days,
    lateFeePercent: contract.late_fee_percent,
    interestPercentMonthly: contract.interest_percent_monthly,
    status: contract.status,
  }
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
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

function ContractFormDialog({
  open,
  onClose,
  contract,
  lawyers,
  clients,
  cases,
  paymentMethods,
}: {
  open: boolean
  onClose: () => void
  contract: Contract | null
  lawyers: User[]
  clients: Client[]
  cases: Case[]
  paymentMethods: PaymentMethod[]
}) {
  const queryClient = useQueryClient()
  const isEditing = !!contract
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    watch,
    reset,
  } = useForm<ContractForm>({
    resolver: zodResolver(contractSchema),
    defaultValues: emptyContract,
  })

  useEffect(() => {
    if (open) {
      reset(contract ? contractToForm(contract) : emptyContract)
    }
  }, [contract, open, reset])

  const selectedClientId = watch('clientId')
  const selectedPaymentMethod = watch('paymentTerms')
  const availableCases = useMemo(
    () => cases.filter((item) => item.client_id === selectedClientId),
    [cases, selectedClientId]
  )
  const activePaymentMethods = useMemo(
    () => paymentMethods.filter((method) => method.is_active),
    [paymentMethods]
  )
  const selectedPaymentMethodExists = activePaymentMethods.some(
    (method) => method.name === selectedPaymentMethod
  )

  useEffect(() => {
    if (!selectedClientId) {
      return
    }

    const currentCaseId = watch('caseId')
    const validCase = availableCases.some((item) => item.id === currentCaseId)

    if (!validCase) {
      reset({
        ...watch(),
        caseId: '',
      })
    }
  }, [availableCases, reset, selectedClientId, watch])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: ContractForm) => {
      const payload = {
        contractNumber: data.contractNumber,
        lawyerId: data.lawyerId,
        clientId: data.clientId,
        caseId: data.caseId,
        signedAt: new Date(data.signedAt).toISOString(),
        serviceDescription: data.serviceDescription,
        feeType: data.feeType,
        feeValue: data.feeValue,
        paymentTerms: data.paymentTerms,
        billingType: data.billingType,
        installments: data.installments,
        firstDueDate: new Date(data.firstDueDate).toISOString(),
        graceDays: data.graceDays,
        lateFeePercent: data.lateFeePercent,
        interestPercentMonthly: data.interestPercentMonthly,
        status: data.status,
      }

      if (contract) {
        return updateContract(contract.id, payload)
      }

      return createContract(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success(
        isEditing
          ? 'Contrato atualizado com sucesso.'
          : 'Contrato criado com sucesso.'
      )
      reset(emptyContract)
      onClose()
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          isEditing ? 'Erro ao atualizar contrato.' : 'Erro ao criar contrato.'
        )
      )
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar contrato' : 'Novo contrato'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do contrato selecionado.'
              : 'Preencha os dados obrigatórios para formalizar o contrato com o cliente.'}
          </DialogDescription>
        </DialogHeader>
        {isEditing && contract && (
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
            <p className="text-xs text-muted-foreground">Honorário atual</p>
            <p className="text-sm font-semibold text-foreground">
              {formatCurrencyBRL(contract.fee_value)} · {feeTypeLabel[contract.fee_type]}
            </p>
          </div>
        )}
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Número do contrato" error={errors.contractNumber?.message}>
              <Input {...register('contractNumber')} placeholder="Ex: CTR-2026-001" />
            </Field>
            <Field label="Data de assinatura" error={errors.signedAt?.message}>
              <Input {...register('signedAt')} type="date" />
            </Field>
            <Field label="Advogado associado" error={errors.lawyerId?.message}>
              <Controller
                name="lawyerId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {lawyers.map((lawyer) => (
                        <SelectItem key={lawyer.id} value={lawyer.id}>
                          {lawyer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Cliente" error={errors.clientId?.message}>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
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
            </Field>
            <Field label="Caso" error={errors.caseId?.message}>
              <Controller
                name="caseId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCases.map((legalCase) => (
                        <SelectItem key={legalCase.id} value={legalCase.id}>
                          {legalCase.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Tipo de honorário" error={errors.feeType?.message}>
              <Controller
                name="feeType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(feeTypeLabel).map((feeType) => (
                        <SelectItem key={feeType} value={feeType}>
                          {feeTypeLabel[feeType as ContractFeeType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Valor de honorários (R$)" error={errors.feeValue?.message}>
              <Input
                {...register('feeValue', {
                  setValueAs: (value) => {
                    if (value === '' || value === null || value === undefined) {
                      return Number.NaN
                    }

                    const normalized = String(value).replace(',', '.')
                    const parsed = Number(normalized)

                    return Number.isFinite(parsed) ? parsed : Number.NaN
                  },
                })}
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                inputMode="decimal"
              />
              <p className="text-xs text-muted-foreground">
                Valor informado: {formatCurrencyBRL(watch('feeValue') || 0)}
              </p>
            </Field>
            <Field label="Status" error={errors.status?.message}>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusLabel).map((status) => (
                        <SelectItem key={status} value={status}>
                          {statusLabel[status as ContractStatus]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Modelo de cobrança" error={errors.billingType?.message}>
              <Controller
                name="billingType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(billingTypeLabel).map((billingType) => (
                        <SelectItem key={billingType} value={billingType}>
                          {billingTypeLabel[billingType as ContractBillingType]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Parcelas" error={errors.installments?.message}>
              <Input
                {...register('installments', {
                  setValueAs: (value) => {
                    const parsed = Number(value)
                    return Number.isFinite(parsed) ? parsed : Number.NaN
                  },
                })}
                type="number"
                min="1"
                step="1"
              />
            </Field>
            <Field label="Primeiro vencimento" error={errors.firstDueDate?.message}>
              <Input {...register('firstDueDate')} type="date" />
            </Field>
            <Field label="Carência (dias)" error={errors.graceDays?.message}>
              <Input
                {...register('graceDays', {
                  setValueAs: (value) => {
                    const parsed = Number(value)
                    return Number.isFinite(parsed) ? parsed : Number.NaN
                  },
                })}
                type="number"
                min="0"
                step="1"
              />
            </Field>
            <Field label="Multa (%)" error={errors.lateFeePercent?.message}>
              <Input
                {...register('lateFeePercent', {
                  setValueAs: (value) => {
                    const normalized = String(value).replace(',', '.')
                    const parsed = Number(normalized)
                    return Number.isFinite(parsed) ? parsed : Number.NaN
                  },
                })}
                type="number"
                min="0"
                step="0.01"
              />
            </Field>
            <Field label="Juros ao mês (%)" error={errors.interestPercentMonthly?.message}>
              <Input
                {...register('interestPercentMonthly', {
                  setValueAs: (value) => {
                    const normalized = String(value).replace(',', '.')
                    const parsed = Number(normalized)
                    return Number.isFinite(parsed) ? parsed : Number.NaN
                  },
                })}
                type="number"
                min="0"
                step="0.01"
              />
            </Field>
          </div>

          <Field label="Objeto do contrato" error={errors.serviceDescription?.message}>
            <textarea
              {...register('serviceDescription')}
              rows={3}
              className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Descreva os serviços jurídicos contratados"
            />
          </Field>

          <Field label="Forma de pagamento" error={errors.paymentTerms?.message}>
            <Controller
              name="paymentTerms"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a forma de pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    {!selectedPaymentMethodExists && field.value && (
                      <SelectItem value={field.value}>
                        {field.value} (inativa)
                      </SelectItem>
                    )}
                    {activePaymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.name}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : isEditing ? 'Salvar alterações' : 'Salvar contrato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CloseContractDialog({
  contract,
  open,
  onClose,
}: {
  contract: Contract | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateContract(contract!.id, { status: 'CLOSED' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato encerrado com sucesso.')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao encerrar contrato.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Encerrar contrato</DialogTitle>
          <DialogDescription>
            Ao encerrar, o contrato <span className="font-medium text-foreground">{contract?.contract_number}</span> ficará inativo.
            Esta ação pode ser revertida editando o status para ativo.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Encerrando...' : 'Encerrar contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function DeleteContractDialog({
  contract,
  open,
  onClose,
}: {
  contract: Contract | null
  open: boolean
  onClose: () => void
}) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteContract(contract!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      toast.success('Contrato removido com sucesso.')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao excluir contrato.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Excluir contrato</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja excluir o contrato{' '}
            <span className="font-medium text-foreground">{contract?.contract_number}</span>?
            Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => mutate()} disabled={isPending}>
            {isPending ? 'Excluindo...' : 'Excluir contrato'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ContractsPage() {
  const navigate = useNavigate()
  const { userInfo } = useUser()
  const isAdmin = userInfo?.role === 'ADMIN'
  const canViewContracts = userInfo?.role === 'ADMIN' || userInfo?.role === 'LAWYER'
  const canManageContracts = isAdmin
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [closingContract, setClosingContract] = useState<Contract | null>(null)
  const [deletingContract, setDeletingContract] = useState<Contract | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const { page, search } = Route.useSearch()
  const [searchTerm, setSearchTerm] = useState(search ?? '')

  useEffect(() => {
    setSearchTerm(search ?? '')
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', page, search],
    queryFn: () => getContracts(page, search),
    enabled: canViewContracts,
  })

  const { data: usersData } = useQuery({
    queryKey: ['users', 1],
    queryFn: () => getUsers(1),
    enabled: canManageContracts,
  })

  const { data: clientsData } = useQuery({
    queryKey: ['clients', 1],
    queryFn: () => getClients(1),
    enabled: canManageContracts,
  })

  const { data: casesData } = useQuery({
    queryKey: ['cases', 1],
    queryFn: () => getCases(1),
    enabled: canManageContracts,
  })

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['payment-methods', 'contracts-form'],
    queryFn: () => getPaymentMethods(1),
    enabled: canManageContracts,
  })

  const lawyers = useMemo(
    () => (usersData?.results ?? []).filter((user) => user.role === 'LAWYER'),
    [usersData]
  )
  const clients = clientsData?.results ?? []
  const cases = casesData?.results ?? []
  const paymentMethods = paymentMethodsData?.results ?? []

  const contracts = data?.results ?? []
  const meta = data?.meta

  const lawyerMap = useMemo(
    () => new Map(lawyers.map((lawyer) => [lawyer.id, lawyer.name])),
    [lawyers]
  )
  const clientMap = useMemo(
    () => new Map(clients.map((client) => [client.id, client.name])),
    [clients]
  )
  const caseMap = useMemo(
    () => new Map(cases.map((legalCase) => [legalCase.id, legalCase.title])),
    [cases]
  )

  if (!canViewContracts) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Contratos</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Contratos não estão disponíveis para seu perfil.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Contratos</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {canManageContracts
              ? 'Formalize acordos de prestação de serviços com seus clientes.'
              : 'Visualize os contratos em que você está associado.'}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex w-full items-center gap-2 sm:w-[320px]">
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por número ou objeto"
              className="w-full"
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  navigate({
                    to: '/financial/contracts',
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
                  to: '/financial/contracts',
                  search: { page: 1, search: searchTerm.trim() || undefined },
                })
              }
              className="whitespace-nowrap"
            >
              <Search className="mr-2 size-3.5" />
              Buscar
            </Button>
          </div>
          <div className="flex gap-2 sm:justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSearchTerm('')
                navigate({ to: '/financial/contracts', search: { page: 1 } })
              }}
              className="w-full sm:w-auto"
            >
              Limpar
            </Button>
            {canManageContracts && (
              <Button size="sm" onClick={() => setFormOpen(true)} className="w-full sm:w-auto">
                <Plus className="size-3.5" />
                Novo contrato
              </Button>
            )}
          </div>
        </div>
      </div>

      {!canManageContracts && (
        <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          Seu perfil possui acesso somente leitura aos contratos vinculados a você.
        </div>
      )}

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 px-5 py-4">
          <FileText className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">
            Contratos cadastrados{' '}
            <span className="ml-1 font-normal text-muted-foreground">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando contratos...
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Nenhum contrato cadastrado ainda.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Número</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Cliente</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Advogado</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden xl:table-cell">Caso</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Honorário</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                {canManageContracts && (
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                )}
              </tr>
            </thead>
            <tbody>
              {contracts.map((contract, index) => (
                <tr
                  key={contract.id}
                  className={`transition-colors hover:bg-muted/30 ${index < contracts.length - 1 ? 'border-b border-border/40' : ''}`}
                >
                  <td className="px-5 py-3.5 font-medium">{contract.contract_number}</td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                    {clientMap.get(contract.client_id) ?? contract.client_id}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden lg:table-cell">
                    {lawyerMap.get(contract.lawyer_id) ?? contract.lawyer_id}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground hidden xl:table-cell">
                    {caseMap.get(contract.case_id) ?? contract.case_id}
                  </td>
                  <td className="px-5 py-3.5">
                    {feeTypeLabel[contract.fee_type]} · R$ {contract.fee_value.toFixed(2)}
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={contract.status} /></td>
                  {canManageContracts && (
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => {
                            setEditingContract(contract)
                            setFormOpen(true)
                          }}
                          title="Editar contrato"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        {contract.status !== 'CLOSED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setClosingContract(contract)}
                            title="Encerrar contrato"
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          >
                            Encerrar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDeletingContract(contract)}
                          title="Excluir contrato"
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
                    to: '/financial/contracts',
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
                    to: '/financial/contracts',
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

      {canManageContracts && (
        <ContractFormDialog
          open={formOpen}
          onClose={() => {
            setFormOpen(false)
            setEditingContract(null)
          }}
          contract={editingContract}
          lawyers={lawyers}
          clients={clients}
          cases={cases}
          paymentMethods={paymentMethods}
        />
      )}

      {canManageContracts && (
        <CloseContractDialog
          contract={closingContract}
          open={!!closingContract}
          onClose={() => setClosingContract(null)}
        />
      )}

      {canManageContracts && (
        <DeleteContractDialog
          contract={deletingContract}
          open={!!deletingContract}
          onClose={() => setDeletingContract(null)}
        />
      )}
    </div>
  )
}

function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
