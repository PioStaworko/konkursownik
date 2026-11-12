import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, jsonBody } from './client'
import type { ContestDto, ContestSummaryDto, ContestUpsertDto, IdDto } from './types'

export type ContestView = 'active' | 'archive'

export function useContests(view: ContestView) {
  return useQuery({
    queryKey: ['contests', 'list', view],
    queryFn: () => apiFetch<ContestSummaryDto[]>(`/api/contests?view=${view}`),
  })
}

export function useContest(id: string | undefined) {
  return useQuery({
    queryKey: ['contests', 'detail', id],
    queryFn: () => apiFetch<ContestDto>(`/api/contests/${id}`),
    enabled: !!id,
  })
}

function useInvalidateContestData() {
  const qc = useQueryClient()
  return () =>
    Promise.all(
      (['contests', 'reminders', 'shopping'] as const).map((k) => qc.invalidateQueries({ queryKey: [k] })),
    )
}

/** Creates when `id` is absent, otherwise replaces the whole contest. Resolves to the contest id. */
export function useSaveContest() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: async ({ id, dto }: { id?: string; dto: ContestUpsertDto }) => {
      if (id) {
        await apiFetch<void>(`/api/contests/${id}`, { method: 'PUT', body: jsonBody(dto) })
        return id
      }
      const created = await apiFetch<IdDto>('/api/contests', { method: 'POST', body: jsonBody(dto) })
      return created.id
    },
    onSuccess: invalidate,
  })
}

export function useDeleteContest() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/contests/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}
