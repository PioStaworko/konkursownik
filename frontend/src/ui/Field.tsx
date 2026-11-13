import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from 'react'

type Props = { label: string; error?: string; hint?: ReactNode; children: ReactNode }

export function Field({ label, error, hint, children }: Props) {
  const id = useId()
  const errorId = `${id}-error`
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error ? errorId : undefined,
      })
    : children
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-label-md text-on-surface-variant">
          {label}
        </label>
        {hint}
      </div>
      {control}
      {error && (
        <p id={errorId} role="alert" className="text-label-md text-error">
          {error}
        </p>
      )}
    </div>
  )
}
