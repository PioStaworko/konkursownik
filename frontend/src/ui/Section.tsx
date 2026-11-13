import type { ReactNode } from 'react'
import { Icon } from './Icon'
import type { IconName } from './icons'

type Props = { icon: IconName; title: string; subtitle?: string; children?: ReactNode }

export function Section({ icon, title, subtitle, children }: Props) {
  return (
    <section className="flex flex-col gap-space-sm">
      <div className="flex items-center gap-space-sm">
        <Icon name={icon} size={20} className="text-primary" />
        <div className="min-w-0">
          <h2 className="text-headline-sm text-on-surface">{title}</h2>
          {subtitle && <p className="text-label-md text-on-surface-variant">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  )
}
