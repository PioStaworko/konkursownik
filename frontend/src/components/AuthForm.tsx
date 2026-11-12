import type { FormEvent, ReactNode } from 'react'

export const inputClass =
  'mt-1 block w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-base focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200'

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
    <div className="min-h-dvh bg-slate-50 p-4">
      <div className="mx-auto mt-10 max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <h1 className="mb-1 text-2xl font-semibold text-slate-900">Konkursownik</h1>
        <h2 className="mb-5 text-slate-500">{title}</h2>
        <form onSubmit={handle} className="space-y-4">
          {children}
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-lg bg-indigo-600 font-medium text-white disabled:opacity-60"
          >
            {submitLabel}
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-500">{footer}</p>
      </div>
    </div>
  )
}
