import { useMemo, useState } from 'react'
import { useContests, useReminders } from '../api/hooks'
import ContestCard from '../features/contests/ContestCard'
import {
  filterContests, sortContests, sortLabel, sortOrder,
  type ContestFilter, type ContestSort,
} from '../features/contests/filters'
import { formatDate, todayInPoland } from '../lib/format'
import { statusLabel } from '../lib/labels'
import { FilterPill } from '../ui/FilterPill'
import { Icon } from '../ui/Icon'

const pills: { filter: ContestFilter; label: string }[] = [
  { filter: 'all', label: 'Wszystkie' },
  { filter: 'Planned', label: 'Planowane' },
  { filter: 'Bought', label: 'Kupione' },
  { filter: 'Submitted', label: 'Zgłoszone' },
  { filter: 'AwaitingResults', label: statusLabel.AwaitingResults },
  { filter: 'Won', label: statusLabel.Won },
]

export default function ContestsPage() {
  const [filter, setFilter] = useState<ContestFilter>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ContestSort>('deadline')
  const archive = filter === 'archive'
  const active = useContests('active')
  const archived = useContests('archive', archive)
  const reminders = useReminders()
  const today = todayInPoland()

  const list = archive ? archived : active
  const visible = useMemo(
    () => sortContests(filterContests(list.data ?? [], filter, query), sort),
    [list.data, filter, query, sort],
  )
  const countOf = (f: ContestFilter) =>
    f === 'all' ? active.data?.length : active.data?.filter((c) => c.effectiveStatus === f).length
  const dueToday = reminders.data?.filter((r) => r.dueDate <= today).length ?? 0

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-space-xs">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          <span className="text-label-md text-on-surface">Panel</span>
          <span className="font-mono text-label-xs text-outline-variant">•</span>
          <span className="font-mono text-label-xs text-on-surface-variant">{formatDate(today)}</span>
        </div>
        {reminders.data && (
          <div className="flex items-center gap-1.5 rounded-full bg-surface-container-high px-2 py-0.5 font-mono text-label-xs text-tertiary">
            <Icon name="alarm" size={13} />
            <span>{dueToday} na dziś</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-space-xs">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-sm shadow-sm">
          <div className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-full bg-primary/10 blur-lg" />
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-xs uppercase tracking-wider">Aktywne</span>
            <Icon name="emoji_events" size={15} className="text-primary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-headline-lg tracking-tight text-on-surface">{active.data?.length ?? '–'}</span>
            <span className="text-label-xs text-on-surface-variant">poz.</span>
          </div>
        </div>
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-surface-container-low p-space-sm shadow-sm">
          <div className="pointer-events-none absolute -right-3 -top-3 h-10 w-10 rounded-full bg-tertiary/15 blur-lg" />
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="text-label-xs uppercase tracking-wider">Dziś</span>
            <Icon name="send_time_extension" size={15} className="text-tertiary" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-mono text-headline-lg tracking-tight text-tertiary">{reminders.data ? dueToday : '–'}</span>
            <span className="text-label-xs text-tertiary/80">pilne</span>
          </div>
        </div>
      </div>

      <div className="-mx-margin-mobile flex items-center gap-space-xs overflow-x-auto px-margin-mobile py-0.5 [scrollbar-width:none]">
        {pills.map((p) => (
          <FilterPill
            key={p.filter}
            active={filter === p.filter}
            count={countOf(p.filter)}
            icon={p.filter === 'Won' ? 'military_tech' : undefined}
            onClick={() => setFilter(p.filter)}
          >
            {p.label}
          </FilterPill>
        ))}
        <FilterPill active={archive} onClick={() => setFilter('archive')}>
          Archiwum
        </FilterPill>
      </div>

      <div className="flex items-center gap-space-xs">
        <div className="relative flex-1">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Szukaj konkursu"
            placeholder="Szukaj: nazwa, organizator, sklep"
            className="h-11 w-full rounded-lg bg-surface-container pl-9 pr-3 text-body-md text-on-surface placeholder:text-outline focus:bg-surface-container-high focus:outline-none"
          />
        </div>
        <button
          type="button"
          aria-label={`Sortuj: ${sortLabel[sort]}`}
          onClick={() => setSort(sortOrder[(sortOrder.indexOf(sort) + 1) % sortOrder.length])}
          className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg bg-surface-container px-3 text-label-md text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <Icon name="sort" size={18} />
          <span className="font-mono text-on-surface">{sortLabel[sort]}</span>
        </button>
      </div>

      {list.isPending && list.fetchStatus !== 'idle' && <p className="text-on-surface-variant">Ładowanie…</p>}
      {list.isError && (
        <p role="alert" className="text-error">
          Nie udało się wczytać konkursów
        </p>
      )}
      {list.data && visible.length === 0 && (
        <div className="flex flex-col items-center py-space-xl text-center">
          <div className="mb-space-sm flex h-16 w-16 items-center justify-center rounded-full bg-surface-container text-outline">
            <Icon name="filter_list_off" size={32} />
          </div>
          <h4 className="text-headline-sm text-on-surface">Brak konkursów w tej kategorii</h4>
        </div>
      )}
      {visible.length > 0 && (
        <div className="grid grid-cols-1 gap-space-md lg:grid-cols-2">
          {visible.map((c) => (
            <ContestCard key={c.id} contest={c} />
          ))}
        </div>
      )}

      <footer className="my-space-lg flex items-center justify-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-surface-container-low px-3 py-1.5 font-mono text-label-xs text-outline">
          <Icon name="verified_user" size={14} className="text-secondary" />
          <span>Twoje dane widzisz tylko Ty</span>
        </div>
      </footer>
    </div>
  )
}
