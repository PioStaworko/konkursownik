import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { useSaveEntry, useUploadPhoto } from '../../api/hooks'
import type { ContestType, EntryDto, EntryUpsertDto, PhotoLabel } from '../../api/types'
import { formatBytes, parseAmount, todayInPoland } from '../../lib/format'
import { photoLabel } from '../../lib/labels'
import { tokenInputClass } from '../../lib/styles'
import { Button, IconButton } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Icon } from '../../ui/Icon'
import PhotoTile from './PhotoTile'
import { MAX_PHOTO_BYTES, PHOTO_ACCEPT, PHOTO_TOO_LARGE, uploadError } from './photoUpload'

/** Values read from a receipt (Task 15's AI button); only non-null fields are applied. */
export interface ExtractedReceipt {
  receiptNumber?: string | null
  purchaseAmount?: number | null
  store?: string | null
  date?: string | null
}

interface Props {
  contestId: string
  contestType: ContestType
  entry?: EntryDto
  onDone: () => void
  /** Set by `?paragon=1`; passed to the AI slot, which decides what to do with it. */
  autoReceipt?: boolean
  /** Slot for the receipt-reading button. */
  renderAi?: (onExtracted: (dto: ExtractedReceipt, file: File) => void, ctx: { autoReceipt: boolean }) => ReactNode
}

interface Pending {
  key: number
  file: File
  label: PhotoLabel
}

const LABELS = Object.keys(photoLabel) as PhotoLabel[]
const orNull = (s: string) => (s.trim() === '' ? null : s.trim())
const amountText = (n: number) => String(n).replace('.', ',')

