import { useToggleItem, type ItemKind } from '../../api/hooks'
import { CheckButton } from '../../ui/CheckButton'
import { Card } from '../../ui/Card'

export interface ChecklistItem {
  id: string | null
  label: string
  detail?: string | null
  checked: boolean
}

type Props = { kind: ItemKind; items: ChecklistItem[]; empty: string }

export default function ChecklistTab({ kind, items, empty }: Props) {
  const toggle = useToggleItem(kind)
  if (items.length === 0) return <p className="py-6 text-center text-on-surface-variant">{empty}</p>
  return (
    <Card tone="default" className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {items.map((item) => (
          <li key={item.id ?? item.label} className="flex items-start gap-1">
            <CheckButton
              checked={item.checked}
              label={item.label}
              onChange={(value) => item.id && !toggle.isPending && toggle.mutate({ id: item.id, value })}
            />
            <span className="flex min-w-0 flex-col py-2.5">
              <span className={`text-body-md ${item.checked ? 'text-outline line-through' : 'text-on-surface'}`}>{item.label}</span>
              {item.detail && <span className="text-label-md text-on-surface-variant">{item.detail}</span>}
            </span>
          </li>
        ))}
      </ul>
      {toggle.isError && (
        <p role="alert" className="text-label-md text-error">
          Nie udało się zapisać zmiany.
        </p>
      )}
    </Card>
  )
}
