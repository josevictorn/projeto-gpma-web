import axios, { type AxiosError } from 'axios'
import { toast } from 'sonner'
import { env } from '@/env'
import storage from '@/config/storage'
import { getErrorMessage } from '@/lib/get-error-message'
import { queryClient } from '@/lib/react-query'
import { constants } from '@/utils'

export const api = axios.create({
  baseURL: env.VITE_API_URL,
  withCredentials: true,
})

// Attach Bearer token to every request
api.interceptors.request.use((config) => {
  const token = storage.local.get(constants.localStorageKeys.ACCESS_TOKEN)
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Global handling for auth-level errors:
// - 401 (missing/invalid/expired token): clear session and redirect to sign-in.
// - 403 (authenticated but no permission): surface a toast so it isn't silent
//   on screens without their own error handling (e.g. list queries).
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status
    const requestUrl = error.config?.url ?? ''
    const isAuthenticateRequest = requestUrl.includes('/users/authenticate')

    if (status === 401 && !isAuthenticateRequest) {
      storage.local.delete(constants.localStorageKeys.ACCESS_TOKEN)
      queryClient.clear()
      window.location.href = '/sign-in'
    }

    if (status === 403) {
      toast.error(getErrorMessage(error, 'Você não tem permissão para realizar esta ação.'))
    }

    return Promise.reject(error)
  }
)

if (env.VITE_ENABLE_API_DELAY) {
  api.interceptors.request.use(async (config) => {
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return config
  })
}
