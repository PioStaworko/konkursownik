import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { ApiError, apiFetch, jsonBody } from '../api/client'
import { clearUserData } from '../api/queryClient'
import type { MeDto } from '../api/types'

export interface AuthValue {
  user: MeDto | null
  loading: boolean
  login(userName: string, password: string): Promise<void>
  register(userName: string, password: string, inviteCode: string): Promise<void>
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
      async login(userName, password) {
        await apiFetch('/api/auth/login', { method: 'POST', body: jsonBody({ userName, password }) })
        await refreshMe()
      },
      async register(userName, password, inviteCode) {
        await apiFetch('/api/auth/register', { method: 'POST', body: jsonBody({ userName, password, inviteCode }) })
        await refreshMe()
      },
      async logout() {
        try {
          await apiFetch('/api/auth/logout', { method: 'POST' })
        } catch {
          // the user must end up logged out locally even if the server call fails
        }
        clearUserData(queryClient)
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
