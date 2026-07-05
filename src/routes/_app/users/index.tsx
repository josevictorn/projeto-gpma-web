import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import type { AxiosError } from 'axios'
import { ChevronLeft, ChevronRight, Pencil, Plus, ShieldCheck, Trash2, UserCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { createUser } from '@/api/create-user'
import { deleteUser } from '@/api/delete-user'
import { getUsers } from '@/api/get-users'
import { updateUserRole } from '@/api/update-user-role'
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

export const Route = createFileRoute('/_app/users/')({
  component: UsersPage,
  validateSearch: z.object({
    page: z.number().int().min(1).catch(1),
  }),
  beforeLoad: ({ context }) => {
    if (context.userRole !== 'ADMIN') {
      throw redirect({ to: '/dashboard', search: { unauthorized: true } })
    }
  },
})

const roleConfig: Record<UserRole, { label: string; plural: string; className: string }> = {
  ADMIN: {
    label: 'Administrador',
    plural: 'Administradores',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  LAWYER: {
    label: 'Advogado',
    plural: 'Advogados',
    className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  CLIENT: {
    label: 'Cliente',
    plural: 'Clientes',
    className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
}

function RoleBadge({ role }: { role: UserRole }) {
  const config = roleConfig[role]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}

// ── Edit role dialog ────────────────────────────────────────────────────────

interface EditRoleDialogProps {
  user: User | null
  open: boolean
  onClose: () => void
}

function EditRoleDialog({ user, open, onClose }: EditRoleDialogProps) {
  const queryClient = useQueryClient()
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('')

  const { mutate, isPending } = useMutation({
    mutationFn: () => updateUserRole(user!.id, { role: selectedRole as UserRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Perfil de ${user?.name} atualizado com sucesso.`)
      onClose()
    },
    onError: () => toast.error('Erro ao atualizar o perfil.'),
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { setSelectedRole(''); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar perfil</DialogTitle>
          <DialogDescription>
            Altere o nível de acesso de{' '}
            <span className="font-medium text-foreground">{user?.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Perfil de acesso</p>
          <Select defaultValue={user?.role} onValueChange={(v) => setSelectedRole(v as UserRole)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecione um perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ADMIN">Administrador</SelectItem>
              <SelectItem value="LAWYER">Advogado</SelectItem>
              <SelectItem value="CLIENT">Cliente</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            onClick={() => mutate()}
            disabled={!selectedRole || selectedRole === user?.role || isPending}
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ── Create user dialog ──────────────────────────────────────────────────────

const createUserSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  cpf: z
    .string()
    .transform((value) => value.replace(/\D/g, ''))
    .refine((value) => value.length === 11, 'CPF inválido'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  role: z.enum(['ADMIN', 'LAWYER', 'CLIENT']),
})

type CreateUserForm = z.infer<typeof createUserSchema>

interface CreateUserDialogProps {
  open: boolean
  onClose: () => void
}

function CreateUserDialog({ open, onClose }: CreateUserDialogProps) {
  const queryClient = useQueryClient()
  const { register, handleSubmit, formState: { errors }, reset, control } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: '', cpf: '', email: '', password: '', role: 'CLIENT' },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('Usuário criado com sucesso.')
      reset()
      onClose()
    },
    onError: (error: AxiosError) => {
      if (error.response?.status === 409) {
        toast.error('Este CPF ou e-mail já está em uso.')
      } else {
        toast.error('Erro ao criar usuário.')
      }
    },
  })

  function handleOpenChange(isOpen: boolean) {
    if (!isOpen) { reset(); onClose() }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo usuário</DialogTitle>
          <DialogDescription>Cadastre um novo usuário no sistema.</DialogDescription>
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
            <p className="text-sm font-medium">CPF</p>
            <Input {...register('cpf')} placeholder="000.000.000-00" />
            {errors.cpf && <p className="text-xs text-destructive">{errors.cpf.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Senha</p>
            <Input {...register('password')} type="password" placeholder="Mínimo 6 caracteres" />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Perfil de acesso</p>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="LAWYER">Advogado</SelectItem>
                    <SelectItem value="CLIENT">Cliente</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={onClose} disabled={isPending}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Criando...' : 'Criar usuário'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ── Delete confirmation dialog ──────────────────────────────────────────────

interface DeleteUserDialogProps {
  user: User | null
  open: boolean
  onClose: () => void
}

function DeleteUserDialog({ user, open, onClose }: DeleteUserDialogProps) {
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: () => deleteUser(user!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`${user?.name} foi removido do sistema.`)
      onClose()
    },
    onError: () => toast.error('Erro ao remover usuário.'),
  })

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remover usuário</DialogTitle>
          <DialogDescription>
            Tem certeza que deseja remover{' '}
            <span className="font-medium text-foreground">{user?.name}</span>?
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

// ── Page ────────────────────────────────────────────────────────────────────

function UsersPage() {
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const { page } = Route.useSearch()
  const navigate = useNavigate()

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: () => getUsers(page),
  })

  const users = data?.results ?? []
  const meta = data?.meta

  const counts = {
    ADMIN: users.filter((u: User) => u.role === 'ADMIN').length,
    LAWYER: users.filter((u: User) => u.role === 'LAWYER').length,
    CLIENT: users.filter((u: User) => u.role === 'CLIENT').length,
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Controle de Perfis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os acessos e permissões dos usuários do sistema.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
            <ShieldCheck className="size-3.5" />
            Área restrita · Admin
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
            <Plus className="size-3.5" />
            Novo usuário
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {(Object.keys(roleConfig) as UserRole[]).map((role) => (
          <div
            key={role}
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <div className={`rounded-md p-2 ${roleConfig[role].className.split(' ').slice(0, 2).join(' ')}`}>
              <UserCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{roleConfig[role].plural}</p>
              <p className="text-xl font-bold">{counts[role]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Users table */}
      <div className="rounded-lg border border-border bg-card">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold">
            Usuários cadastrados{' '}
            <span className="ml-1 text-muted-foreground font-normal">({meta?.totalCount ?? 0})</span>
          </h2>
        </div>
        <Separator />

        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Carregando usuários...
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <table className="hidden w-full text-sm sm:table">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Usuário</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">E-mail</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">Perfil</th>
                  <th className="px-5 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Desde</th>
                  <th className="px-5 py-3 text-right text-xs font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, i) => (
                  <tr
                    key={user.id}
                    className={`transition-colors hover:bg-muted/30 ${i < users.length - 1 ? 'border-b border-border/40' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                        </div>
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">{user.email}</td>
                    <td className="px-5 py-3.5"><RoleBadge role={user.role} /></td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground hidden lg:table-cell">
                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" onClick={() => setEditingUser(user)} title="Editar perfil">
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon-sm"
                          onClick={() => setDeletingUser(user)} title="Remover usuário"
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
              {users.map((user) => (
                <div key={user.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {user.name.split(' ').slice(0, 2).map((n) => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <div className="mt-0.5">
                      <RoleBadge role={user.role} />
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditingUser(user)} title="Editar perfil">
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon-sm"
                      onClick={() => setDeletingUser(user)} title="Remover usuário"
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
                onClick={() => navigate({ to: '/users', search: { page: page - 1 } })}
              >
                <ChevronLeft className="size-3.5" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => navigate({ to: '/users', search: { page: page + 1 } })}
              >
                Próxima
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <EditRoleDialog user={editingUser} open={!!editingUser} onClose={() => setEditingUser(null)} />
      <DeleteUserDialog user={deletingUser} open={!!deletingUser} onClose={() => setDeletingUser(null)} />
      <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
