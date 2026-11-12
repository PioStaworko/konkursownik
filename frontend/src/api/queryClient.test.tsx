import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { createQueryClient, shouldRetry } from './queryClient'

function wrapperFor(client: ReturnType<typeof createQueryClient>) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

describe('createQueryClient', () => {
  it('does not retry a 404 (production defaults)', async () => {
    const client = createQueryClient()
    const queryFn = vi.fn().mockRejectedValue(new ApiError(404))
    const { result } = renderHook(() => useQuery({ queryKey: ['contests', 'detail', 'x'], queryFn }), {
      wrapper: wrapperFor(client),
    })
    await waitFor(() => expect(result.current.isError).toBe(true), { timeout: 500 })
    expect(queryFn).toHaveBeenCalledTimes(1)
  })

  it('retries network and 5xx errors up to 3 times only', () => {
    expect(shouldRetry(0, new TypeError('offline'))).toBe(true)
    expect(shouldRetry(2, new ApiError(500))).toBe(true)
    expect(shouldRetry(3, new ApiError(500))).toBe(false)
    expect(shouldRetry(0, new ApiError(400))).toBe(false)
  })

  it('on a 401 from a non-me query removes user data and sets me to null', async () => {
    const client = createQueryClient()
    client.setQueryData(['me'], { email: 'a@b.pl' })
    client.setQueryData(['reminders'], [1])
    renderHook(
      () => useQuery({ queryKey: ['contests', 'active'], queryFn: () => Promise.reject(new ApiError(401)) }),
      { wrapper: wrapperFor(client) },
    )
    await waitFor(() => expect(client.getQueryData(['me'])).toBeNull())
    expect(client.getQueryData(['reminders'])).toBeUndefined()
  })

  it('on a 401 from a mutation also logs out locally', async () => {
    const client = createQueryClient()
    client.setQueryData(['me'], { email: 'a@b.pl' })
    await client
      .getMutationCache()
      .build(client, { mutationFn: () => Promise.reject(new ApiError(401)) })
      .execute(undefined)
      .catch(() => {})
    expect(client.getQueryData(['me'])).toBeNull()
  })

  it('a 401 from the me query itself does not trigger cleanup', async () => {
    const client = createQueryClient()
    client.setQueryData(['reminders'], [1])
    await client.fetchQuery({ queryKey: ['me'], queryFn: () => Promise.reject(new ApiError(401)) }).catch(() => {})
    expect(client.getQueryData(['reminders'])).toEqual([1])
  })
})
