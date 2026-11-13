import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, jsonBody } from './client'
import type {
  ContestDto, ContestStatus, ContestCardDto, ContestUpsertDto, EntryUpsertDto, IdDto, InviteDto, Reminder, ShoppingGroupDto, ProofListItemDto,
  PhotoLabel, StatsDto, WinDto,
} from './types'

export type ContestView = 'active' | 'archive'

export function useContests(view: ContestView) {
  return useQuery({
    queryKey: ['contests', 'list', view],
    queryFn: () => apiFetch<ContestCardDto[]>(`/api/contests?view=${view}`),
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
      (['contests', 'reminders', 'shopping', 'stats', 'proofs'] as const).map((k) => qc.invalidateQueries({ queryKey: [k] })),
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
  const qc = useQueryClient()
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/api/contests/${id}`, { method: 'DELETE' }),
    onSuccess: async (_data, id) => {
      // the deleted contest's detail query must not be refetched (it would 404)
      qc.removeQueries({ queryKey: ['contests', 'detail', id] })
      await invalidate()
    },
  })
}

export function useSetStatus() {
  const invalidate = useInvalidateContestData()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContestStatus }) =>
      apiFetch<void>(`/api/contests/${id}/status`, { method: 'PATCH', body: jsonBody({ status }) }),
    onSuccess: invalidate,
  })
}

export type ItemKind = 'contest-tasks' | 'purchase-items' | 'proof-items' | 'win-steps'

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
    mutationFn: ({ entryId, file, label }: { entryId: string; file: File; label?: PhotoLabel }) => {
      const body = new FormData()
      body.append('file', file)
      if (label) body.append('label', label)
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

export function useReminders() {
  return useQuery({ queryKey: ['reminders'], queryFn: () => apiFetch<Reminder[]>('/api/reminders') })
}

export function useShoppingList() {
  return useQuery({ queryKey: ['shopping'], queryFn: () => apiFetch<ShoppingGroupDto[]>('/api/shopping-list') })
}

export function useStats() {
  return useQuery({ queryKey: ['stats'], queryFn: () => apiFetch<StatsDto>('/api/stats') })
}

export function useInvites() {
  return useQuery({ queryKey: ['invites'], queryFn: () => apiFetch<InviteDto[]>('/api/invites') })
}

export function useCreateInvite() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch<InviteDto>('/api/invites', { method: 'POST' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invites'] }),
  })
}

export function useProofs() {
  return useQuery({ queryKey: ['proofs'], queryFn: () => apiFetch<ProofListItemDto[]>('/api/proofs') })
}
