import type { ReactNode } from 'react'
import { secondaryButtonClass } from '../lib/styles'

interface Props<T> {
  title: string
  addLabel: string
  items: T[]
  onChange: (items: T[]) => void
  newItem: () => T
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode
  error?: string
}

export default function EditableList<T>({ title, addLabel, items, onChange, newItem, renderItem, error }: Props<T>) {
  const update = (i: number, patch: Partial<T>) =>
    onChange(items.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const moveUp = (i: number) => {
    if (i === 0) return
    const next = [...items]
    ;[next[i - 1], next[i]] = [next[i], next[i - 1]]
    onChange(next)
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="space-y-2 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
            {renderItem(item, i, (patch) => update(i, patch))}
            <div className="flex gap-2">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={i === 0}
                aria-label={`Przesuń w górę ${i + 1}`}
                onClick={() => moveUp(i)}
              >
                W górę
              </button>
              <button
                type="button"
                className={secondaryButtonClass}
                aria-label={`Usuń ${i + 1}`}
                onClick={() => remove(i)}
              >
                Usuń
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className={secondaryButtonClass} onClick={() => onChange([...items, newItem()])}>
        {addLabel}
      </button>
    </section>
  )
}
