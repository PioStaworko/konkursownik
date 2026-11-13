import { Icon } from '../../ui/Icon'
import type { IconName } from '../../ui/icons'

export type TabDef<K extends string> = { key: K; label: string; icon: IconName }

type Props<K extends string> = { tabs: TabDef<K>[]; active: K; onChange: (key: K) => void }

export default function TabsBar<K extends string>({ tabs, active, onChange }: Props<K>) {
  return (
    <div role="tablist" className="flex items-center gap-1.5 overflow-x-auto rounded-xl bg-surface-container-lowest p-1">
      {tabs.map((t) => {
        const on = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className={`flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg px-3 text-label-xs transition-colors ${
              on ? 'bg-primary-container font-semibold text-on-primary-container shadow-sm' : 'text-on-surface-variant'
            }`}
          >
            <Icon name={t.icon} size={14} />
            <span>{t.label}</span>
          </button>
        )
      })}
    </div>
  )
}
