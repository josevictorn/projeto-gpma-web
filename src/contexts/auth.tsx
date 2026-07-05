import {
  type UseMutationResult,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { createContext, useCallback, useContext, useState } from 'react'
import {
  type AuthenticateBody,
  type AuthenticateResponse,
  authenticate,
} from '@/api/authenticate'
import { getProfile } from '@/api/get-profile'
import storage from '@/config/storage'
import { constants } from '@/utils'

interface AuthContextValue {
  isAuthenticated: boolean
  login: UseMutationResult<
    AuthenticateResponse,
    // biome-ignore lint/suspicious/noExplicitAny: We want to allow any error type here since the API might return different error shapes.
    AxiosError<unknown, any>,
    AuthenticateBody,
    unknown
  >
  logout: () => void
}

const AuthContext = createContext<AuthContextValue>({} as AuthContextValue)

interface AuthProviderProps {
  children: React.ReactNode
}

const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!storage.local.get(constants.localStorageKeys.ACCESS_TOKEN)
  )

  const queryClient = useQueryClient()

  const handleLogout = useCallback(() => {
    storage.local.delete(constants.localStorageKeys.ACCESS_TOKEN)
    queryClient.clear()
    window.location.href = '/sign-in'
  }, [queryClient])

  const handleLogin = async (data: AuthenticateResponse) => {
    storage.local.set(
      constants.localStorageKeys.ACCESS_TOKEN,
      data.access_token
    )
    await queryClient.prefetchQuery({
      queryKey: ['userInfo'],
      queryFn: getProfile,
    })
    setIsAuthenticated(true)
  }

  const requestLogin = useMutation<
    AuthenticateResponse,
    // biome-ignore lint/suspicious/noExplicitAny: We want to allow any error type here since the API might return different error shapes.
    AxiosError<unknown, any>,
    AuthenticateBody,
    unknown
  >({
    mutationFn: authenticate,
    onSuccess: handleLogin,
  })

  const logout = handleLogout

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login: requestLogin, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

const useAuth = () => {
  const context = useContext(AuthContext)
  return context
}

export { AuthProvider, useAuth }
