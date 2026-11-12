import { useState } from 'react'
import { Link } from 'react-router'
import { useContests, type ContestView } from '../api/hooks'
import { formatDate } from '../lib/format'
import { statusLabel } from '../lib/labels'
import { primaryButtonClass } from '../lib/styles'

const tabs: { view: ContestView; label: string; empty: string }[] = [
  { view: 'active', label: 'Aktywne', empty: 'Brak aktywnych konkursów' },
  { view: 'archive', label: 'Archiwum', empty: 'Archiwum jest puste' },
]

export default function ContestsPage() {
  const [view, setView] = useState<ContestView>('active')
  const { data, isPending, isError } = useContests(view)
  const tab = tabs.find((t) => t.view === view)!

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Konkursy</h1>
        <Link to="/konkursy/nowy" className={`${primaryButtonClass} inline-flex items-center`}>
          + Nowy konkurs
        </Link>
      </div>
      <div role="tablist" className="flex rounded-lg bg-slate-200 p-1">
        {tabs.map((t) => (
          <button
            key={t.view}
            role="tab"
            type="button"
            aria-selected={view === t.view}
            onClick={() => setView(t.view)}
            className={`min-h-11 flex-1 rounded-md text-sm font-medium ${
              view === t.view ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {isPending && <p className="text-slate-500">Ładowanie…</p>}
      {isError && <p role="alert" className="text-red-700">Nie udało się wczytać konkursów</p>}
      {data && data.length === 0 && <p className="py-8 text-center text-slate-500">{tab.empty}</p>}
      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((c) => (
            <li key={c.id}>
              <Link
                to={`/konkursy/${c.id}`}
                className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                    {statusLabel[c.effectiveStatus]}
                  </span>
                </div>
                <div className="mt-1 flex justify-between text-sm text-slate-500">
                  <span>do {formatDate(c.endDate)}</span>
                  <span>
                    {c.entryLimitTotal != null ? `${c.entryCount}/${c.entryLimitTotal}` : c.entryCount}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
