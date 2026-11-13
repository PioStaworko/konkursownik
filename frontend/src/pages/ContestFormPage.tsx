import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useContest, useFeatures, useSaveContest } from '../api/hooks'
import type { ContestExtractionDto, ContestStatus, ContestType, ProofDto, PurchaseDto, TaskDto } from '../api/types'
import EditableList from '../components/EditableList'
import { AiBadge } from '../features/ai/AiBadge'
import AiFillSection from '../features/ai/AiFillSection'
import { mergeExtraction } from '../features/ai/mergeExtraction'
import {
  emptyValues, extractionToValues, fromDto, validate,
  type Errors, type FormValues, type TextKey,
} from '../features/contests/contestForm'
import IconPicker from '../features/contests/IconPicker'
import { toUpsert } from '../lib/contestUpsert'
import { statusLabel, typeLabel } from '../lib/labels'
import { tokenInputClass } from '../lib/styles'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { Section } from '../ui/Section'

const input = tokenInputClass

const isEmptyValue = (value: unknown) =>
  value == null || value === '' || (Array.isArray(value) && value.length === 0)

function ContestForm({ id, initial }: { id?: string; initial: FormValues }) {
  const navigate = useNavigate()
  const save = useSaveContest()
  const { aiExtraction } = useFeatures()
  const [v, setV] = useState<FormValues>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])
  const [aiFields, setAiFields] = useState<Set<keyof FormValues>>(new Set())
  // A read takes seconds; merge against what the user has typed since, not the values at request time.
  const latest = useRef(v)
  useEffect(() => {
    latest.current = v
  })

  const clearAi = (key: keyof FormValues) =>
    setAiFields((s) => {
      if (!s.has(key)) return s
      const next = new Set(s)
      next.delete(key)
      return next
    })
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setV((p) => ({ ...p, [key]: value }))
    clearAi(key)
  }
  const text = (key: TextKey) => ({
    value: v[key],
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as FormValues[TextKey]),
  })
  const badge = (key: keyof FormValues) => (aiFields.has(key) ? <AiBadge /> : undefined)

  const applyExtraction = (dto: ContestExtractionDto) => {
    const merged = mergeExtraction(latest.current, extractionToValues(dto), id ? 'edit' : 'new', {
      // a new form always holds the default type, so it counts as "empty"
      isEmpty: (key, value) => (key === 'type' ? value === emptyValues.type : isEmptyValue(value)),
    })
    if (merged.aiFields.size === 0) return
    latest.current = merged.value
    setV(merged.value)
    setAiFields((s) => new Set([...s, ...merged.aiFields]))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setServerErrors([])
    const result = validate(v)
    setErrors(result.errors)
    if (!result.dto) return
    try {
      const savedId = await save.mutateAsync({ id, dto: result.dto })
      navigate(`/konkursy/${savedId}`)
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.errors) {
        setServerErrors(Object.values(err.errors).flat())
      } else {
        setServerErrors(['Nie udało się zapisać konkursu. Spróbuj ponownie.'])
      }
    }
  }

  return (
    <form onSubmit={submit} noValidate className="mx-auto flex w-full max-w-xl flex-col gap-space-lg">
      <h1 className="text-headline-md text-on-surface">{id ? 'Edycja konkursu' : 'Nowy konkurs'}</h1>
      {serverErrors.length > 0 && (
        <div role="alert" className="rounded-lg bg-error-container p-space-sm text-body-md text-on-error-container">
          {serverErrors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      {aiExtraction && <AiFillSection onExtracted={applyExtraction} />}

      <Section icon="emoji_events" title="Podstawowe">
        <Field label="Nazwa" error={errors.name} hint={badge('name')}>
          <input className={input} {...text('name')} />
        </Field>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-label-md text-on-surface-variant">Ikona</span>
            {badge('icon')}
          </div>
          <IconPicker value={v.icon} onChange={(icon) => set('icon', icon)} />
        </div>
        <Field label="Organizator" hint={badge('organizer')}>
          <input className={input} {...text('organizer')} />
        </Field>
        <Field label="Adres konkursu" hint={badge('url')}>
          <input className={input} type="url" inputMode="url" {...text('url')} />
        </Field>
        <Field label="Adres regulaminu" hint={badge('rulesUrl')}>
          <input className={input} type="url" inputMode="url" {...text('rulesUrl')} />
        </Field>
        <Field label="Typ" hint={badge('type')}>
          <select className={input} value={v.type} onChange={(e) => set('type', e.target.value as ContestType)}>
            {(Object.keys(typeLabel) as ContestType[]).map((t) => (
              <option key={t} value={t}>
                {typeLabel[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select className={input} value={v.status} onChange={(e) => set('status', e.target.value as ContestStatus)}>
            {(Object.keys(statusLabel) as ContestStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section icon="calendar_month" title="Daty">
        <Field label="Data startu" error={errors.startDate} hint={badge('startDate')}>
          <input className={`${input} font-mono`} type="date" {...text('startDate')} />
        </Field>
        <Field label="Data końca" error={errors.endDate} hint={badge('endDate')}>
          <input className={`${input} font-mono`} type="date" {...text('endDate')} />
        </Field>
        <Field label="Data wyników" error={errors.resultsDate} hint={badge('resultsDate')}>
          <input className={`${input} font-mono`} type="date" {...text('resultsDate')} />
        </Field>
        <Field label="Gdzie sprawdzić wyniki" hint={badge('resultsCheckNote')}>
          <input className={input} {...text('resultsCheckNote')} />
        </Field>
      </Section>

      <Section icon="shield" title="Limity">
        <Field label="Limit zgłoszeń na dzień" error={errors.entryLimitPerDay} hint={badge('entryLimitPerDay')}>
          <input className={`${input} font-mono`} type="text" inputMode="numeric" {...text('entryLimitPerDay')} />
        </Field>
        <Field label="Limit zgłoszeń łącznie" error={errors.entryLimitTotal} hint={badge('entryLimitTotal')}>
          <input className={`${input} font-mono`} type="text" inputMode="numeric" {...text('entryLimitTotal')} />
        </Field>
      </Section>

      <EditableList<TaskDto>
        title="Do zrobienia"
        icon="checklist"
        addLabel="Dodaj krok"
        items={v.tasks}
        onChange={(items) => set('tasks', items)}
        newItem={() => ({ id: null, text: '', done: false })}
        error={errors.tasks}
        badge={badge('tasks')}
        renderItem={(t, i, update) => (
          <input className={input} aria-label={`Krok ${i + 1}`} value={t.text} onChange={(e) => update({ text: e.target.value })} />
        )}
      />

      <EditableList<PurchaseDto>
        title="Do kupienia"
        icon="shopping_cart"
        addLabel="Dodaj produkt"
        items={v.purchases}
        onChange={(items) => set('purchases', items)}
        newItem={() => ({ id: null, product: '', store: null, quantity: null, bought: false, note: null })}
        error={errors.purchases}
        badge={badge('purchases')}
        renderItem={(p, i, update) => (
          <>
            <input className={input} aria-label={`Produkt ${i + 1}`} value={p.product} onChange={(e) => update({ product: e.target.value })} />
            <input className={input} aria-label={`Sklep ${i + 1}`} value={p.store ?? ''} onChange={(e) => update({ store: e.target.value })} />
            <input className={input} aria-label={`Ilość ${i + 1}`} value={p.quantity ?? ''} onChange={(e) => update({ quantity: e.target.value })} />
            <input className={input} aria-label={`Notatka pozycji ${i + 1}`} placeholder="Notatka" value={p.note ?? ''} onChange={(e) => update({ note: e.target.value })} />
          </>
        )}
      />

      <EditableList<ProofDto>
        title="Do zachowania"
        icon="inventory_2"
        addLabel="Dodaj dowód"
        items={v.proofs}
        onChange={(items) => set('proofs', items)}
        newItem={() => ({ id: null, what: '', keepUntil: null, location: null, discarded: false, note: null })}
        error={errors.proofs}
        badge={badge('proofs')}
        renderItem={(p, i, update) => (
          <>
            <input className={input} aria-label={`Dowód ${i + 1}`} value={p.what} onChange={(e) => update({ what: e.target.value })} />
            <input className={`${input} font-mono`} type="date" aria-label={`Przechowaj do ${i + 1}`} value={p.keepUntil ?? ''} onChange={(e) => update({ keepUntil: e.target.value })} />
            <input className={input} aria-label={`Miejsce ${i + 1}`} value={p.location ?? ''} onChange={(e) => update({ location: e.target.value })} />
            <input className={input} aria-label={`Notatka dowodu ${i + 1}`} placeholder="Notatka" value={p.note ?? ''} onChange={(e) => update({ note: e.target.value })} />
          </>
        )}
      />

      <Section icon="description" title="Notatki">
        <Field label="Notatki" hint={badge('notes')}>
          <textarea className={`${input} py-2`} rows={4} {...text('notes')} />
        </Field>
      </Section>

      <Button type="submit" disabled={save.isPending} className="w-full">
        Zapisz
      </Button>
    </form>
  )
}

export default function ContestFormPage() {
  const { id } = useParams()
  const { data, isPending, isError } = useContest(id)

  if (!id) return <ContestForm initial={emptyValues} />
  if (isPending) return <p className="text-on-surface-variant">Ładowanie…</p>
  if (isError) return <p role="alert" className="text-error">Nie udało się wczytać konkursu</p>
  return <ContestForm key={data.id} id={id} initial={fromDto(toUpsert(data))} />
}
