import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useSaveWin, useSetStatus, useToggleItem } from '../../api/hooks'
import type { ContestStatus, Reminder } from '../../api/types'
import { formatDate, formatMoney, safeHttpUrl } from '../../lib/format'
import { reminderText } from '../../lib/reminders'
import { Button, IconButton } from '../../ui/Button'
import { Card } from '../../ui/Card'
import { CheckButton } from '../../ui/CheckButton'
import { Icon } from '../../ui/Icon'

const linkClass = 'inline-flex min-h-11 items-center gap-1.5 text-body-md text-primary hover:underline'

function ContestTitle({ r }: { r: Reminder }) {
  return (
    <h3 className="truncate text-title-md font-semibold text-on-surface">
      <Link to={`/konkursy/${r.contest.id}`}>{r.contest.name}</Link>
    </h3>
  )
}

function ErrorLine({ show }: { show: boolean }) {
  return show ? <p role="alert" className="text-label-md text-error">Nie udało się zapisać zmiany</p> : null
}

function CopyChip({ code, index }: { code: string; index: number }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])
  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard unavailable; nothing to do
    }
  }
  return (
    <div className="flex items-center gap-1.5 rounded bg-surface-container-highest pl-2.5 font-mono text-label-md text-on-surface">
      <span className="text-label-xs text-on-surface-variant">#{index + 1}</span>
      <span className="font-semibold text-surface-tint">{code}</span>
      <IconButton icon={copied ? 'check' : 'content_copy'} label={`Kopiuj kod ${code}`} onClick={copy} />
      {copied && <span role="status" className="pr-2 text-label-xs text-secondary">Skopiowano</span>}
    </div>
  )
}

