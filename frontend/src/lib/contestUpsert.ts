import type { ContestDto, ContestUpsertDto } from '../api/types'

/** Strips the read-only parts of a fetched contest; children keep their ids. */
export function toUpsert(c: ContestDto): ContestUpsertDto {
  return {
    name: c.name, organizer: c.organizer, url: c.url, rulesUrl: c.rulesUrl, type: c.type,
    startDate: c.startDate, endDate: c.endDate, resultsDate: c.resultsDate, resultsCheckNote: c.resultsCheckNote,
    entryLimitPerDay: c.entryLimitPerDay, entryLimitTotal: c.entryLimitTotal, status: c.status, notes: c.notes,
    icon: c.icon, tasks: c.tasks, purchases: c.purchases, proofs: c.proofs, prizes: c.prizes,
  }
}