export default function EntryFormV2({ contestId, contestType, entry, onDone, autoReceipt = false, renderAi }: Props) {
  const save = useSaveEntry(contestId)
  const upload = useUploadPhoto()
  const fileRef = useRef<HTMLInputElement>(null)
  const nextKey = useRef(0)
  const [savedId, setSavedId] = useState<string | undefined>(entry?.id)
  const [date, setDate] = useState(entry?.date ?? todayInPoland())
  const [receiptNumber, setReceiptNumber] = useState(entry?.receiptNumber ?? '')
  const [amount, setAmount] = useState(entry?.purchaseAmount == null ? '' : amountText(entry.purchaseAmount))
  const [store, setStore] = useState(entry?.store ?? '')
  const [contactUsed, setContactUsed] = useState(entry?.contactUsed ?? '')
  const [confirmationCode, setConfirmationCode] = useState(entry?.confirmationCode ?? '')
  const [answerText, setAnswerText] = useState(entry?.answerText ?? '')
  const [pending, setPending] = useState<Pending[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [photoFailure, setPhotoFailure] = useState<string | null>(null)

  const addFile = (file: File) => {
    if (file.size > MAX_PHOTO_BYTES) {
      setErrors([PHOTO_TOO_LARGE])
      return
    }
    setPending((p) => [...p, { key: nextKey.current++, file, label: 'Receipt' }])
  }

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErrors([])
    addFile(file)
  }

  const onExtracted = (dto: ExtractedReceipt, file: File) => {
    if (dto.receiptNumber) setReceiptNumber(dto.receiptNumber)
    if (dto.purchaseAmount != null) setAmount(amountText(dto.purchaseAmount))
    if (dto.store) setStore(dto.store)
    if (dto.date) setDate(dto.date)
    setErrors([])
    addFile(file)
  }

  const copyCode = () => void navigator.clipboard?.writeText(confirmationCode)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const purchaseAmount = parseAmount(amount)
    const found: string[] = []
    if (!date) found.push('Podaj datę zgłoszenia')
    if (purchaseAmount !== null && Number.isNaN(purchaseAmount)) found.push('Nieprawidłowa kwota')
    else if (purchaseAmount !== null && purchaseAmount < 0) found.push('Kwota nie może być ujemna')
    setErrors(found)
    if (found.length > 0) return
    const dto: EntryUpsertDto = {
      date,
      confirmationCode: orNull(confirmationCode),
      receiptNumber: orNull(receiptNumber),
      purchaseAmount,
      contactUsed: orNull(contactUsed),
      answerText: contestType === 'Creative' ? orNull(answerText) : null,
      store: orNull(store),
    }
    let id: string
    try {
      id = await save.mutateAsync({ id: savedId, dto })
      setSavedId(id)
    } catch (err) {
      setErrors(
        err instanceof ApiError && err.status === 400 && err.errors
          ? Object.values(err.errors).flat()
          : ['Nie udało się zapisać zgłoszenia. Spróbuj ponownie.'],
      )
      return
    }
    await uploadPending(id)
  }

  // Photos go up after the entry exists; a failed one stays queued and only the photos are retried.
  const uploadPending = async (id: string) => {
    setPhotoFailure(null)
    for (const p of pending) {
      try {
        await upload.mutateAsync({ entryId: id, file: p.file, label: p.label })
        setPending((list) => list.filter((x) => x.key !== p.key))
      } catch (err) {
        setPhotoFailure(uploadError(err))
        return
      }
    }
    onDone()
  }

  const busy = save.isPending || upload.isPending

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 rounded-xl bg-surface-container p-space-md shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <Icon name="edit_document" size={18} />
        </span>
        <h3 className="text-title-md text-on-surface">{entry ? 'Edycja zgłoszenia' : 'Nowe zgłoszenie'}</h3>
      </div>
      {renderAi?.(onExtracted, { autoReceipt })}
      {photoFailure && savedId && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg bg-error-container p-space-sm text-body-md text-on-error-container">
          <p className="font-medium">Nie udało się dodać zdjęcia</p>
          <p>{photoFailure}</p>
          <p>Zgłoszenie zostało zapisane.</p>
          <Button variant="secondary" icon="cloud_upload" disabled={busy} onClick={() => void uploadPending(savedId)}>
            Spróbuj ponownie
          </Button>
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="text-body-md text-error">
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Numer paragonu">
          <input className={`${tokenInputClass} font-mono`} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
        </Field>
        <Field label="Kwota zakupu">
          <input
            className={`${tokenInputClass} font-mono`}
            inputMode="decimal"
            placeholder="0,00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <Field label="Data zgłoszenia">
          <input className={`${tokenInputClass} font-mono`} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Sklep">
          <input className={tokenInputClass} value={store} onChange={(e) => setStore(e.target.value)} />
        </Field>
      </div>
      <Field label="E-mail lub telefon użyty w zgłoszeniu">
        <input className={tokenInputClass} value={contactUsed} onChange={(e) => setContactUsed(e.target.value)} />
      </Field>
      <div className="flex items-end gap-1">
        <div className="min-w-0 flex-1">
          <Field label="Kod potwierdzenia">
            <input
              className={`${tokenInputClass} font-mono tracking-wider`}
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
            />
          </Field>
        </div>
        <IconButton icon="content_copy" label="Kopiuj kod" disabled={confirmationCode === ''} onClick={copyCode} />
      </div>
      {contestType === 'Creative' && (
        <Field label="Treść odpowiedzi">
          <textarea className={`${tokenInputClass} py-2`} rows={4} value={answerText} onChange={(e) => setAnswerText(e.target.value)} />
        </Field>
      )}
      <div className="flex flex-col gap-2">
        <span className="text-label-md text-on-surface-variant">Zdjęcia</span>
        {entry && entry.photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {entry.photos.map((p) => (
              <PhotoTile key={p.id} photo={p} />
            ))}
          </div>
        )}
        {pending.length > 0 && (
          <ul className="flex flex-col gap-2">
            {pending.map((p) => (
              <li key={p.key} className="flex items-center gap-2 rounded-lg bg-surface-container-low p-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-md text-on-surface">{p.file.name}</p>
                  <p className="font-mono text-label-xs text-on-surface-variant">{formatBytes(p.file.size)}</p>
                </div>
                <select
                  aria-label={`Podpis zdjęcia ${p.file.name}`}
                  className="min-h-11 rounded-lg bg-surface-container-highest px-2 text-body-md text-on-surface"
                  value={p.label}
                  onChange={(e) =>
                    setPending((list) => list.map((x) => (x.key === p.key ? { ...x, label: e.target.value as PhotoLabel } : x)))
                  }
                >
                  {LABELS.map((l) => (
                    <option key={l} value={l}>
                      {photoLabel[l]}
                    </option>
                  ))}
                </select>
                <IconButton
                  icon="close"
                  label={`Usuń ${p.file.name}`}
                  onClick={() => setPending((list) => list.filter((x) => x.key !== p.key))}
                />
              </li>
            ))}
          </ul>
        )}
        <input ref={fileRef} type="file" accept={PHOTO_ACCEPT} aria-label="Dodaj zdjęcie" className="sr-only" onChange={onPick} />
        <Button variant="secondary" icon="photo_camera" onClick={() => fileRef.current?.click()}>
          Dodaj zdjęcie
        </Button>
      </div>
      <div className="flex gap-2 pt-1">
        <Button type="submit" variant="success" icon="cloud_upload" disabled={busy} className="flex-1">
          {busy ? 'Zapisywanie…' : 'Zapisz zgłoszenie'}
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}
