import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDuplicateContest, useSaveWin, useSetStatus } from '../../api/hooks'
import type { ContestCardDto } from '../../api/types'
import { asIcon } from '../../lib/contestIcons'
import { formatDate, formatEntryCounter, formatMoney, todayInPoland } from '../../lib/format'
import { Icon } from '../../ui/Icon'
import type { IconName } from '../../ui/icons'
import { IconButton } from '../../ui/Button'
import { StatusBadge } from '../../ui/StatusBadge'

function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
}

const daysLabel = (n: number) => (n === 1 ? '1 dzień' : `${n} dni`)

const shortDate = (d: string) => formatDate(d).slice(0, 5)

const actionClass =
  'flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-label-md font-semibold transition-colors disabled:opacity-60'

function Menu({ id, onDuplicate, pending }: { id: string; onDuplicate: () => void; pending: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative z-10">
      <IconButton
        ref={triggerRef}
        icon="more_vert"
        label="Więcej opcji"
        aria-expanded={open}
        aria-haspopup="menu"
        className="bg-surface-container"
        onClick={() => setOpen((o) => !o)}
      />
      {open && (
        <div role="menu" className="absolute bottom-full right-0 mb-1 w-40 rounded-lg bg-surface-container-highest p-1 shadow-lg">
          <Link
            role="menuitem"
            to={`/konkursy/${id}/edycja`}
            onClick={() => setOpen(false)}
            className="flex min-h-11 items-center rounded-md px-3 text-body-md text-on-surface hover:bg-surface-container-high"
          >
            Edytuj
          </Link>
          <button
            role="menuitem"
            type="button"
            disabled={pending}
            className="flex min-h-11 w-full items-center rounded-md px-3 text-left text-body-md text-on-surface hover:bg-surface-container-high disabled:opacity-60"
            onClick={() => {
              setOpen(false)
              onDuplicate()
            }}
          >
            Duplikuj
          </button>
        </div>
      )}
    </div>
  )
}

function Spec({ icon, label, children }: { icon: IconName; label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col rounded-lg bg-surface-container p-2">
      <span className="flex items-center gap-1 text-label-xs text-on-surface-variant">
        <Icon name={icon} size={13} className="text-outline" /> {label}
      </span>
      <span className="mt-0.5 truncate text-body-md font-semibold text-on-surface">{children}</span>
    </div>
  )
}

