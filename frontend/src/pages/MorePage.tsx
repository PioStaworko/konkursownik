import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useCreateInvite, useInvites, useStats } from '../api/hooks'
import { useAuth } from '../auth/AuthProvider'
import { formatMoney } from '../lib/format'
import { primaryButtonClass, secondaryButtonClass } from '../lib/styles'

export default function MorePage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const stats = useStats()
  const invites = useInvites()
  const createInvite = useCreateInvite()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000)
    } catch {
      // clipboard unavailable: the code stays selectable
    }
  }

  const rows = stats.data && [
    ['Konkursy', String(stats.data.contests)],
    ['Zgłoszenia', String(stats.data.entries)],
    ['Wygrane', String(stats.data.wins)],
    ['Wydane', formatMoney(stats.data.totalSpent)],
    ['Wartość wygranych', formatMoney(stats.data.totalWonValue)],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Więcej</h1>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Statystyki</h2>
        {stats.isPending && <p className="text-slate-500">Ładowanie…</p>}
        {stats.isError && <p role="alert" className="text-red-700">Nie udało się wczytać statystyk</p>}
        {rows && (
          <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between px-4 py-2">
                <dt className="text-slate-600">{label}</dt>
                <dd className="font-medium text-slate-900">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">Zaproszenia</h2>
        <button
          type="button"
          className={primaryButtonClass}
          disabled={createInvite.isPending}
          onClick={() => createInvite.mutate()}
        >
          Wygeneruj kod
        </button>
        {createInvite.isError && (
          <p role="alert" className="text-red-700">Nie udało się wygenerować kodu</p>
        )}
        {invites.isError && <p role="alert" className="text-red-700">Nie udało się wczytać zaproszeń</p>}
        {invites.data && (
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-sm">
            {invites.data.map((i) => (
              <li key={i.code} className="flex items-center gap-3 px-4 py-2">
                <code className="flex-1 select-all break-all text-sm">{i.code}</code>
                <span className="text-sm text-slate-600">{i.used ? 'zużyty' : 'wolny'}</span>
                <button type="button" className={secondaryButtonClass} onClick={() => void copy(i.code)}>
                  {copied === i.code ? 'Skopiowano' : 'Kopiuj'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <button
        type="button"
        className={`${secondaryButtonClass} w-full`}
        onClick={() => void logout().then(() => navigate('/login'))}
      >
        Wyloguj
      </button>
    </div>
  )
}
