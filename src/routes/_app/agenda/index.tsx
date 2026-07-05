import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Calendar,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pencil,
  Trash2,
  MapPin,
  Plus,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createAppointment } from '@/api/create-appointment'
import { createHearing } from '@/api/create-hearing'
import { deleteAppointment } from '@/api/delete-appointment'
import { getAppointments } from '@/api/get-appointments'
import { getCases } from '@/api/get-cases'
import { updateAppointment } from '@/api/update-appointment'
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
import { useUser } from '@/contexts/user'
import { getErrorMessage } from '@/lib/get-error-message'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/agenda/')({
  component: AgendaPage,
})

const appointmentSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  startsAt: z.string().min(1, 'Data e hora são obrigatórias'),
})

const hearingSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  caseId: z.string().uuid('Caso é obrigatório'),
  scheduledAt: z.string().min(1, 'Data e hora são obrigatórias'),
  courtroom: z.string().optional(),
  description: z.string().optional(),
})

type AppointmentForm = z.infer<typeof appointmentSchema>
type HearingForm = z.infer<typeof hearingSchema>

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const monthLabels = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

function CreateAppointmentDialog({
  open,
  onClose,
  defaultDate,
  appointment,
}: {
  open: boolean
  onClose: () => void
  defaultDate: Date
  appointment?: Appointment | null
}) {
  const queryClient = useQueryClient()
  const isEditing = Boolean(appointment)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AppointmentForm>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: buildAppointmentDefaults(defaultDate),
  })

  useEffect(() => {
    reset(buildAppointmentDefaults(defaultDate, appointment))
  }, [appointment, defaultDate, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: AppointmentForm) => {
      const payload = {
        title: data.title,
        description: data.description?.trim() || undefined,
        startsAt: new Date(data.startsAt).toISOString(),
      }

      if (appointment) {
        return updateAppointment(appointment.id, payload)
      }

      return createAppointment(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success(
        isEditing
          ? 'Compromisso atualizado com sucesso.'
          : 'Compromisso cadastrado com sucesso.'
      )
      reset(buildAppointmentDefaults(defaultDate))
      onClose()
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(
          error,
          isEditing
            ? 'Erro ao atualizar compromisso.'
            : 'Erro ao cadastrar compromisso.'
        )
      )
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) {
      reset(buildAppointmentDefaults(defaultDate))
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize os dados do compromisso selecionado.'
              : 'Cadastre um compromisso para organizar a agenda.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <Field label="Título" error={errors.title?.message}>
            <Input {...register('title')} placeholder="Ex: Audiência trabalhista" />
          </Field>
          <Field label="Data e hora" error={errors.startsAt?.message}>
            <Input {...register('startsAt')} type="datetime-local" />
          </Field>
          <Field label="Descrição" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={4}
              className="min-h-[96px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Opcional"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? isEditing
                  ? 'Salvando alterações...'
                  : 'Salvando...'
                : isEditing
                  ? 'Salvar alterações'
                  : 'Salvar compromisso'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CreateHearingDialog({
  open,
  onClose,
  defaultDate,
  cases,
}: {
  open: boolean
  onClose: () => void
  defaultDate: Date
  cases: Case[]
}) {
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<HearingForm>({
    resolver: zodResolver(hearingSchema),
    defaultValues: {
      title: '',
      caseId: '',
      scheduledAt: toLocalDateTimeInputValue(defaultDate),
      courtroom: '',
      description: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        title: '',
        caseId: '',
        scheduledAt: toLocalDateTimeInputValue(defaultDate),
        courtroom: '',
        description: '',
      })
    }
  }, [defaultDate, open, reset])

  const { mutate, isPending } = useMutation({
    mutationFn: (data: HearingForm) =>
      createHearing({
        title: data.title,
        caseId: data.caseId,
        scheduledAt: new Date(data.scheduledAt).toISOString(),
        courtroom: data.courtroom?.trim() || undefined,
        description: data.description?.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success('Audiência registrada com sucesso.')
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao registrar audiência.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova audiência</DialogTitle>
          <DialogDescription>
            Registre uma audiência para acompanhar compromissos processuais.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
          <Field label="Título" error={errors.title?.message}>
            <Input {...register('title')} placeholder="Ex: Audiência de instrução" />
          </Field>
          <Field label="Caso" error={errors.caseId?.message}>
            <Controller
              name="caseId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione um caso" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((legalCase) => (
                      <SelectItem key={legalCase.id} value={legalCase.id}>
                        {legalCase.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="Data e hora" error={errors.scheduledAt?.message}>
            <Input {...register('scheduledAt')} type="datetime-local" />
          </Field>
          <Field label="Sala/Local" error={errors.courtroom?.message}>
            <Input {...register('courtroom')} placeholder="Opcional" />
          </Field>
          <Field label="Descrição" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              className="min-h-[84px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Opcional"
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar audiência'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteAppointmentDialogProps {
  appointment: Appointment | null
  open: boolean
  onClose: () => void
}

function DeleteAppointmentDialog({
  appointment,
  open,
  onClose,
}: DeleteAppointmentDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteAppointment(appointment!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] })
      toast.success(`${appointment?.title} foi removido.`)
      onClose()
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao excluir compromisso.'))
    },
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover compromisso</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{appointment?.title}</span>?
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

function AgendaPage() {
  const { userInfo } = useUser()
  const canManage = userInfo?.role === 'ADMIN' || userInfo?.role === 'LAWYER'
  const canView = canManage || userInfo?.role === 'CLIENT'
  const [dialogOpen, setDialogOpen] = useState(false)
  const [hearingDialogOpen, setHearingDialogOpen] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()))
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [deletingAppointment, setDeletingAppointment] = useState<Appointment | null>(null)

  const month = currentMonth.getMonth() + 1
  const year = currentMonth.getFullYear()

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', year, month],
    queryFn: () => getAppointments(month, year),
    enabled: canView,
  })

  const { data: casesData } = useQuery({
    queryKey: ['cases', 1],
    queryFn: () => getCases(1),
    enabled: canManage,
  })

  const cases = casesData?.results ?? []

  const appointmentsByDay = useMemo(() => {
    const grouped = new Map<string, Appointment[]>()

    for (const appointment of appointments) {
      const key = toDayKey(new Date(appointment.starts_at))
      const items = grouped.get(key) ?? []
      items.push(appointment)
      grouped.set(key, items)
    }

    return grouped
  }, [appointments])

  const calendarDays = useMemo(() => buildCalendarDays(currentMonth), [currentMonth])
  const selectedAppointments = appointmentsByDay.get(toDayKey(selectedDate)) ?? []

  if (!canView) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A agenda não está disponível para seu perfil.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize compromissos e visualize a agenda mensal.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setHearingDialogOpen(true)}>
              <Plus className="size-3.5" />
              Nova audiência
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              Novo compromisso
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_380px]">
        <section className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <div>
                <p className="text-sm font-semibold">
                  {monthLabels[currentMonth.getMonth()]} de {year}
                </p>
                <p className="text-xs text-muted-foreground">
                  {appointments.length} compromisso{appointments.length === 1 ? '' : 's'} no mês
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="size-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-px border-b border-border/40 bg-border/40">
            {weekDays.map((day) => (
              <div
                key={day}
                className="bg-card px-3 py-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-px bg-border/40">
            {calendarDays.map((day) => {
              const key = toDayKey(day)
              const items = appointmentsByDay.get(key) ?? []
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth()
              const isSelected = sameDay(day, selectedDate)
              const isToday = sameDay(day, new Date())

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedDate(startOfDay(day))}
                  className={cn(
                    'min-h-[110px] bg-card px-3 py-3 text-left transition-colors hover:bg-muted/30',
                    !isCurrentMonth && 'text-muted-foreground/40',
                    isSelected && 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        'inline-flex size-7 items-center justify-center rounded-full text-sm font-medium',
                        isToday && 'bg-primary text-primary-foreground'
                      )}
                    >
                      {day.getDate()}
                    </span>
                    {items.length > 0 && (
                      <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                        {items.length}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-1">
                    {items.slice(0, 2).map((item) => (
                      <p key={item.id} className="truncate text-xs text-muted-foreground">
                        {formatTime(item.starts_at)} · {item.title}
                      </p>
                    ))}
                    {items.length > 2 && (
                      <p className="text-xs text-muted-foreground">+{items.length - 2} outros</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-2">
              <CalendarClock className="size-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Compromissos do dia</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {selectedDate.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center px-5 py-12 text-sm text-muted-foreground">
              Carregando compromissos...
            </div>
          ) : selectedAppointments.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 px-5 py-12 text-center">
              <Calendar className="size-5 text-muted-foreground" />
              <p className="text-sm font-medium">Nenhum compromisso neste dia.</p>
              <p className="text-xs text-muted-foreground">
                Cadastre um compromisso para ele aparecer na agenda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {selectedAppointments.map((appointment) => (
                <article key={appointment.id} className="space-y-3 px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold">{appointment.title}</h3>
                      {appointment.description && (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {appointment.description}
                        </p>
                      )}
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {formatTime(appointment.starts_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="size-3.5" />
                      {new Date(appointment.starts_at).toLocaleString('pt-BR')}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      Agenda do escritório
                    </span>
                  </div>
                  {canManage && (
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingAppointment(appointment)
                          setDialogOpen(true)
                        }}
                      >
                        <Pencil className="size-3.5" />
                        Editar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (editingAppointment?.id === appointment.id) {
                            setEditingAppointment(null)
                            setDialogOpen(false)
                          }

                          setDeletingAppointment(appointment)
                        }}
                      >
                        <Trash2 className="size-3.5" />
                        Excluir
                      </Button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {canManage && (
        <>
          <CreateAppointmentDialog
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false)
              setEditingAppointment(null)
            }}
            defaultDate={selectedDate}
            appointment={editingAppointment}
          />

          <CreateHearingDialog
            open={hearingDialogOpen}
            onClose={() => setHearingDialogOpen(false)}
            defaultDate={selectedDate}
            cases={cases}
          />

          <DeleteAppointmentDialog
            appointment={deletingAppointment}
            open={!!deletingAppointment}
            onClose={() => setDeletingAppointment(null)}
          />
        </>
      )}
    </div>
  )
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

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addMonths(date: Date, value: number) {
  return new Date(date.getFullYear(), date.getMonth() + value, 1)
}

function buildCalendarDays(currentMonth: Date) {
  const firstDay = startOfMonth(currentMonth)
  const start = new Date(firstDay)
  start.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    return day
  })
}

function toDayKey(date: Date) {
  return [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
}

function sameDay(left: Date, right: Date) {
  return toDayKey(left) === toDayKey(right)
}

function buildAppointmentDefaults(
  date: Date,
  appointment?: Appointment | null
): AppointmentForm {
  if (appointment) {
    return {
      title: appointment.title,
      description: appointment.description ?? '',
      startsAt: toLocalDateTimeInputValue(new Date(appointment.starts_at)),
    }
  }

  const initial = new Date(date)
  initial.setHours(9, 0, 0, 0)

  return {
    title: '',
    description: '',
    startsAt: toLocalDateTimeInputValue(initial),
  }
}

function toLocalDateTimeInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
