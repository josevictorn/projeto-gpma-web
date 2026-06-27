import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { updateCase } from '@/api/update-case'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { getErrorMessage } from '@/lib/get-error-message'

export const statusConfig: Record<
  CaseStatus,
  { label: string; className: string; dot: string }
> = {
  OPEN: {
    label: 'Aberto',
    className:
      'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    label: 'Pendente',
    className:
      'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  CLOSED: {
    label: 'Encerrado',
    className: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground/50',
  },
}

export const statusOrder: CaseStatus[] = ['OPEN', 'PENDING', 'CLOSED']

export function StatusBadge({
  status,
  interactive,
}: {
  status: CaseStatus
  interactive?: boolean
}) {
  const config = statusConfig[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        interactive && 'cursor-pointer transition-opacity hover:opacity-80'
      )}
    >
      {config.label}
      {interactive && <ChevronDown className="size-3" />}
    </span>
  )
}

/**
 * Inline status control. For users allowed to edit, the badge becomes a
 * dropdown that PATCHes the case status; otherwise it renders read-only.
 */
export function CaseStatusControl({
  caseItem,
  canEdit,
}: {
  caseItem: Case
  canEdit: boolean
}) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: (status: CaseStatus) => updateCase(caseItem.id, { status }),
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] })
      queryClient.invalidateQueries({ queryKey: ['case', caseItem.id] })
      toast.success(`Status alterado para "${statusConfig[status].label}".`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Erro ao alterar status.')),
  })

  if (!canEdit) {
    return <StatusBadge status={caseItem.status} />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild disabled={isPending}>
        <button type="button" title="Alterar status" className="outline-none disabled:opacity-60">
          <StatusBadge status={caseItem.status} interactive />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        {statusOrder.map((status) => (
          <DropdownMenuItem
            key={status}
            className="gap-2"
            onSelect={() => {
              if (status !== caseItem.status) {
                mutate(status)
              }
            }}
          >
            <span className={cn('size-2 rounded-full', statusConfig[status].dot)} />
            {statusConfig[status].label}
            {status === caseItem.status && <Check className="ml-auto size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
