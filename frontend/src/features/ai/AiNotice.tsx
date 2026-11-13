import { useRef, useState, type ReactNode } from 'react'
import { BottomSheet } from '../../ui/BottomSheet'
import { Button } from '../../ui/Button'

const KEY = 'konkursownik-ai-notice'

function accepted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function remember() {
  try {
    localStorage.setItem(KEY, '1')
  } catch {
    // storage unavailable: the notice simply shows next time too
  }
}

/** `gate(action)` runs `action` right away once the notice was accepted, otherwise after "Rozumiem". */
export function useAiNotice(): { gate: (action: () => void) => void; notice: ReactNode } {
  const [open, setOpen] = useState(false)
  const pending = useRef<(() => void) | null>(null)

  const gate = (action: () => void) => {
    if (accepted()) {
      action()
      return
    }
    pending.current = action
    setOpen(true)
  }

  const accept = () => {
    remember()
    setOpen(false)
    const action = pending.current
    pending.current = null
    action?.()
  }

  const notice = (
    <BottomSheet open={open} onClose={() => { pending.current = null; setOpen(false) }} title="Odczyt przez AI">
      <div className="flex flex-col gap-space-md">
        <p className="text-body-md text-on-surface-variant">
          Zdjęcie lub plik zostanie wysłany do Google Gemini w celu odczytania danych.
        </p>
        <Button onClick={accept}>Rozumiem</Button>
      </div>
    </BottomSheet>
  )
  return { gate, notice }
}
