import type { ContestStatus, ContestType } from '../api/types'

export const statusLabel: Record<ContestStatus, string> = {
  Planned: 'Planowany',
  Bought: 'Kupione',
  Submitted: 'Zgłoszony',
  AwaitingResults: 'Czekam na wyniki',
  Won: 'Wygrana',
  Lost: 'Przegrana',
  Archived: 'Archiwum',
}

export const typeLabel: Record<ContestType, string> = {
  Lottery: 'Loteria',
  Creative: 'Zadanie konkursowe',
}
