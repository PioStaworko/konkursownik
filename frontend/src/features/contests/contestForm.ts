import type {
  ContestExtractionDto,
  ContestStatus,
  ContestType,
  ContestUpsertDto,
  ProofDto,
  PurchaseDto,
  TaskDto,
} from '../../api/types'
import { CONTEST_ICONS } from '../../lib/contestIcons'
import { parseAmount } from '../../lib/format'
import { typeLabel } from '../../lib/labels'

export interface FormValues {
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
  icon: string | null
  tasks: TaskDto[]
  purchases: PurchaseDto[]
  proofs: ProofDto[]
}

export type TextKey = Exclude<keyof FormValues, 'icon' | 'tasks' | 'purchases' | 'proofs'>
export type Errors = Partial<Record<keyof FormValues, string>>

export const emptyValues: FormValues = {
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
  icon: null,
  tasks: [],
  purchases: [],
  proofs: [],
}

export const fromDto = (d: ContestUpsertDto): FormValues => ({
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
  icon: d.icon ?? null,
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
export function validate(v: FormValues): { errors: Errors; dto: ContestUpsertDto | null } {
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
  if (v.purchases.some((p) => (p.note ?? '').length > 300))
    errors.purchases ??= 'Notatka do zakupu może mieć maks. 300 znaków.'
  if (v.proofs.some((p) => (p.note ?? '').length > 300))
    errors.proofs ??= 'Notatka do dowodu może mieć maks. 300 znaków.'

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
      icon: v.icon,
      tasks: v.tasks.map((t) => ({ ...t, text: t.text.trim() })),
      purchases: v.purchases.map((p) => ({
        ...p,
        product: p.product.trim(),
        store: orNull(p.store ?? ''),
        quantity: orNull(p.quantity ?? ''),
        note: orNull(p.note ?? ''),
      })),
      proofs: v.proofs.map((p) => ({
        ...p,
        what: p.what.trim(),
        keepUntil: p.keepUntil || null,
        location: orNull(p.location ?? ''),
        note: orNull(p.note ?? ''),
      })),
    },
  }
}

const num = (n: number | null | undefined) => (n == null ? undefined : String(n).replace('.', ','))
const str = (s: string | null | undefined) => (s && s.trim() !== '' ? s.trim() : undefined)

/** Maps an AI extraction onto form values; anything the AI left empty is simply absent. */
export function extractionToValues(x: ContestExtractionDto): Partial<FormValues> {
  const out: Partial<FormValues> = {
    name: str(x.name),
    organizer: str(x.organizer),
    url: str(x.url),
    rulesUrl: str(x.rulesUrl),
    type: x.type && x.type in typeLabel ? (x.type as ContestType) : undefined,
    icon: x.icon && (CONTEST_ICONS as readonly string[]).includes(x.icon) ? x.icon : undefined,
    prizeDescription: str(x.prizeDescription),
    prizeValue: num(x.prizeValue),
    prizeCount: num(x.prizeCount),
    startDate: str(x.startDate),
    endDate: str(x.endDate),
    resultsDate: str(x.resultsDate),
    resultsCheckNote: str(x.resultsCheckNote),
    entryLimitPerDay: num(x.entryLimitPerDay),
    entryLimitTotal: num(x.entryLimitTotal),
    notes: str(x.notes),
    tasks: (x.tasks ?? []).filter((t) => t.trim() !== '').map((text) => ({ id: null, text: text.trim(), done: false })),
    purchases: (x.purchases ?? [])
      .filter((p) => str(p.product))
      .map((p) => ({
        id: null, product: p.product!.trim(), store: str(p.store) ?? null, quantity: str(p.quantity) ?? null,
        bought: false, note: str(p.note) ?? null,
      })),
    proofs: (x.proofs ?? [])
      .filter((p) => str(p.what))
      .map((p) => ({
        id: null, what: p.what!.trim(), keepUntil: str(p.keepUntil) ?? null, location: null,
        discarded: false, note: str(p.note) ?? null,
      })),
  }
  for (const k of Object.keys(out) as (keyof FormValues)[]) if (out[k] === undefined) delete out[k]
  return out
}
