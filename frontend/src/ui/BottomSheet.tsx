import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react'

type Props = { open: boolean; onClose: () => void; title: string; children?: ReactNode }

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function BottomSheet({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      previous?.focus?.()
    }
  }, [open])

  if (!open) return null

  const trap = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab' || !ref.current) return
    const items = Array.from(ref.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) {
      e.preventDefault()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const active = document.activeElement
    if (e.shiftKey && (active === first || active === ref.current)) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && active === last) {
      e.preventDefault()
      first.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div data-testid="sheet-backdrop" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={trap}
        className="relative max-h-[85dvh] w-full max-w-xl overflow-y-auto rounded-t-xl bg-surface-container p-space-lg pb-[max(1.25rem,env(safe-area-inset-bottom))] text-on-surface shadow-lg outline-none"
      >
        <h2 className="mb-space-md text-headline-sm">{title}</h2>
        {children}
      </div>
    </div>
  )
}
