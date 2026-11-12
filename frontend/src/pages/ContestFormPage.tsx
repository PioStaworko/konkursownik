import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ApiError } from '../api/client'
import { useContest, useSaveContest } from '../api/hooks'
import type {
  ContestStatus,
  ContestType,
  ContestUpsertDto,
  ProofDto,
  PurchaseDto,
  TaskDto,
} from '../api/types'
import EditableList from '../components/EditableList'
import { parseAmount } from '../lib/format'
import { statusLabel, typeLabel } from '../lib/labels'
import { inputClass, labelClass, primaryButtonClass } from '../lib/styles'

interface FormValues {
  name: string
  organizer: string
  url: string
  rulesUrl: string
  type: ContestType
  status: ContestStatus
  prizeDescription: string
  prizeValue: string
  prizeCount: string
  startDate: string
  endDate: string
  resultsDate: string
  resultsCheckNote: string
  entryLimitPerDay: string
  entryLimitTotal: string
  notes: string
  tasks: TaskDto[]
  purchases: PurchaseDto[]
  proofs: ProofDto[]
}

type TextKey = Exclude<keyof FormValues, 'tasks' | 'purchases' | 'proofs'>
type Errors = Partial<Record<keyof FormValues, string>>

const emptyValues: FormValues = {
  name: '',
  organizer: '',
  url: '',
  rulesUrl: '',
  type: 'Lottery',
  status: 'Planned',
  prizeDescription: '',
  prizeValue: '',
  prizeCount: '',
  startDate: '',
  endDate: '',
  resultsDate: '',
  resultsCheckNote: '',
  entryLimitPerDay: '',
  entryLimitTotal: '',
  notes: '',
  tasks: [],
  purchases: [],
  proofs: [],
}

const fromDto = (d: ContestUpsertDto): FormValues => ({
  name: d.name,
  organizer: d.organizer ?? '',
  url: d.url ?? '',
  rulesUrl: d.rulesUrl ?? '',
  type: d.type,
  status: d.status,
  prizeDescription: d.prizeDescription ?? '',
  prizeValue: d.prizeValue == null ? '' : String(d.prizeValue).replace('.', ','),
  prizeCount: d.prizeCount == null ? '' : String(d.prizeCount),
  startDate: d.startDate,
  endDate: d.endDate,
  resultsDate: d.resultsDate ?? '',
  resultsCheckNote: d.resultsCheckNote ?? '',
  entryLimitPerDay: d.entryLimitPerDay == null ? '' : String(d.entryLimitPerDay),
  entryLimitTotal: d.entryLimitTotal == null ? '' : String(d.entryLimitTotal),
  notes: d.notes ?? '',
  tasks: d.tasks,
  purchases: d.purchases,
  proofs: d.proofs,
})

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

function parseCount(s: string): number | null {
  const t = s.trim()
  if (t === '') return null
  return /^\d+$/.test(t) ? Number(t) : NaN
}

const badText = (s: string) => s.trim() === '' || s.length > 300

