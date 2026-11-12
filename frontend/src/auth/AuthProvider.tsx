import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ApiError, apiFetch, jsonBody } from '../api/client'
import type { MeDto } from '../api/types'

export interface AuthValue {
  user: MeDto | null
  loading: boolean
  login(email: string, password: string): Promise<void>
  register(email: string, password: string, inviteCode: string): Promise<void>
  logout(): Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const { data, isPending } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        return await apiFetch<MeDto>('/api/auth/me')
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) return null
        throw e
      }
    },
    staleTime: Infinity,
    retry: false,
  })

  const value = useMemo<AuthValue>(() => {
    const refreshMe = async () => {
      await queryClient.invalidateQueries({ queryKey: ['me'] })
    }
    return {
      user: data ?? null,
      loading: isPending,
      async login(email, password) {
        await apiFetch('/api/auth/login', { method: 'POST', body: jsonBody({ email, password }) })
        await refreshMe()
      },
      async register(email, password, inviteCode) {
        await apiFetch('/api/auth/register', { method: 'POST', body: jsonBody({ email, password, inviteCode }) })
        await refreshMe()
      },
      async logout() {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' })
        } catch {
          // the user must end up logged out locally even if the server call fails
        }
        // keep the observed ['me'] query alive: clear() would detach AuthProvider's observer
        queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
        queryClient.setQueryData(['me'], null)
      },
    }
  }, [data, isPending, queryClient])

  return <AuthContext value={value}>{children}</AuthContext>
}

// oxlint-disable-next-line react/only-export-components
export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
