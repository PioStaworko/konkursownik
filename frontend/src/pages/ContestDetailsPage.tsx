import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useContest, useDeleteContest, useDuplicateContest } from '../api/hooks'
import type { ContestDto } from '../api/types'
import ChecklistSection from '../components/ChecklistSection'
import EntryCard from '../components/EntryCard'
import EntryForm from '../components/EntryForm'
import WinForm from '../components/WinForm'
import { formatDate, formatEntryCounter, formatMoney, keepUntilDetail, safeHttpUrl } from '../lib/format'
import { statusLabel, typeLabel } from '../lib/labels'
import { primaryButtonClass, secondaryButtonClass } from '../lib/styles'

/** Renders a link only for http(s) URLs; anything else (e.g. javascript:) is shown as plain text. */
function ExternalLink({ label, href }: { label: string; href: string | null }) {
  if (!href) return null
  const safe = safeHttpUrl(href)
  return safe ? (
    <a href={safe} target="_blank" rel="noopener noreferrer" className="text-indigo-700 underline">
      {label}
    </a>
  ) : (
    <span className="break-all text-slate-700">
      {label}: {href}
    </span>
  )
}

function Header({ c }: { c: ContestDto }) {
  const navigate = useNavigate()
  const duplicate = useDuplicateContest()
  const remove = useDeleteContest()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h1 className="break-words text-2xl font-semibold text-slate-900">{c.name}</h1>
        <button
          type="button"
          className={secondaryButtonClass}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((o) => !o)}
        >
          Menu
        </button>
      </div>
      {menuOpen && (
        <div className="flex flex-wrap gap-2">
          <Link to={`/konkursy/${c.id}/edycja`} className={`${secondaryButtonClass} inline-flex items-center`}>
            Edytuj
          </Link>
          <button
            type="button"
            className={secondaryButtonClass}
            disabled={duplicate.isPending}
            onClick={async () => navigate(`/konkursy/${await duplicate.mutateAsync(c.id)}/edycja`)}
          >
            Duplikuj
          </button>
          <button
            type="button"
            className={`${secondaryButtonClass} text-red-700`}
            disabled={remove.isPending}
            onClick={async () => {
              if (!window.confirm('Usunąć konkurs razem ze zdjęciami?')) return
              await remove.mutateAsync(c.id)
              navigate('/konkursy')
            }}
          >
            Usuń
          </button>
        </div>
      )}
      {(duplicate.isError || remove.isError) && (
        <p role="alert" className="text-sm text-red-700">
          Operacja nie powiodła się. Spróbuj ponownie.
        </p>
      )}
      <p className="text-sm text-slate-600">
        {statusLabel[c.effectiveStatus]} · {typeLabel[c.type]}
        {c.organizer && ` · ${c.organizer}`}
      </p>
      <p className="text-sm text-slate-600">
        {formatDate(c.startDate)} – {formatDate(c.endDate)}
        {c.resultsDate && ` · wyniki ${formatDate(c.resultsDate)}`}
      </p>
      {c.resultsCheckNote && <p className="text-sm text-slate-600">Wyniki: {c.resultsCheckNote}</p>}
      {(c.prizeDescription || c.prizeValue != null) && (
        <p className="text-sm text-slate-700">
          Nagroda: {c.prizeDescription}
          {c.prizeCount != null && ` (${c.prizeCount} szt.)`}
          {c.prizeValue != null && ` · ${formatMoney(c.prizeValue)}`}
        </p>
      )}
      <p className="flex flex-wrap gap-x-4 text-sm">
        <ExternalLink label="Strona konkursu" href={c.url} />
        <ExternalLink label="Regulamin" href={c.rulesUrl} />
      </p>
      {c.notes && <p className="whitespace-pre-wrap text-sm text-slate-700">{c.notes}</p>}
    </header>
  )
}

function ContestDetails({ c }: { c: ContestDto }) {
  const [addingEntry, setAddingEntry] = useState(false)
  const [editingWin, setEditingWin] = useState(false)

  return (
    <div className="space-y-6">
      <Header c={c} />

      <ChecklistSection
        title="Do zrobienia"
        kind="contest-tasks"
        items={c.tasks.map((t) => ({ id: t.id, label: t.text, checked: t.done }))}
      />
      <ChecklistSection
        title="Do kupienia"
        kind="purchase-items"
        items={c.purchases.map((p) => ({
          id: p.id,
          label: [p.product, p.quantity].filter(Boolean).join(' × '),
          detail: p.store,
          checked: p.bought,
        }))}
      />
      <ChecklistSection
        title="Do zachowania"
        kind="proof-items"
        items={c.proofs.map((p) => ({
          id: p.id,
          label: p.what,
          detail: keepUntilDetail(p.keepUntil, p.location),
          checked: p.discarded,
        }))}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          Zgłoszenia{' '}
          <span className="text-sm font-normal text-slate-600">
            {formatEntryCounter(c.entries.length, c.entryLimitTotal, c.entriesToday, c.entryLimitPerDay)}
          </span>
        </h2>
        <ul className="space-y-3">
          {c.entries.map((e) => (
            <EntryCard key={e.id} contestId={c.id} contestType={c.type} entry={e} />
          ))}
        </ul>
        {addingEntry ? (
          <EntryForm contestId={c.id} contestType={c.type} onDone={() => setAddingEntry(false)} />
        ) : (
          <button type="button" className={primaryButtonClass} onClick={() => setAddingEntry(true)}>
            + Zgłoszenie
          </button>
        )}
      </section>

      <section className="space-y-3">
        {editingWin ? (
          <WinForm contestId={c.id} win={c.win} onDone={() => setEditingWin(false)} />
        ) : (
          <>
            {c.win && (
              <div className="rounded-lg bg-amber-50 p-3 text-sm ring-1 ring-amber-200">
                <p className="font-semibold text-slate-900">Wygrana: {c.win.prizeWon}</p>
                {c.win.prizeValue != null && <p>{formatMoney(c.win.prizeValue)}</p>}
                {c.win.laureateDeadline && <p>Dane laureata do {formatDate(c.win.laureateDeadline)}</p>}
                <p>{c.win.laureateDataSent ? 'Dane laureata wysłane' : 'Dane laureata niewysłane'}</p>
              </div>
            )}
            <button type="button" className={secondaryButtonClass} onClick={() => setEditingWin(true)}>
              Wygrana
            </button>
          </>
        )}
      </section>
    </div>
  )
}

export default function ContestDetailsPage() {
  const { id } = useParams()
  const { data, isPending, isError } = useContest(id)
  if (isPending) return <p className="text-slate-500">Ładowanie…</p>
  if (isError) return <p role="alert" className="text-red-700">Nie udało się wczytać konkursu</p>
  return <ContestDetails c={data} />
}