/** Mirrors the server's ContestValidation. */
function validate(v: FormValues): { errors: Errors; dto: ContestUpsertDto | null } {
  const errors: Errors = {}
  if (v.name.trim() === '' || v.name.length > 200) errors.name = 'Nazwa jest wymagana (maks. 200 znaków).'
  if (!v.startDate) errors.startDate = 'Podaj datę startu'
  if (!v.endDate) errors.endDate = 'Podaj datę końca'
  if (v.startDate && v.endDate && v.endDate < v.startDate)
    errors.endDate = 'Data końca nie może być przed datą startu'
  if (v.resultsDate && v.startDate && v.resultsDate < v.startDate)
    errors.resultsDate = 'Data wyników nie może być przed datą startu'

  const prizeValue = parseAmount(v.prizeValue)
  if (prizeValue !== null && Number.isNaN(prizeValue)) errors.prizeValue = 'Nieprawidłowa kwota'
  else if (prizeValue !== null && prizeValue < 0) errors.prizeValue = 'Wartość nagrody nie może być ujemna.'

  const prizeCount = parseCount(v.prizeCount)
  if (Number.isNaN(prizeCount)) errors.prizeCount = 'Nieprawidłowa liczba'

  const perDay = parseCount(v.entryLimitPerDay)
  if (Number.isNaN(perDay)) errors.entryLimitPerDay = 'Nieprawidłowa liczba'
  else if (perDay !== null && perDay <= 0) errors.entryLimitPerDay = 'Limit musi być większy od zera.'
  const total = parseCount(v.entryLimitTotal)
  if (Number.isNaN(total)) errors.entryLimitTotal = 'Nieprawidłowa liczba'
  else if (total !== null && total <= 0) errors.entryLimitTotal = 'Limit musi być większy od zera.'

  if (v.tasks.some((t) => badText(t.text))) errors.tasks = 'Treść kroku jest wymagana (maks. 300 znaków).'
  if (v.purchases.some((p) => badText(p.product)))
    errors.purchases = 'Nazwa produktu jest wymagana (maks. 300 znaków).'
  if (v.proofs.some((p) => badText(p.what))) errors.proofs = 'Opis dowodu jest wymagany (maks. 300 znaków).'

  if (Object.keys(errors).length > 0) return { errors, dto: null }
  return {
    errors,
    dto: {
      name: v.name.trim(),
      organizer: orNull(v.organizer),
      url: orNull(v.url),
      rulesUrl: orNull(v.rulesUrl),
      type: v.type,
      prizeDescription: orNull(v.prizeDescription),
      prizeValue,
      prizeCount,
      startDate: v.startDate,
      endDate: v.endDate,
      resultsDate: v.resultsDate || null,
      resultsCheckNote: orNull(v.resultsCheckNote),
      entryLimitPerDay: perDay,
      entryLimitTotal: total,
      status: v.status,
      notes: orNull(v.notes),
      tasks: v.tasks.map((t) => ({ ...t, text: t.text.trim() })),
      purchases: v.purchases.map((p) => ({
        ...p,
        product: p.product.trim(),
        store: orNull(p.store ?? ''),
        quantity: orNull(p.quantity ?? ''),
      })),
      proofs: v.proofs.map((p) => ({
        ...p,
        what: p.what.trim(),
        keepUntil: p.keepUntil || null,
        location: orNull(p.location ?? ''),
      })),
    },
  }
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className={labelClass}>
        <span>{label}</span>
        {children}
      </label>
      {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
    </div>
  )
}

