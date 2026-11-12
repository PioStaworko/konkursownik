import { describe, expect, it } from 'vitest'
import type { Reminder, ReminderKind } from '../api/types'
import { reminderText } from './reminders'

const base = (kind: ReminderKind, itemText: string | null = null): Reminder => ({
  kind, contestId: 'c1', contestName: 'Loteria', dueDate: '2026-11-12', itemId: null, itemText,
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
