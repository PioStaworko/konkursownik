import { useState, type ReactNode } from 'react'
import { useDeleteEntry } from '../../api/hooks'
import type { ContestDto, EntryDto } from '../../api/types'
import { formatDate, formatEntryCounter, formatMoney } from '../../lib/format'
import { Button } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { Icon } from '../../ui/Icon'
import EntryFormV2, { type ExtractedReceipt } from './EntryFormV2'
import PhotoTile from './PhotoTile'

type RenderAi = (onExtracted: (dto: ExtractedReceipt, file: File) => void, ctx: { autoReceipt: boolean }) => ReactNode

function EntryRow({ entry, onEdit }: { entry: EntryDto; onEdit: () => void }) {
  const remove = useDeleteEntry()
  const rows: [string, string | null][] = [
    ['Sklep', entry.store],
    ['Kontakt', entry.contactUsed],
    ['Kod potwierdzenia', entry.confirmationCode],
    ['Odpowiedź', entry.answerText],
  ]
  return (
    <li>
      <Card tone="default" className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col">
            {entry.receiptNumber && <span className="font-mono text-body-lg font-semibold text-on-surface">{entry.receiptNumber}</span>}
            <span className="text-label-md text-on-surface-variant">{formatDate(entry.date)}</span>
          </div>
          {entry.purchaseAmount != null && (
            <span className="font-mono text-body-lg font-semibold text-on-surface">{formatMoney(entry.purchaseAmount)}</span>
          )}
        </div>
        <dl className="flex flex-col gap-0.5 text-body-md">
          {rows.map(([k, v]) =>
            v ? (
              <div key={k} className="flex gap-2">
                <dt className="shrink-0 text-on-surface-variant">{k}:</dt>
                <dd className="whitespace-pre-wrap break-words text-on-surface">{v}</dd>
              </div>
            ) : null,
          )}
        </dl>
        {entry.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {entry.photos.map((p) => (
              <PhotoTile key={p.id} photo={p} />
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edytuj zgłoszenie
          </Button>
          <Button
            variant="ghost"
            disabled={remove.isPending}
            onClick={() => {
              if (window.confirm('Usunąć zgłoszenie razem ze zdjęciami?')) remove.mutate(entry.id)
            }}
          >
            Usuń zgłoszenie
          </Button>
        </div>
        {remove.isError && (
          <p role="alert" className="text-label-md text-error">
            Nie udało się usunąć zgłoszenia.
          </p>
        )}
      </Card>
    </li>
  )
}

type Props = { c: ContestDto; initialFormOpen: boolean; autoReceipt: boolean; renderAi?: RenderAi }

export default function EntriesTab({ c, initialFormOpen, autoReceipt, renderAi }: Props) {
  const [adding, setAdding] = useState(initialFormOpen)
  const [editingId, setEditingId] = useState<string | null>(null)
  const amounts = c.entries.map((e) => e.purchaseAmount).filter((a): a is number => a != null)
  const total = Math.round(amounts.reduce((s, a) => s + a, 0) * 100) / 100

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-headline-sm text-on-surface">Zgłoszenia</h2>
        <span className="font-mono text-mono-data text-on-surface-variant">
          {formatEntryCounter(c.entries.length, c.entryLimitTotal, c.entriesToday, c.entryLimitPerDay)}
        </span>
      </div>
      {adding ? (
        <EntryFormV2
          contestId={c.id}
          contestType={c.type}
          autoReceipt={autoReceipt}
          renderAi={renderAi}
          onDone={() => setAdding(false)}
        />
      ) : (
        <Button icon="add_circle" onClick={() => setAdding(true)}>
          Dodaj zgłoszenie
        </Button>
      )}
      {c.entries.length === 0 && !adding && <p className="py-4 text-center text-on-surface-variant">Brak zgłoszeń</p>}
      {c.entries.length > 0 && (
        <>
          {amounts.length > 0 && (
            <p className="flex items-center gap-1.5 text-label-md text-on-surface-variant">
              <Icon name="receipt_long" size={14} />
              <span className="font-mono text-mono-data">Suma: {formatMoney(total)}</span>
            </p>
          )}
          <ul className="flex flex-col gap-space-sm">
            {c.entries.map((e) =>
              editingId === e.id ? (
                <li key={e.id}>
                  <EntryFormV2 contestId={c.id} contestType={c.type} entry={e} onDone={() => setEditingId(null)} />
                </li>
              ) : (
                <EntryRow key={e.id} entry={e} onEdit={() => setEditingId(e.id)} />
              ),
            )}
          </ul>
        </>
      )}
    </div>
  )
}
