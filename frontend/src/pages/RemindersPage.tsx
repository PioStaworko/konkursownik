import { Link } from 'react-router'
import { useReminders, useToggleItem } from '../api/hooks'
import { reminderText } from '../lib/reminders'
import { secondaryButtonClass } from '../lib/styles'

export default function RemindersPage() {
  const { data, isPending, isError } = useReminders()
  const toggle = useToggleItem('proof-items')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Pilne</h1>
      {isPending && <p className="text-slate-500">Ładowanie…</p>}
      {isError && <p role="alert" className="text-red-700">Nie udało się wczytać przypomnień</p>}
      {toggle.isError && <p role="alert" className="text-red-700">Nie udało się zapisać zmiany</p>}
      {data && data.length === 0 && (
        <p className="py-8 text-center text-slate-500">Nic pilnego. Wszystko pod kontrolą!</p>
      )}
      {data && data.length > 0 && (
        <ul className="space-y-3">
          {data.map((r) => (
            <li
              key={`${r.kind}-${r.contestId}-${r.itemId ?? ''}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Link to={`/konkursy/${r.contestId}`} className="block min-h-11">
                <span className="block font-medium text-slate-900">{r.contestName}</span>
                <span className="block text-sm text-slate-600">{reminderText(r)}</span>
              </Link>
              {r.kind === 'ProofDisposable' && r.itemId && (
                <button
                  type="button"
                  className={`${secondaryButtonClass} mt-2`}
                  disabled={toggle.isPending}
                  onClick={() => toggle.mutate({ id: r.itemId!, value: true })}
                >
                  Wyrzucone
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
