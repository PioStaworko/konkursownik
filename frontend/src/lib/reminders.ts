import type { Reminder } from '../api/types'
import { formatDate } from './format'

export function reminderText(r: Reminder): string {
  switch (r.kind) {
    case 'EndingSoon':
      return `Kończy się ${formatDate(r.dueDate)} — zgłoś się`
    case 'Ended':
      return 'Konkurs się zakończył — zaktualizuj status'
    case 'ResultsDue':
      return `Wyniki: ${formatDate(r.dueDate)} — sprawdź maila`
    case 'LaureateDeadline':
      return `Termin danych laureata: ${formatDate(r.dueDate)}`
    case 'ProofDisposable':
      return `Możesz wyrzucić: ${r.itemText ?? ''}`
  }
}
