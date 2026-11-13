import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './icons'

type Props = {
  active: boolean
  count?: number
  icon?: IconName
  onClick?: () => void
  children: ReactNode
}

export function FilterPill({ active, count, icon, onClick, children }: Props) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className="flex min-h-11 items-center whitespace-nowrap">
      <span
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-label-md shadow-sm transition-colors ${
          active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
        }`}
      >
        {icon && <Icon name={icon} size={14} fill />}
        <span>{children}</span>
        {count !== undefined && (
          <span
            className={`rounded-full px-1.5 font-mono text-label-xs ${
              active ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {count}
          </span>
        )}
      </span>
    </button>
  )
}
