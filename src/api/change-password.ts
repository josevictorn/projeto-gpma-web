import { api } from '@/lib/axios'

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export async function changePassword(body: ChangePasswordBody) {
  await api.post('/users/change-password', body)
}
