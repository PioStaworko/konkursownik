import type { Reminder, ReminderKind } from '../../api/types'

export type ReminderGroup = 'laureate' | 'results' | 'ending' | 'ended' | 'disposal'

export const GROUP_ORDER: ReminderGroup[] = ['laureate', 'results', 'ending', 'ended', 'disposal']

const groupOf: Record<ReminderKind, ReminderGroup> = {
  LaureateDeadline: 'laureate',
  ResultsDue: 'results',
  EndingSoon: 'ending',
  Ended: 'ended',
  ProofDisposable: 'disposal',
}

export function groupReminders(reminders: Reminder[]): Record<ReminderGroup, Reminder[]> {
  const out: Record<ReminderGroup, Reminder[]> = { laureate: [], results: [], ending: [], ended: [], disposal: [] }
  for (const r of reminders) out[groupOf[r.kind]].push(r)
  for (const g of GROUP_ORDER) out[g].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
  return out
}

export function pluralAlerts(n: number): string {
  if (n === 1) return '1 alert'
  const last = n % 10
  const last2 = n % 100
  return last >= 2 && last <= 4 && !(last2 >= 12 && last2 <= 14) ? `${n} alerty` : `${n} alertów`
}

export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

export function dueBadge(n: number): string {
  if (n < 0) return 'Po terminie'
  if (n === 0) return 'Dziś'
  if (n === 1) return 'Jutro'
  return `Za ${n} dni`
}
