import { api } from '@/lib/axios'

export interface UpdateUserBody {
  name?: string
  cpf?: string
  email?: string
  role?: UserRole
}

export type UpdateUserResponse = User

export async function updateUser(id: string, body: UpdateUserBody) {
  const response = await api.patch<UpdateUserResponse>(`/users/${id}`, body)
  return response.data
}
