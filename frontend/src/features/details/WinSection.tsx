import { useState, type FormEvent } from 'react'
import { ApiError } from '../../api/client'
import { useDeleteWin, useSaveWin, useToggleItem } from '../../api/hooks'
import type { PrizeDto, WinDto, WinStepDto } from '../../api/types'
import { formatDate, formatMoney, parseAmount } from '../../lib/format'
import { tokenInputClass } from '../../lib/styles'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { CheckButton } from '../../ui/CheckButton'
import { Field } from '../../ui/Field'
import { Section } from '../../ui/Section'

const amountText = (n: number | null | undefined) => (n == null ? '' : String(n).replace('.', ','))

const OTHER = ''

function WinEditor({
  contestId, win, prizes, onDone,
}: { contestId: string; win: WinDto | null; prizes: PrizeDto[]; onDone: () => void }) {
  const save = useSaveWin(contestId)
  const remove = useDeleteWin(contestId)
  const options = prizes.filter((p) => p.id)
  const [prizeId, setPrizeId] = useState<string | null>(
    options.some((p) => p.id === win?.prizeId) ? (win?.prizeId ?? null) : null,
  )
  const [prizeWon, setPrizeWon] = useState(win?.prizeWon ?? '')
  const [prizeValue, setPrizeValue] = useState(amountText(win?.prizeValue))
  const [deadline, setDeadline] = useState(win?.laureateDeadline ?? '')
  const [dataSent, setDataSent] = useState(win?.laureateDataSent ?? false)
  const [steps, setSteps] = useState<WinStepDto[]>(win?.steps ?? [])
  const [newStep, setNewStep] = useState('')
  const [errors, setErrors] = useState<string[]>([])

  const fail = (err: unknown) =>
    setErrors(
      err instanceof ApiError && err.status === 400 && err.errors
        ? Object.values(err.errors).flat()
        : ['Nie udało się zapisać wygranej. Spróbuj ponownie.'],
    )

  const pickPrize = (id: string) => {
    const prize = options.find((p) => p.id === id)
    if (!prize) return setPrizeId(null)
    setPrizeId(prize.id)
    setPrizeWon(prize.name)
    setPrizeValue(amountText(prize.value))
  }

  const addStep = () => {
    const text = newStep.trim()
    if (text) setSteps((s) => [...s, { id: null, text, done: false }])
    setNewStep('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const value = parseAmount(prizeValue)
    const found: string[] = []
    if (prizeWon.trim() === '') found.push('Podaj, co zostało wygrane')
    if (value !== null && Number.isNaN(value)) found.push('Nieprawidłowa kwota')
    else if (value !== null && value < 0) found.push('Wartość nagrody nie może być ujemna')
    setErrors(found)
    if (found.length > 0) return
    const pendingStep = newStep.trim()
    const all = pendingStep ? [...steps, { id: null, text: pendingStep, done: false }] : steps
    try {
      await save.mutateAsync({
        prizeWon: prizeWon.trim(),
        prizeValue: value,
        prizeId,
        laureateDeadline: deadline || null,
        laureateDataSent: dataSent,
        steps: all.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.text !== ''),
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
    <form onSubmit={submit} noValidate className="flex flex-col gap-3 rounded-xl bg-surface-container p-space-md shadow-md">
      {errors.length > 0 && (
        <div role="alert" className="text-body-md text-error">
          {errors.map((m) => (
            <p key={m}>{m}</p>
          ))}
        </div>
      )}
      {options.length > 0 && (
        <Field label="Nagroda">
          <select className={tokenInputClass} value={prizeId ?? OTHER} onChange={(e) => pickPrize(e.target.value)}>
            {options.map((p) => (
              <option key={p.id} value={p.id!}>
                {p.value != null ? `${p.name} (${formatMoney(p.value)})` : p.name}
              </option>
            ))}
            <option value={OTHER}>Inna</option>
          </select>
        </Field>
      )}
      <Field label="Wygrana nagroda">
        <input className={tokenInputClass} value={prizeWon} onChange={(e) => setPrizeWon(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Wartość nagrody">
          <input className={`${tokenInputClass} font-mono`} inputMode="decimal" value={prizeValue} onChange={(e) => setPrizeValue(e.target.value)} />
        </Field>
        <Field label="Termin podania danych">
          <input className={`${tokenInputClass} font-mono`} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
        </Field>
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-label-md text-on-surface-variant">Kroki laureata</span>
        {steps.map((s, i) => (
          <div key={s.id ?? `new-${i}`} className="flex items-end gap-1">
            <Field label="Krok">
              <input
                className={tokenInputClass}
                value={s.text}
                onChange={(e) => setSteps((list) => list.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              />
            </Field>
            <IconButton icon="close" label={`Usuń krok laureata ${i + 1}`} onClick={() => setSteps((list) => list.filter((_, j) => j !== i))} />
          </div>
        ))}
        <div className="flex items-end gap-1">
          <Field label="Nowy krok">
            <input
              className={tokenInputClass}
              placeholder="np. Wyślij oświadczenie"
              value={newStep}
              onChange={(e) => setNewStep(e.target.value)}
            />
          </Field>
          <IconButton icon="add" label="Dodaj krok laureata" onClick={addStep} />
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-body-md text-on-surface">
        <input type="checkbox" className="h-6 w-6 accent-secondary" checked={dataSent} onChange={(e) => setDataSent(e.target.checked)} />
        Dane wysłane
      </label>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="success" disabled={save.isPending} className="flex-1">
          Zapisz wygraną
        </Button>
        {win && (
          <Button variant="secondary" disabled={remove.isPending} onClick={clear}>
            Usuń wygraną
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Anuluj
        </Button>
      </div>
    </form>
  )
}

export default function WinSection({ contestId, win, prizes = [] }: { contestId: string; win: WinDto | null; prizes?: PrizeDto[] }) {
  const [editing, setEditing] = useState(false)
  const toggle = useToggleItem('win-steps')

  if (editing) return <WinEditor contestId={contestId} win={win} prizes={prizes} onDone={() => setEditing(false)} />
  if (!win) {
    return (
      <Button variant="secondary" icon="emoji_events" onClick={() => setEditing(true)}>
        Dodaj wygraną
      </Button>
    )
  }
  return (
    <Section icon="emoji_events" title="Wygrana">
      <Card tone="default" className="flex flex-col gap-2 ring-1 ring-secondary/40">
        <p className="text-title-md font-semibold text-on-surface">{win.prizeWon}</p>
        {win.prizeValue != null && <p className="font-mono text-mono-data text-on-surface-variant">{formatMoney(win.prizeValue)}</p>}
        {win.laureateDeadline && (
          <p className="text-label-md text-on-surface-variant">Dane laureata do {formatDate(win.laureateDeadline)}</p>
        )}
        <p className={`text-label-md ${win.laureateDataSent ? 'text-secondary' : 'text-on-surface-variant'}`}>
          {win.laureateDataSent ? 'Dane wysłane' : 'Dane jeszcze niewysłane'}
        </p>
        {win.steps.length > 0 && (
          <ul className="flex flex-col">
            {win.steps.map((s) => (
              <li key={s.id ?? s.text} className="flex items-center gap-1">
                <CheckButton
                  checked={s.done}
                  label={s.text}
                  onChange={(value) => s.id && !toggle.isPending && toggle.mutate({ id: s.id, value })}
                />
                <span className={`text-body-md ${s.done ? 'text-outline line-through' : 'text-on-surface'}`}>{s.text}</span>
              </li>
            ))}
          </ul>
        )}
        {toggle.isError && (
          <p role="alert" className="text-label-md text-error">
            Nie udało się zapisać zmiany.
          </p>
        )}
        <Button variant="secondary" onClick={() => setEditing(true)}>
          Edytuj wygraną
        </Button>
      </Card>
    </Section>
  )
}