function ContestForm({ id, initial }: { id?: string; initial: FormValues }) {
  const navigate = useNavigate()
  const save = useSaveContest()
  const [v, setV] = useState<FormValues>(initial)
  const [errors, setErrors] = useState<Errors>({})
  const [serverErrors, setServerErrors] = useState<string[]>([])

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setV((p) => ({ ...p, [key]: value }))
  const text = (key: TextKey) => ({
    value: v[key],
    onChange: (e: { target: { value: string } }) => setV((p) => ({ ...p, [key]: e.target.value })),
  })

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
    <form onSubmit={submit} noValidate className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">{id ? 'Edycja konkursu' : 'Nowy konkurs'}</h1>
      {serverErrors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {serverErrors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}

      <Section title="Podstawowe">
        <Field label="Nazwa" error={errors.name}>
          <input className={inputClass} {...text('name')} />
        </Field>
        <Field label="Organizator">
          <input className={inputClass} {...text('organizer')} />
        </Field>
        <Field label="Adres konkursu">
          <input className={inputClass} type="url" inputMode="url" {...text('url')} />
        </Field>
        <Field label="Adres regulaminu">
          <input className={inputClass} type="url" inputMode="url" {...text('rulesUrl')} />
        </Field>
        <Field label="Typ">
          <select className={inputClass} value={v.type} onChange={(e) => set('type', e.target.value as ContestType)}>
            {(Object.keys(typeLabel) as ContestType[]).map((t) => (
              <option key={t} value={t}>
                {typeLabel[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Status">
          <select
            className={inputClass}
            value={v.status}
            onChange={(e) => set('status', e.target.value as ContestStatus)}
          >
            {(Object.keys(statusLabel) as ContestStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Nagroda">
        <Field label="Opis nagrody">
          <input className={inputClass} {...text('prizeDescription')} />
        </Field>
        <Field label="Wartość nagrody" error={errors.prizeValue}>
          <input className={inputClass} type="text" inputMode="decimal" {...text('prizeValue')} />
        </Field>
        <Field label="Liczba nagród" error={errors.prizeCount}>
          <input className={inputClass} type="text" inputMode="numeric" {...text('prizeCount')} />
        </Field>
      </Section>

      <Section title="Daty">
        <Field label="Data startu" error={errors.startDate}>
          <input className={inputClass} type="date" {...text('startDate')} />
        </Field>
        <Field label="Data końca" error={errors.endDate}>
          <input className={inputClass} type="date" {...text('endDate')} />
        </Field>
        <Field label="Data wyników" error={errors.resultsDate}>
          <input className={inputClass} type="date" {...text('resultsDate')} />
        </Field>
        <Field label="Gdzie sprawdzić wyniki">
          <input className={inputClass} {...text('resultsCheckNote')} />
        </Field>
      </Section>

      <Section title="Limity">
        <Field label="Limit zgłoszeń na dzień" error={errors.entryLimitPerDay}>
          <input className={inputClass} type="text" inputMode="numeric" {...text('entryLimitPerDay')} />
        </Field>
        <Field label="Limit zgłoszeń łącznie" error={errors.entryLimitTotal}>
          <input className={inputClass} type="text" inputMode="numeric" {...text('entryLimitTotal')} />
        </Field>
      </Section>

      <EditableList<TaskDto>
        title="Do zrobienia"
        addLabel="Dodaj krok"
        items={v.tasks}
        onChange={(items) => set('tasks', items)}
        newItem={() => ({ id: null, text: '', done: false })}
        error={errors.tasks}
        renderItem={(t, i, update) => (
          <input
            className={inputClass}
            aria-label={`Krok ${i + 1}`}
            value={t.text}
            onChange={(e) => update({ text: e.target.value })}
          />
        )}
      />

      <EditableList<PurchaseDto>
        title="Do kupienia"
        addLabel="Dodaj produkt"
        items={v.purchases}
        onChange={(items) => set('purchases', items)}
        newItem={() => ({ id: null, product: '', store: null, quantity: null, bought: false })}
        error={errors.purchases}
        renderItem={(p, i, update) => (
          <>
            <input
              className={inputClass}
              aria-label={`Produkt ${i + 1}`}
              value={p.product}
              onChange={(e) => update({ product: e.target.value })}
            />
            <input
              className={inputClass}
              aria-label={`Sklep ${i + 1}`}
              value={p.store ?? ''}
              onChange={(e) => update({ store: e.target.value })}
            />
            <input
              className={inputClass}
              aria-label={`Ilość ${i + 1}`}
              value={p.quantity ?? ''}
              onChange={(e) => update({ quantity: e.target.value })}
            />
          </>
        )}
      />

      <EditableList<ProofDto>
        title="Do zachowania"
        addLabel="Dodaj dowód"
        items={v.proofs}
        onChange={(items) => set('proofs', items)}
        newItem={() => ({ id: null, what: '', keepUntil: null, location: null, discarded: false })}
        error={errors.proofs}
        renderItem={(p, i, update) => (
          <>
            <input
              className={inputClass}
              aria-label={`Dowód ${i + 1}`}
              value={p.what}
              onChange={(e) => update({ what: e.target.value })}
            />
            <input
              className={inputClass}
              type="date"
              aria-label={`Przechowaj do ${i + 1}`}
              value={p.keepUntil ?? ''}
              onChange={(e) => update({ keepUntil: e.target.value })}
            />
            <input
              className={inputClass}
              aria-label={`Miejsce ${i + 1}`}
              value={p.location ?? ''}
              onChange={(e) => update({ location: e.target.value })}
            />
          </>
        )}
      />

      <Section title="Notatki">
        <Field label="Notatki">
          <textarea className={`${inputClass} py-2`} rows={4} {...text('notes')} />
        </Field>
      </Section>

      <button type="submit" disabled={save.isPending} className={`${primaryButtonClass} w-full`}>
        Zapisz
      </button>
    </form>
  )
}

export default function ContestFormPage() {
  const { id } = useParams()
  const { data, isPending, isError } = useContest(id)

  if (!id) return <ContestForm initial={emptyValues} />
  if (isPending) return <p className="text-slate-500">Ładowanie…</p>
  if (isError) return <p role="alert" className="text-red-700">Nie udało się wczytać konkursu</p>
  return <ContestForm key={data.id} id={id} initial={fromDto(data)} />
}
