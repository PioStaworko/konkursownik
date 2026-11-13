import { useState, type FormEvent } from 'react'
import { ApiError } from '../api/client'
import { useDeleteWin, useSaveWin } from '../api/hooks'
import type { WinDto } from '../api/types'
import { parseAmount } from '../lib/format'
import { inputClass, labelClass, primaryButtonClass, secondaryButtonClass } from '../lib/styles'

interface Props {
  contestId: string
  win: WinDto | null
  onDone: () => void
}

export default function WinForm({ contestId, win, onDone }: Props) {
  const save = useSaveWin(contestId)
  const remove = useDeleteWin(contestId)
  const [prizeWon, setPrizeWon] = useState(win?.prizeWon ?? '')
  const [prizeValue, setPrizeValue] = useState(win?.prizeValue == null ? '' : String(win.prizeValue).replace('.', ','))
  const [deadline, setDeadline] = useState(win?.laureateDeadline ?? '')
  const [dataSent, setDataSent] = useState(win?.laureateDataSent ?? false)
  const [errors, setErrors] = useState<string[]>([])

  const fail = (err: unknown) =>
    setErrors(
      err instanceof ApiError && err.status === 400 && err.errors
        ? Object.values(err.errors).flat()
        : ['Nie udało się zapisać wygranej. Spróbuj ponownie.'],
    )

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = parseAmount(prizeValue)
    const found: string[] = []
    if (prizeWon.trim() === '') found.push('Podaj, co zostało wygrane')
    if (value !== null && Number.isNaN(value)) found.push('Nieprawidłowa kwota')
    else if (value !== null && value < 0) found.push('Wartość nagrody nie może być ujemna')
    setErrors(found)
    if (found.length > 0) return
    try {
      await save.mutateAsync({
        prizeWon: prizeWon.trim(),
        prizeValue: value,
        laureateDeadline: deadline || null,
        laureateDataSent: dataSent,
        steps: win?.steps ?? [],
      })
      onDone()
    } catch (err) {
      fail(err)
    }
  }

  const clear = async () => {
    if (!window.confirm('Usunąć informację o wygranej?')) return
    try {
      await remove.mutateAsync()
      onDone()
    } catch (err) {
      fail(err)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
      <h3 className="font-semibold text-slate-900">Wygrana</h3>
      {errors.length > 0 && (
        <div role="alert" className="text-sm text-red-700">
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      <label className={labelClass}>
        Wygrana nagroda
        <input className={inputClass} value={prizeWon} onChange={(e) => setPrizeWon(e.target.value)} />
      </label>
      <label className={labelClass}>
        Wartość nagrody
        <input
          className={inputClass}
          type="text"
          inputMode="decimal"
          value={prizeValue}
          onChange={(e) => setPrizeValue(e.target.value)}
        />
      </label>
      <label className={labelClass}>
        Termin podania danych laureata
        <input className={inputClass} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      </label>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          className="h-6 w-6"
          checked={dataSent}
          onChange={(e) => setDataSent(e.target.checked)}
        />
        Dane laureata wysłane
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={save.isPending} className={primaryButtonClass}>
          Zapisz wygraną
        </button>
        {win && (
          <button type="button" className={secondaryButtonClass} disabled={remove.isPending} onClick={clear}>
            Usuń wygraną
          </button>
        )}
        <button type="button" className={secondaryButtonClass} onClick={onDone}>
          Anuluj
        </button>
      </div>
    </form>
  )
}
