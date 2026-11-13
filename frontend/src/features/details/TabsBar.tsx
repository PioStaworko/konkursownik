import { useEffect, useRef } from 'react'
import { Icon } from '../../ui/Icon'
import type { IconName } from '../../ui/icons'

export type TabDef<K extends string> = { key: K; label: string; icon: IconName }

type Props<K extends string> = { tabs: TabDef<K>[]; active: K; onChange: (key: K) => void }

export default function TabsBar<K extends string>({ tabs, active, onChange }: Props<K>) {
  const listRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  // Horizontal-only: never scroll the page itself.
  useEffect(() => {
    const list = listRef.current
    const tab = activeRef.current
    if (!list || !tab) return
    const left = tab.offsetLeft
    const right = left + tab.offsetWidth
    if (left < list.scrollLeft) list.scrollLeft = left
    else if (right > list.scrollLeft + list.clientWidth) list.scrollLeft = right - list.clientWidth
  }, [active])
  return (
    <div ref={listRef} role="tablist" className="relative flex items-center gap-1.5 overflow-x-auto rounded-xl bg-surface-container-lowest p-1 [scrollbar-width:none]">
      {tabs.map((t) => {
        const on = t.key === active
        return (
          <button
            key={t.key}
            ref={on ? activeRef : undefined}
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