export function LaureateCard({ r }: { r: Reminder }) {
  const toggle = useToggleItem('win-steps')
  const saveWin = useSaveWin(r.contest.id)
  const win = r.contest.win
  const rules = safeHttpUrl(r.contest.rulesUrl)
  return (
    <Card tone="high" className="flex flex-col gap-space-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <span className="rounded-full bg-secondary-container/40 px-2 py-0.5 text-label-xs font-semibold text-secondary">WYGRANA</span>
          <div className="mt-1"><ContestTitle r={r} /></div>
        </div>
        {win && (
          <div className="shrink-0 text-right">
            {win.prizeValue != null && <span className="block text-headline-sm font-bold text-tertiary">{formatMoney(win.prizeValue)}</span>}
            <span className="text-label-xs text-on-surface-variant">{win.prizeWon}</span>
          </div>
        )}
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-lowest/80 p-3">
        <Icon name="hourglass_bottom" size={20} className="mt-0.5 text-tertiary" />
        <p className="text-body-md font-medium text-on-surface">{reminderText(r)}</p>
      </div>
      {r.winSteps.length > 0 && (
        <ul className="rounded-lg bg-surface-container p-2">
          {r.winSteps.map((s) => (
            <li key={s.id ?? s.text} className="flex items-center gap-1">
              <CheckButton
                checked={s.done}
                label={s.text}
                onChange={(value) => {
                  if (s.id) toggle.mutate({ id: s.id, value })
                }}
              />
              <span className={`text-body-md ${s.done ? 'text-on-surface-variant line-through' : 'text-on-surface'}`}>{s.text}</span>
            </li>
          ))}
        </ul>
      )}
      <ErrorLine show={toggle.isError || saveWin.isError} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {win && (
          <Button
            icon="task_alt"
            disabled={saveWin.isPending}
            onClick={() =>
              saveWin.mutate({
                prizeWon: win.prizeWon,
                prizeValue: win.prizeValue,
                laureateDeadline: win.laureateDeadline,
                laureateDataSent: true,
              })
            }
          >
            Oznacz jako dane wysłane
          </Button>
        )}
        {rules && (
          <a
            href={rules}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} justify-center rounded-lg bg-surface-container-highest text-on-surface no-underline`}
          >
            <Icon name="description" size={18} />
            Regulamin
          </a>
        )}
      </div>
    </Card>
  )
}

export function ResultsCard({ r }: { r: Reminder }) {
  const site = safeHttpUrl(r.contest.url)
  return (
    <Card tone="default" className="flex flex-col gap-space-sm">
      <ContestTitle r={r} />
      <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3">
        <Icon name="notification_important" size={20} className="mt-0.5 text-primary" />
        <p className="text-body-md text-on-surface">{reminderText(r)}</p>
      </div>
      {r.confirmationCodes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-label-xs font-semibold uppercase tracking-wider text-on-surface-variant">Twoje kody zgłoszeń:</span>
          <div className="flex flex-wrap gap-2">
            {r.confirmationCodes.map((c, i) => <CopyChip key={`${c}-${i}`} code={c} index={i} />)}
          </div>
        </div>
      )}
      {site && (
        <a href={site} target="_blank" rel="noopener noreferrer" className={linkClass}>
          Przejdź do strony konkursu
          <Icon name="open_in_new" size={16} />
        </a>
      )}
    </Card>
  )
}

export function EndingCard({ r }: { r: Reminder }) {
  const entry = `/konkursy/${r.contest.id}?zgloszenie=1`
  const stores = [...new Set(r.boughtPurchases.map((p) => p.store).filter(Boolean))].join(', ')
  return (
    <Card tone="default" className="flex flex-col gap-space-sm">
      <div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-tertiary/20 px-2 py-0.5 font-mono text-label-xs font-semibold text-tertiary">{formatDate(r.dueDate)}</span>
          {stores && <span className="text-label-xs text-on-surface-variant">{stores}</span>}
        </div>
        <div className="mt-1"><ContestTitle r={r} /></div>
      </div>
      <div className="flex items-start gap-2.5 rounded-lg bg-surface-container-low p-3">
        <Icon name="warning" size={20} className="mt-0.5 text-tertiary" />
        <div className="text-body-md text-on-surface">
          <p>{reminderText(r)}</p>
          {r.boughtPurchases.length > 0 && (
            <ul className="mt-1 text-on-surface-variant">
              {r.boughtPurchases.map((p, i) => (
                <li key={`${p.product}-${i}`}>Kupiono: {p.product}{p.quantity ? ` (${p.quantity})` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to={entry}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-label-md font-semibold text-on-primary hover:opacity-90"
        >
          <Icon name="add_circle" size={18} />
          Dodaj zgłoszenie
        </Link>
        <Link
          to={`${entry}&paragon=1`}
          aria-label="Zrób zdjęcie paragonu"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-surface-container-highest text-on-surface"
        >
          <Icon name="photo_camera" size={20} />
        </Link>
      </div>
    </Card>
  )
}

const quickStatuses: { status: ContestStatus; label: string }[] = [
  { status: 'Submitted', label: 'Zgłoszony' },
  { status: 'Lost', label: 'Przegrana' },
  { status: 'Archived', label: 'Archiwum' },
]

export function EndedCard({ r }: { r: Reminder }) {
  const setStatus = useSetStatus()
  return (
    <Card tone="low" className="flex flex-col gap-space-sm">
      <div>
        <span className="font-mono text-label-xs text-on-surface-variant">Zakończono: {formatDate(r.dueDate)}</span>
        <ContestTitle r={r} />
      </div>
      <p className="text-body-md text-on-surface-variant">{reminderText(r)}</p>
      <div className="flex flex-wrap gap-2">
        {quickStatuses.map((s) => (
          <Button
            key={s.status}
            variant="secondary"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: r.contest.id, status: s.status })}
          >
            {s.label}
          </Button>
        ))}
      </div>
      <ErrorLine show={setStatus.isError} />
    </Card>
  )
}

export function DisposalCard({ r }: { r: Reminder }) {
  const toggle = useToggleItem('proof-items')
  return (
    <Card tone="low" className="flex flex-col gap-space-sm">
      <ContestTitle r={r} />
      <p className="text-body-md text-on-surface-variant">{reminderText(r)}</p>
      {r.proofLocation && (
        <div className="flex items-center justify-between gap-2 rounded-lg bg-surface-container-high/60 px-3 py-2">
          <span className="flex items-center gap-2 text-label-md text-on-surface">
            <Icon name="inventory_2" size={18} className="text-secondary" />
            Gdzie leży:
          </span>
          <span className="font-mono text-label-md font-medium text-secondary">{r.proofLocation}</span>
        </div>
      )}
      {r.proofNote && <p className="text-label-md text-on-surface-variant">{r.proofNote}</p>}
      <ErrorLine show={toggle.isError} />
      {r.itemId && (
        <Button
          variant="secondary"
          icon="delete_sweep"
          disabled={toggle.isPending}
          onClick={() => toggle.mutate({ id: r.itemId!, value: true })}
        >
          Wyrzucono
        </Button>
      )}
    </Card>
  )
}
