import { useState } from 'react'
import { useDeleteEntry } from '../api/hooks'
import type { ContestType, EntryDto } from '../api/types'
import { formatDate, formatMoney } from '../lib/format'
import { secondaryButtonClass } from '../lib/styles'
import EntryForm from './EntryForm'
import PhotoPicker from './PhotoPicker'

export default function EntryCard({
  contestId,
  contestType,
  entry,
}: {
  contestId: string
  contestType: ContestType
  entry: EntryDto
}) {
  const [editing, setEditing] = useState(false)
  const remove = useDeleteEntry()

  if (editing)
    return (
      <li>
        <EntryForm contestId={contestId} contestType={contestType} entry={entry} onDone={() => setEditing(false)} />
      </li>
    )

  const details: [string, string | null][] = [
    ['Kod potwierdzenia', entry.confirmationCode],
    ['Numer paragonu', entry.receiptNumber],
    ['Kwota', entry.purchaseAmount == null ? null : formatMoney(entry.purchaseAmount)],
    ['Kontakt', entry.contactUsed],
    ['Odpowiedź', entry.answerText],
  ]

  return (
    <li className="space-y-3 rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <p className="font-medium text-slate-900">{formatDate(entry.date)}</p>
      <dl className="space-y-1 text-sm text-slate-700">
        {details.map(([k, v]) =>
          v ? (
            <div key={k} className="flex gap-2">
              <dt className="text-slate-500">{k}:</dt>
              <dd className="whitespace-pre-wrap break-words">{v}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <PhotoPicker entryId={entry.id} photos={entry.photos} />
      <div className="flex gap-2">
        <button type="button" className={secondaryButtonClass} onClick={() => setEditing(true)}>
          Edytuj zgłoszenie
        </button>
        <button
          type="button"
          className={secondaryButtonClass}
          disabled={remove.isPending}
          onClick={() => {
            if (window.confirm('Usunąć zgłoszenie razem ze zdjęciami?')) remove.mutate(entry.id)
          }}
        >
          Usuń zgłoszenie
        </button>
      </div>
    </li>
  )
}
