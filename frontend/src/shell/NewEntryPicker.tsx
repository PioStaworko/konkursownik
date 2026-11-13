import { useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useContests } from '../api/hooks'
import { formatDate, todayInPoland } from '../lib/format'
import { Icon } from '../ui/Icon'

export default function NewEntryPicker({ onDone }: { onDone: () => void }) {
  const contests = useContests('active')
  const navigate = useNavigate()
  const open = useMemo(() => {
    const today = todayInPoland()
    return (contests.data ?? []).filter((c) => c.endDate >= today).sort((a, b) => a.endDate.localeCompare(b.endDate))
  }, [contests.data])

  if (contests.isPending) return <p className="text-on-surface-variant">Ładowanie…</p>
  if (contests.isError) return <p role="alert" className="text-error">Nie udało się wczytać konkursów</p>
  if (open.length === 0) return <p className="text-on-surface-variant">Brak trwających konkursów</p>

  return (
    <ul className="flex flex-col gap-space-xs">
      {open.map((c) => (
        <li key={c.id}>
          <button
            type="button"
            onClick={() => {
              onDone()
              navigate(`/konkursy/${c.id}?zgloszenie=1`)
            }}
            className="flex min-h-11 w-full items-center gap-space-sm rounded-lg bg-surface-container-low px-space-md py-space-sm text-left hover:bg-surface-container-high"
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-title-md text-on-surface">{c.name}</span>
              <span className="block text-label-md text-on-surface-variant">do {formatDate(c.endDate)}</span>
            </span>
            <span className="font-mono text-mono-data text-on-surface-variant">
              {c.entryLimitPerDay != null ? `dziś ${c.entriesToday}/${c.entryLimitPerDay}` : `dziś ${c.entriesToday}`}
            </span>
            <Icon name="chevron_right" size={18} className="text-on-surface-variant" />
          </button>
        </li>
      ))}
    </ul>
  )
}
