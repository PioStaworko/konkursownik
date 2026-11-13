import { useState, type FormEvent } from 'react'
import { apiFetch } from '../../api/client'
import { useContests, useSaveContest } from '../../api/hooks'
import type { ContestDto, ContestUpsertDto } from '../../api/types'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'

const control =
  'min-h-11 w-full rounded-lg bg-surface-container-highest px-3 text-body-md text-on-surface outline-none focus:ring-2 focus:ring-primary'

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

/** Strips the read-only parts of a fetched contest; children keep their ids. */
function toUpsert(c: ContestDto): ContestUpsertDto {
  return {
    name: c.name, organizer: c.organizer, url: c.url, rulesUrl: c.rulesUrl, type: c.type,
    prizeDescription: c.prizeDescription, prizeValue: c.prizeValue, prizeCount: c.prizeCount,
    startDate: c.startDate, endDate: c.endDate, resultsDate: c.resultsDate, resultsCheckNote: c.resultsCheckNote,
    entryLimitPerDay: c.entryLimitPerDay, entryLimitTotal: c.entryLimitTotal, status: c.status, notes: c.notes,
    icon: c.icon, tasks: c.tasks, purchases: c.purchases, proofs: c.proofs,
  }
}

export default function QuickAddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const contests = useContests('active')
  const save = useSaveContest()
  const [contestId, setContestId] = useState('')
  const [product, setProduct] = useState('')
  const [store, setStore] = useState('')
  const [quantity, setQuantity] = useState('')
  const [note, setNote] = useState('')
  const [errors, setErrors] = useState<{ contest?: string; product?: string }>({})
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const next: typeof errors = {}
    if (!contestId) next.contest = 'Wybierz konkurs'
    if (!product.trim()) next.product = 'Podaj nazwę produktu'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    setFailed(false)
    setBusy(true)
    try {
      const contest = await apiFetch<ContestDto>(`/api/contests/${contestId}`)
      const dto = toUpsert(contest)
      dto.purchases = [
        ...dto.purchases,
        { id: null, product: product.trim(), store: orNull(store), quantity: orNull(quantity), bought: false, note: orNull(note) },
      ]
      await save.mutateAsync({ id: contestId, dto })
      setProduct(''); setStore(''); setQuantity(''); setNote('')
      onClose()
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Dodaj do listy">
      <form onSubmit={submit} className="flex flex-col gap-space-md" noValidate>
        <Field label="Konkurs" error={errors.contest}>
          <select value={contestId} onChange={(e) => setContestId(e.target.value)} className={control}>
            <option value="">Wybierz…</option>
            {(contests.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Produkt" error={errors.product}>
          <input value={product} onChange={(e) => setProduct(e.target.value)} maxLength={300} className={control} />
        </Field>
        <Field label="Sklep">
          <input value={store} onChange={(e) => setStore(e.target.value)} className={control} />
        </Field>
        <Field label="Ilość">
          <input value={quantity} onChange={(e) => setQuantity(e.target.value)} className={control} />
        </Field>
        <Field label="Notatka">
          <input value={note} onChange={(e) => setNote(e.target.value)} className={control} />
        </Field>
        {failed && <p role="alert" className="text-label-md text-error">Nie udało się dodać pozycji</p>}
        <Button type="submit" disabled={busy}>Dodaj do listy</Button>
      </form>
    </BottomSheet>
  )
}
