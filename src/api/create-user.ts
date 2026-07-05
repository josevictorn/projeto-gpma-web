import { api } from '@/lib/axios'

export interface CreateUserBody {
  name: string
  cpf: string
  email: string
  password: string
  role: UserRole
}

export interface CreateUserResponse {
  userId: string
}

export async function createUser(body: CreateUserBody) {
  const response = await api.post<CreateUserResponse>('/users', body)
  return response.data
}
