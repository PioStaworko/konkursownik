import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './client'

/** Never retry client errors (4xx); retry network/5xx failures up to 3 times. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 3
}

/**
 * Local logout cleanup, shared by AuthProvider.logout and the global 401 handler.
 * Keeps the observed ['me'] query alive (clear() would detach AuthProvider's observer).
 */
export function clearUserData(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'me' })
  queryClient.setQueryData(['me'], null)
}

export function createQueryClient(): QueryClient {
  // Assigned right after construction; the handlers only run later.
  let client: QueryClient
  const onError = (error: unknown, queryKey?: readonly unknown[]) => {
    if (error instanceof ApiError && error.status === 401 && queryKey?.[0] !== 'me') {
      clearUserData(client)
    }
  }
  client = new QueryClient({
    defaultOptions: { queries: { retry: shouldRetry } },
    queryCache: new QueryCache({ onError: (error, query) => onError(error, query.queryKey) }),
    mutationCache: new MutationCache({ onError: (error) => onError(error) }),
  })
  return client
}
