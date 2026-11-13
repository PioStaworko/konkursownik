import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useSaveEntry } from '../api/hooks'
import type { ContestType, EntryDto, EntryUpsertDto } from '../api/types'
import { parseAmount, todayInPoland } from '../lib/format'
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../lib/styles'

interface Props {
  contestId: string
  contestType: ContestType
  entry?: EntryDto
  onDone: () => void
}

const orNull = (s: string) => (s.trim() === '' ? null : s.trim())

export default function EntryForm({ contestId, contestType, entry, onDone }: Props) {
  const save = useSaveEntry(contestId)
  const [date, setDate] = useState(entry?.date ?? todayInPoland())
  const [confirmationCode, setConfirmationCode] = useState(entry?.confirmationCode ?? '')
  const [receiptNumber, setReceiptNumber] = useState(entry?.receiptNumber ?? '')
  const [amount, setAmount] = useState(entry?.purchaseAmount == null ? '' : String(entry.purchaseAmount).replace('.', ','))
  const [store, setStore] = useState(entry?.store ?? '')
  const [contactUsed, setContactUsed] = useState(entry?.contactUsed ?? '')
  const [answerText, setAnswerText] = useState(entry?.answerText ?? '')
  const [errors, setErrors] = useState<string[]>([])

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
    try {
      await save.mutateAsync({ id: entry?.id, dto })
      onDone()
    } catch (err) {
      setErrors(
        err instanceof ApiError && err.status === 400 && err.errors
          ? Object.values(err.errors).flat()
          : ['Nie udało się zapisać zgłoszenia. Spróbuj ponownie.'],
      )
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <h3 className="font-semibold text-slate-900">{entry ? 'Edycja zgłoszenia' : 'Nowe zgłoszenie'}</h3>
      {errors.length > 0 && (
        <div role="alert" className="text-sm text-red-700">
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      <label className={labelClass}>
        Data zgłoszenia
        <input className={inputClass} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label className={labelClass}>
        Kod potwierdzenia
        <input className={inputClass} value={confirmationCode} onChange={(e) => setConfirmationCode(e.target.value)} />
      </label>
      <label className={labelClass}>
        Numer paragonu
        <input className={inputClass} value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} />
      </label>
      <label className={labelClass}>
        Kwota zakupu
        <input
          className={inputClass}
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </label>
      <label className={labelClass}>
        Sklep
        <input className={inputClass} value={store} onChange={(e) => setStore(e.target.value)} />
      </label>
      <label className={labelClass}>
        Użyty kontakt
        <input className={inputClass} value={contactUsed} onChange={(e) => setContactUsed(e.target.value)} />
      </label>
      {contestType === 'Creative' && (
        <label className={labelClass}>
          Treść odpowiedzi
          <textarea
            className={`${inputClass} py-2`}
            rows={4}
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
          />
        </label>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={save.isPending} className={primaryButtonClass}>
          Zapisz zgłoszenie
        </button>
        <button type="button" className={secondaryButtonClass} onClick={onDone}>
          Anuluj
        </button>
      </div>
    </form>
  )
}
