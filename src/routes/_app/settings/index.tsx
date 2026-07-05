import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
import { changePassword } from '@/api/change-password'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { getErrorMessage } from '@/lib/get-error-message'

export const Route = createFileRoute('/_app/settings/')({
  component: SettingsPage,
})

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória.'),
  newPassword: z.string().min(6, 'A nova senha deve ter pelo menos 6 caracteres.'),
  confirmNewPassword: z.string().min(6, 'Repita a nova senha.'),
})

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

function SettingsPage() {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  })

  const { mutate, isPending } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      reset()
      toast.success('Senha alterada com sucesso!')
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Erro ao alterar senha.'))
    },
  })

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Altere sua senha de acesso.
        </p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Alterar senha</CardTitle>
          <CardDescription>
            Informe sua senha atual e defina a nova senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={handleSubmit((values) => mutate(values))}
          >
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Senha atual</p>
              <Input type="password" {...register('currentPassword')} />
              {errors.currentPassword?.message && (
                <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Nova senha</p>
              <Input type="password" {...register('newPassword')} />
              {errors.newPassword?.message && (
                <p className="text-xs text-destructive">{errors.newPassword.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-sm font-medium">Repita a nova senha</p>
              <Controller
                name="confirmNewPassword"
                control={control}
                render={({ field }) => <Input type="password" {...field} />}
              />
              {errors.confirmNewPassword?.message && (
                <p className="text-xs text-destructive">{errors.confirmNewPassword.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Salvando...' : 'Salvar nova senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
