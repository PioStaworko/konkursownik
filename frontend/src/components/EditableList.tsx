import type { ReactNode } from 'react'
import { Button, IconButton } from '../ui/Button'
import { Section } from '../ui/Section'
import type { IconName } from '../ui/icons'

interface Props<T> {
  title: string
  icon: IconName
  addLabel: string
  items: T[]
  onChange: (items: T[]) => void
  newItem: () => T
  renderItem: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode
  error?: string
  /** Shown next to the section (e.g. the "AI — sprawdź" badge). */
  badge?: ReactNode
}

export default function EditableList<T>({ title, icon, addLabel, items, onChange, newItem, renderItem, error, badge }: Props<T>) {
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
    <Section icon={icon} title={title}>
      {badge && <div className="flex">{badge}</div>}
      {error && (
        <p role="alert" className="text-label-md text-error">
          {error}
        </p>
      )}
      <ul className="flex flex-col gap-space-sm">
        {items.map((item, i) => (
          <li key={i} className="flex flex-col gap-space-sm rounded-xl bg-surface-container p-space-sm shadow-sm">
            {renderItem(item, i, (patch) => update(i, patch))}
            <div className="flex justify-end">
              <IconButton icon="expand_less" label={`Przesuń w górę ${i + 1}`} disabled={i === 0} onClick={() => moveUp(i)} />
              <IconButton icon="delete" label={`Usuń ${i + 1}`} onClick={() => remove(i)} />
            </div>
          </li>
        ))}
      </ul>
      <Button variant="secondary" icon="add" onClick={() => onChange([...items, newItem()])}>
        {addLabel}
      </Button>
    </Section>
  )
}
