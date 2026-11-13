import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useProofs, useReminders } from '../api/hooks'
import { groupReminders, GROUP_ORDER, pluralAlerts, type ReminderGroup } from '../features/reminders/groups'
import Timeline from '../features/reminders/Timeline'
import { nowInPolandLabel } from '../lib/format'
import { FilterPill } from '../ui/FilterPill'
import { Icon } from '../ui/Icon'

type Filter = 'all' | 'laureate' | 'results' | 'ending' | 'disposal'

const filterGroups: Record<Filter, ReminderGroup[]> = {
  all: GROUP_ORDER,
  laureate: ['laureate'],
  results: ['results'],
  ending: ['ending', 'ended'],
  disposal: ['disposal'],
}

const pills: { key: Filter; label: string }[] = [
  { key: 'all', label: 'Wszystkie' },
  { key: 'laureate', label: 'Laureat' },
  { key: 'results', label: 'Wyniki' },
  { key: 'ending', label: 'Kończące się' },
  { key: 'disposal', label: 'Do kosza' },
]

export default function RemindersPage() {
  const { data, isPending, isError } = useReminders()
  const proofs = useProofs()
  const [filter, setFilter] = useState<Filter>('all')
  const groups = useMemo(() => groupReminders(data ?? []), [data])
  const count = (f: Filter) => filterGroups[f].reduce((n, g) => n + groups[g].length, 0)
  const total = data?.length ?? 0

  return (
    <div className="flex flex-col gap-space-lg">
      <header className="flex flex-col gap-space-xs">
        <div className="flex items-center justify-end">
          <span className="font-mono text-label-md text-on-surface-variant">{nowInPolandLabel()}</span>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <h1 className="text-headline-sm font-semibold text-on-surface">Wymaga Twojej uwagi</h1>
          <span className="rounded-full bg-tertiary-container/30 px-2.5 py-0.5 font-mono text-label-md font-semibold text-tertiary-fixed">
            {pluralAlerts(total)}
          </span>
        </div>
      </header>
      {isPending && <p className="text-on-surface-variant">Ładowanie…</p>}
      {isError && <p role="alert" className="text-error">Nie udało się wczytać przypomnień</p>}
      {data && total === 0 && <p className="py-8 text-center text-on-surface-variant">Nic pilnego. Wszystko pod kontrolą!</p>}
      {total > 0 && (
        <>
          <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1">
            {pills.map((p) => (
              <FilterPill key={p.key} active={filter === p.key} count={count(p.key)} onClick={() => setFilter(p.key)}>
                {p.label}
              </FilterPill>
            ))}
          </div>
          <Timeline groups={groups} order={filterGroups[filter]} />
        </>
      )}
      {proofs.data && (
        <Link to="/dowody" className="flex min-h-11 items-center justify-between rounded-xl bg-surface-container-lowest p-space-md">
          <span className="flex items-center gap-3">
            <Icon name="inventory" size={20} className="text-on-surface-variant" />
            <span className="text-label-md font-medium text-on-surface">Schowek dowodów — {proofs.data.length} przechowywanych</span>
          </span>
          <Icon name="chevron_right" size={20} className="text-on-surface-variant" />
        </Link>
      )}
    </div>
  )
}
