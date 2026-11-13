import { describe, expect, it } from 'vitest'
import type { ContestCardDto } from '../../api/types'
import { filterContests, sortContests } from './filters'

const base: ContestCardDto = {
  id: 'x', name: 'Konkurs', organizer: null, icon: null, type: 'Lottery',
  prizeDescription: null, prizeValue: null, startDate: '2026-11-01', endDate: '2026-11-30', resultsDate: null,
  status: 'Planned', effectiveStatus: 'Planned', entryCount: 0, entriesToday: 0,
  entryLimitTotal: null, entryLimitPerDay: null, url: null, rulesUrl: null,
  purchasesTotal: 0, purchasesBought: 0, firstOpenPurchase: null, stores: [], firstProofLocation: null,
  win: null, createdAt: '2026-11-01T00:00:00+00:00',
}
const card = (o: Partial<ContestCardDto>): ContestCardDto => ({ ...base, ...o })

describe('filterContests', () => {
  const cards = [
    card({ id: 'a', name: 'Wielka loteria', organizer: 'E.Wedel' }),
    card({ id: 'b', name: 'Lato', stores: ['Lidl'] }),
    card({ id: 'c', name: 'Łoś', effectiveStatus: 'Bought' }),
  ]

  it.each([['Wedel', 'a'], ['lidl', 'b'], ['łoś', 'c'], ['los', 'c'], ['  LOS ', 'c']])('search %s', (q, id) => {
    expect(filterContests(cards, 'all', q).map((c) => c.id)).toEqual([id])
  })

  it('filters by effective status', () => {
    expect(filterContests(cards, 'Bought', '').map((c) => c.id)).toEqual(['c'])
    expect(filterContests(cards, 'all', '')).toHaveLength(3)
    expect(filterContests(cards, 'archive', '')).toHaveLength(3)
  })
})

describe('sortContests', () => {
  const cards = [
    card({ id: 'a', endDate: '2026-12-01', prizeValue: null, createdAt: '2026-11-01T00:00:00+00:00' }),
    card({ id: 'b', endDate: '2026-11-15', prizeValue: 100, createdAt: '2026-11-03T00:00:00+00:00' }),
    card({ id: 'c', endDate: '2026-11-20', prizeValue: 500, createdAt: '2026-11-02T00:00:00+00:00' }),
  ]
  const ids = (s: Parameters<typeof sortContests>[1]) => sortContests(cards, s).map((c) => c.id)

  it('deadline ascending', () => expect(ids('deadline')).toEqual(['b', 'c', 'a']))
  it('prize puts nulls last', () => expect(ids('prize')).toEqual(['c', 'b', 'a']))
  it('newest first', () => expect(ids('newest')).toEqual(['b', 'c', 'a']))
  it('does not mutate input', () => {
    sortContests(cards, 'prize')
    expect(cards.map((c) => c.id)).toEqual(['a', 'b', 'c'])
  })
})
