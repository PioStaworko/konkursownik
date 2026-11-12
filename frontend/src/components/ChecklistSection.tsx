import { useToggleItem, type ItemKind } from '../api/hooks'

export interface ChecklistItem {
  id: string | null
  label: string
  detail?: string | null
  checked: boolean
}

interface Props {
  title: string
  kind: ItemKind
  items: ChecklistItem[]
}

export default function ChecklistSection({ title, kind, items }: Props) {
  const toggle = useToggleItem(kind)
  if (items.length === 0) return null
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id ?? item.label}>
            <label className="flex min-h-11 items-start gap-3 py-2">
              <input
                type="checkbox"
                className="mt-0.5 h-6 w-6 shrink-0"
                checked={item.checked}
                disabled={!item.id || toggle.isPending}
                onChange={(e) => item.id && toggle.mutate({ id: item.id, value: e.target.checked })}
              />
              <span className={item.checked ? 'text-slate-500 line-through' : 'text-slate-900'}>
                {item.label}
                {item.detail && <span className="block text-sm text-slate-500">{item.detail}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {toggle.isError && (
        <p role="alert" className="text-sm text-red-700">
          Nie udało się zapisać zmiany.
        </p>
      )}
    </section>
  )
}
