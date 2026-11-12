import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, jsonBody } from './client'
import type { ContestDto, ContestSummaryDto, ContestUpsertDto, EntryUpsertDto, IdDto, WinDto } from './types'

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
      (['contests', 'reminders', 'shopping', 'stats'] as const).map((k) => qc.invalidateQueries({ queryKey: [k] })),
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

export type ItemKind = 'contest-tasks' | 'purchase-items' | 'proof-items'

export function useToggleItem(kind: ItemKind) {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      apiFetch<void>(`/api/${kind}/${id}`, { method: 'PATCH', body: jsonBody({ value }) }),
    onSuccess: invalidate,
  })
}

/** Creates when `id` is absent, otherwise replaces the entry. */
export function useSaveEntry(contestId: string) {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: async ({ id, dto }: { id?: string; dto: EntryUpsertDto }) => {
      if (id) {
        await apiFetch<void>(`/api/entries/${id}`, { method: 'PUT', body: jsonBody(dto) })
        return id
      }
      const created = await apiFetch<IdDto>(`/api/contests/${contestId}/entries`, {
        method: 'POST',
        body: jsonBody(dto),
      })
      return created.id
    },
    onSuccess: invalidate,
  })
}

export function useDeleteEntry() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/entries/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useUploadPhoto() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: ({ entryId, file }: { entryId: string; file: File }) => {
      const body = new FormData()
      body.append('file', file)
      return apiFetch<IdDto>(`/api/entries/${entryId}/photos`, { method: 'POST', body })
    },
    onSuccess: invalidate,
  })
}

export function useDeletePhoto() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/photos/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useSaveWin(contestId: string) {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: (dto: WinDto) =>
      apiFetch<void>(`/api/contests/${contestId}/win`, { method: 'PUT', body: jsonBody(dto) }),
    onSuccess: invalidate,
  })
}

export function useDeleteWin(contestId: string) {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: () => apiFetch<void>(`/api/contests/${contestId}/win`, { method: 'DELETE' }),
    onSuccess: invalidate,
  })
}

export function useDuplicateContest() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: async (id: string) => (await apiFetch<IdDto>(`/api/contests/${id}/duplicate`, { method: 'POST' })).id,
    onSuccess: invalidate,
  })
}
