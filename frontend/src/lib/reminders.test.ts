import { describe, expect, it } from 'vitest'
import type { Reminder, ReminderKind } from '../api/types'
import { reminderText } from './reminders'

const base = (kind: ReminderKind, itemText: string | null = null): Reminder => ({
  kind, dueDate: '2026-11-12', itemId: null, itemText,
  contest: {
    id: 'c1', name: 'Loteria', organizer: null, icon: null, type: 'Lottery',
    topPrize: null, prizesCount: 0, startDate: '2026-11-01', endDate: '2026-11-30', resultsDate: null,
    status: 'Planned', effectiveStatus: 'Planned', entryCount: 0, entriesToday: 0,
    entryLimitTotal: null, entryLimitPerDay: null, url: null, rulesUrl: null,
    purchasesTotal: 0, purchasesBought: 0, firstOpenPurchase: null, stores: [], firstProofLocation: null,
    win: null, createdAt: '2026-11-01T00:00:00+00:00',
  },
  confirmationCodes: [], winSteps: [], proofLocation: null, proofNote: null, boughtPurchases: [],
})

describe('reminderText', () => {
  it('formats each kind', () => {
    expect(reminderText(base('EndingSoon'))).toBe('Kończy się 12.11.2026 — zgłoś się')
    expect(reminderText(base('Ended'))).toBe('Konkurs się zakończył — zaktualizuj status')
    expect(reminderText(base('ResultsDue'))).toBe('Wyniki: 12.11.2026 — sprawdź maila')
    expect(reminderText(base('LaureateDeadline'))).toBe('Termin danych laureata: 12.11.2026')
    expect(reminderText(base('ProofDisposable', 'Paragon Biedronka'))).toBe('Możesz wyrzucić: Paragon Biedronka')
  })
})