export default function ContestCard({ contest: c }: { contest: ContestCardDto }) {
  const setStatus = useSetStatus()
  const saveWin = useSaveWin(c.id)
  const duplicate = useDuplicateContest()
  const navigate = useNavigate()
  const today = todayInPoland()
  const status = c.effectiveStatus
  const won = status === 'Won'
  const left = daysUntil(c.endDate, today)
  const ending = status === 'Bought' && left >= 0 && left <= 3
  const prize = [c.prizeDescription, c.prizeValue != null && formatMoney(c.prizeValue)].filter(Boolean).join(' · ')
  const subtitle =
    status === 'AwaitingResults' && c.resultsDate ? `Wyniki: ${formatDate(c.resultsDate)}` : `do ${formatDate(c.endDate)}`
  const error = setStatus.isError || saveWin.isError || duplicate.isError
  const onDuplicate = () =>
    duplicate.mutate(c.id, { onSuccess: (id) => navigate(`/konkursy/${id}/edycja`) })

  return (
    <article className="relative flex flex-col gap-space-sm rounded-xl bg-surface-container-low p-space-md shadow-md transition-colors hover:bg-surface-container">
      {won && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
          <div className="absolute -right-10 -top-10 h-28 w-28 rounded-full bg-secondary/15 blur-2xl" />
        </div>
      )}
      <div className="flex items-start justify-between gap-space-sm">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
              won ? 'bg-secondary/20 text-secondary' : 'bg-surface-container-high text-tertiary'
            }`}
          >
            <Icon name={asIcon(c.icon)} size={22} fill={won} />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex flex-wrap items-center gap-1.5 font-mono text-label-xs">
              {c.organizer && (
                <span className={`uppercase tracking-wider ${won ? 'font-bold text-secondary' : 'text-outline'}`}>{c.organizer}</span>
              )}
              {subtitle && (
                <span className="text-on-surface-variant">
                  {c.organizer && <span className="mr-1.5 text-outline-variant">•</span>}
                  {subtitle}
                </span>
              )}
            </div>
            <h3 className="truncate text-headline-sm text-on-surface">
              <Link to={`/konkursy/${c.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
                {c.name}
              </Link>
            </h3>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {ending && (
        <div className="flex items-center justify-between gap-space-sm rounded-lg bg-tertiary-container/15 p-space-sm">
          <div className="flex min-w-0 items-center gap-2 text-body-md text-tertiary">
            <Icon name="warning" size={18} className="shrink-0" />
            <p className="truncate font-semibold">
              {left === 0 ? 'Kończy się dziś' : `Kończy się za ${daysLabel(left)} (${shortDate(c.endDate)})`}
            </p>
          </div>
          {c.entryLimitPerDay != null && (
            <span className="shrink-0 font-mono text-label-xs font-bold text-tertiary/90">
              Dziś: {c.entriesToday}/{c.entryLimitPerDay}
            </span>
          )}
        </div>
      )}

      {status === 'Planned' && c.firstOpenPurchase && (
        <div className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container p-space-sm">
          <div className="flex min-w-0 items-center gap-2">
            <Icon name="shopping_bag" size={18} className="shrink-0 text-primary" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body-md font-medium text-on-surface">
                {[c.firstOpenPurchase.quantity, c.firstOpenPurchase.product].filter(Boolean).join(' ')}
              </span>
              {c.firstOpenPurchase.store && <span className="text-label-xs text-outline">{c.firstOpenPurchase.store}</span>}
            </div>
          </div>
          <span className="shrink-0 rounded bg-surface-container-high px-2 py-0.5 font-mono text-label-xs text-on-surface-variant">
            {c.purchasesBought}/{c.purchasesTotal}
          </span>
        </div>
      )}

      {status === 'AwaitingResults' && (
        <div className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container-high p-space-sm">
          <div className="flex min-w-0 items-center gap-2 text-body-md text-on-surface">
            <Icon name="mark_email_unread" size={18} className="shrink-0 text-primary" />
            <p className="truncate">Czekam na wyniki</p>
          </div>
          <span className="shrink-0 rounded bg-secondary/10 px-2 py-0.5 font-mono text-label-xs font-bold text-secondary">
            {c.entryCount} zgł.
          </span>
        </div>
      )}

      {won && c.win && (
        <>
          <div className="flex items-center justify-between gap-space-sm rounded-lg bg-surface-container p-space-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Icon name="redeem" size={20} className="shrink-0 text-secondary" />
              <span className="truncate text-headline-sm font-semibold text-on-surface">{c.win.prizeWon}</span>
            </div>
            {c.win.prizeValue != null && (
              <span className="shrink-0 font-mono text-label-md font-bold text-secondary">{formatMoney(c.win.prizeValue)}</span>
            )}
          </div>
          {c.win.laureateDeadline && !c.win.laureateDataSent && (
            <div className="flex items-center gap-2 rounded-lg bg-error-container/25 p-space-sm text-body-md text-error">
              <Icon name="priority_high" size={18} className="shrink-0" />
              <span>Termin laureata: {formatDate(c.win.laureateDeadline)}</span>
            </div>
          )}
        </>
      )}

      {!won && (prize || status === 'Bought' || status === 'Submitted') && (
        <div className="grid grid-cols-2 gap-space-xs">
          {prize && (
            <Spec icon="military_tech" label="Nagroda">
              {prize}
            </Spec>
          )}
          {(status === 'Bought' || status === 'Submitted') && (
            <Spec icon="checklist" label="Zgłoszenia">
              <span className="font-mono">
                {formatEntryCounter(c.entryCount, c.entryLimitTotal, c.entriesToday, c.entryLimitPerDay)}
              </span>
            </Spec>
          )}
        </div>
      )}

      {c.firstProofLocation && (status === 'Bought' || status === 'AwaitingResults') && (
        <div className="flex items-center gap-2 rounded-lg bg-surface-container-high/60 px-2.5 py-1.5 font-mono text-label-xs text-on-surface-variant">
          <Icon name="folder_open" size={15} className="shrink-0 text-primary" />
          <span className="truncate">
            Dowód: <span className="text-on-surface">{c.firstProofLocation}</span>
          </span>
        </div>
      )}

      <div className="relative z-10 flex items-center gap-space-xs pt-1">
        {status === 'Bought' && (
          <Link to={`/konkursy/${c.id}?zgloszenie=1`} className={`${actionClass} bg-primary text-on-primary`}>
            <Icon name="receipt_long" size={18} />+ Zgłoś paragon
          </Link>
        )}
        {status === 'Bought' && (
          <IconButton
            icon="content_copy"
            label="Duplikuj"
            disabled={duplicate.isPending}
            className="shrink-0 bg-surface-container disabled:opacity-60"
            onClick={onDuplicate}
          />
        )}
        {status === 'Planned' && (
          <button
            type="button"
            disabled={setStatus.isPending}
            onClick={() => setStatus.mutate({ id: c.id, status: 'Bought' })}
            className={`${actionClass} bg-surface-container-high text-secondary hover:bg-surface-bright`}
          >
            <Icon name="check_circle" size={18} />
            Oznacz jako kupione
          </button>
        )}
        {won && c.win && !c.win.laureateDataSent && (
          <button
            type="button"
            disabled={saveWin.isPending}
            onClick={() =>
              saveWin.mutate({
                prizeWon: c.win!.prizeWon,
                prizeValue: c.win!.prizeValue,
                laureateDeadline: c.win!.laureateDeadline,
                laureateDataSent: true,
              })
            }
            className={`${actionClass} bg-secondary text-on-secondary`}
          >
            <Icon name="mail" size={18} />
            Oznacz dane jako wysłane
          </button>
        )}
        <div className="ml-auto">
          <Menu id={c.id} onDuplicate={onDuplicate} pending={duplicate.isPending} />
        </div>
      </div>
      {error && (
        <p role="alert" className="text-label-md text-error">
          Operacja nie powiodła się. Spróbuj ponownie.
        </p>
      )}
    </article>
  )
}
