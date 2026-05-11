import { useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, type AuthUser, ApiError } from '@/api/client'

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user, isLoading, error } = useQuery<AuthUser>({
    queryKey: ['auth', 'session'],
    queryFn: () => authApi.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const isAuthenticated = !!user
  const isUnauthenticated = !isLoading && !user

  const logout = async () => {
    await authApi.logout()
    queryClient.setQueryData(['auth', 'session'], null)
    window.location.href = '/login'
  }

  const login = (returnTo = '/', provider?: string) => {
    window.location.href = authApi.getLoginUrl(returnTo, provider)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    isUnauthenticated,
    error: error as ApiError | null,
    logout,
    login,
  }
}
