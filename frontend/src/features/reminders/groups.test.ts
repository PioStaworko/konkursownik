import { describe, expect, it } from 'vitest'
import type { Reminder } from '../../api/types'
import { groupReminders, GROUP_ORDER, pluralAlerts } from './groups'

const r = (kind: Reminder['kind'], dueDate: string): Reminder => ({
  kind, dueDate, itemId: null, itemText: null, contest: { id: dueDate } as Reminder['contest'],
  confirmationCodes: [], winSteps: [], proofLocation: null, proofNote: null, boughtPurchases: [],
})

describe('groupReminders', () => {
  it('groups and section order', () => {
    const g = groupReminders([
      r('ProofDisposable', '2026-11-01'), r('Ended', '2026-11-10'), r('EndingSoon', '2026-11-14'),
      r('ResultsDue', '2026-11-12'), r('LaureateDeadline', '2026-11-16'), r('EndingSoon', '2026-11-13'),
    ])
    expect(GROUP_ORDER).toEqual(['laureate', 'results', 'ending', 'ended', 'disposal'])
    expect(g.laureate).toHaveLength(1)
    expect(g.results).toHaveLength(1)
    expect(g.ended).toHaveLength(1)
    expect(g.disposal).toHaveLength(1)
    expect(g.ending.map((x) => x.dueDate)).toEqual(['2026-11-13', '2026-11-14'])
  })
})

describe('pluralAlerts', () => {
  it.each([[1, '1 alert'], [3, '3 alerty'], [5, '5 alertów'], [22, '22 alerty'], [12, '12 alertów'], [0, '0 alertów']])(
    '%i -> %s',
    (n, text) => expect(pluralAlerts(n)).toBe(text),
  )
})
