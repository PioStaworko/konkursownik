import type { FormEvent, ReactNode } from 'react'
import { Button } from '../ui/Button'

interface Props {
  title: string
  error: string | null
  submitLabel: string
  busy: boolean
  onSubmit: () => void
  children: ReactNode
  footer: ReactNode
}

export default function AuthForm({ title, error, submitLabel, busy, onSubmit, children, footer }: Props) {
  const handle = (e: FormEvent) => {
    e.preventDefault()
    onSubmit()
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface p-margin-mobile text-on-surface">
      <div className="w-full max-w-sm rounded-xl bg-surface-container-low p-space-lg shadow-lg">
        <h1 className="mb-1 text-headline-lg">Konkursownik</h1>
        <h2 className="mb-space-lg text-body-lg text-on-surface-variant">{title}</h2>
        <form onSubmit={handle} className="flex flex-col gap-space-md">
          {children}
          {error && (
            <p role="alert" className="rounded-lg bg-error-container p-space-sm text-body-md text-on-error-container">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy} className="w-full">
            {submitLabel}
          </Button>
        </form>
        <p className="mt-space-lg text-center text-body-md text-on-surface-variant">{footer}</p>
      </div>
    </div>
  )
}
