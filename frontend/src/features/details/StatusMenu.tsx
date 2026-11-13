import { useEffect, useRef, useState } from 'react'
import { useSetStatus } from '../../api/hooks'
import type { ContestStatus } from '../../api/types'
import { statusLabel } from '../../lib/labels'
import { Icon } from '../../ui/Icon'
import { StatusBadge } from '../../ui/StatusBadge'

const ORDER: ContestStatus[] = ['Planned', 'Bought', 'Submitted', 'AwaitingResults', 'Won', 'Lost', 'Archived']

export default function StatusMenu({ contestId, status }: { contestId: string; status: ContestStatus }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const setStatus = useSetStatus()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${statusLabel[status]}`}
        disabled={setStatus.isPending}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 items-center gap-0.5 disabled:opacity-60"
      >
        <StatusBadge status={status} />
        <Icon name="expand_more" size={16} className="text-on-surface-variant" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-48 rounded-xl bg-surface-container-high p-1 shadow-xl">
          {ORDER.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === status}
              onClick={() => {
                setOpen(false)
                if (s !== status) setStatus.mutate({ id: contestId, status: s })
              }}
              className={`flex min-h-11 w-full items-center justify-between rounded-lg px-3 text-left text-label-md hover:bg-surface-variant ${
                s === status ? 'font-semibold text-primary' : 'text-on-surface-variant'
              }`}
            >
              <span>{statusLabel[s]}</span>
              {s === status && <Icon name="check" size={16} />}
            </button>
          ))}
        </div>
      )}
      {setStatus.isError && (
        <p role="alert" className="absolute right-0 mt-1 w-48 text-label-md text-error">
          Nie udało się zmienić statusu.
        </p>
      )}
    </div>
  )
}
