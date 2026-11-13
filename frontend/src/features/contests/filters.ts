import type { ContestCardDto, ContestStatus } from '../../api/types'

export type ContestFilter = 'all' | 'Planned' | 'Bought' | 'Submitted' | 'AwaitingResults' | 'Won' | 'archive'
export type ContestSort = 'deadline' | 'prize' | 'newest'

export const sortOrder: ContestSort[] = ['deadline', 'prize', 'newest']
export const sortLabel: Record<ContestSort, string> = { deadline: 'Termin', prize: 'Wartość', newest: 'Najnowsze' }

export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/ł/gi, 'l')
    .toLowerCase()
    .trim()
}

export function filterContests(cards: ContestCardDto[], filter: ContestFilter, query: string): ContestCardDto[] {
  const q = normalize(query)
  return cards.filter((c) => {
    if (filter !== 'all' && filter !== 'archive' && c.effectiveStatus !== (filter as ContestStatus)) return false
    if (!q) return true
    return [c.name, c.organizer ?? '', ...c.stores].some((v) => normalize(v).includes(q))
  })
}

export function sortContests(cards: ContestCardDto[], sort: ContestSort): ContestCardDto[] {
  const copy = [...cards]
  switch (sort) {
    case 'deadline':
      return copy.sort((a, b) => a.endDate.localeCompare(b.endDate))
    case 'prize':
      return copy.sort((a, b) => (a.topPrize?.value == null ? 1 : 0) - (b.topPrize?.value == null ? 1 : 0) || (b.topPrize?.value ?? 0) - (a.topPrize?.value ?? 0))
    case 'newest':
      return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}
