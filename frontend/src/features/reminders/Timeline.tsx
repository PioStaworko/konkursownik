import type { ReactNode } from 'react'
import type { Reminder } from '../../api/types'
import { formatDate, todayInPoland } from '../../lib/format'
import { Icon } from '../../ui/Icon'
import type { IconName } from '../../ui/icons'
import { DisposalCard, EndedCard, EndingCard, LaureateCard, ResultsCard } from './ReminderCards'
import { dueBadge, daysUntil, type ReminderGroup } from './groups'

type Meta = {
  icon: IconName
  title: string
  node: string
  tone: string
  card: (r: Reminder) => ReactNode
  badge: (first: Reminder, today: string) => string | null
}

const meta: Record<ReminderGroup, Meta> = {
  laureate: {
    icon: 'military_tech', title: 'Termin laureata', node: 'bg-error-container text-on-error', tone: 'text-error',
    card: (r) => <LaureateCard r={r} />, badge: (f, t) => dueBadge(daysUntil(f.dueDate, t)),
  },
  results: {
    icon: 'campaign', title: 'Publikacja wyników', node: 'bg-primary-container text-on-primary-container', tone: 'text-surface-tint',
    card: (r) => <ResultsCard r={r} />,
    badge: (f, t) => (f.dueDate === t ? `Dzisiaj, ${formatDate(f.dueDate).slice(0, 5)}` : formatDate(f.dueDate)),
  },
  ending: {
    icon: 'alarm', title: 'Kończy się', node: 'bg-tertiary-container text-on-tertiary', tone: 'text-tertiary',
    card: (r) => <EndingCard r={r} />, badge: (f, t) => dueBadge(daysUntil(f.dueDate, t)),
  },
  ended: {
    icon: 'history_toggle_off', title: 'Zakończony', node: 'bg-surface-container-highest text-on-surface-variant', tone: 'text-on-surface-variant',
    card: (r) => <EndedCard r={r} />, badge: () => null,
  },
  disposal: {
    icon: 'recycling', title: 'Do kosza', node: 'bg-secondary-container text-on-secondary', tone: 'text-secondary',
    card: (r) => <DisposalCard r={r} />, badge: () => null,
  },
}

type Props = { groups: Record<ReminderGroup, Reminder[]>; order: ReminderGroup[] }

export default function Timeline({ groups, order }: Props) {
  const today = todayInPoland()
  return (
    <div className="relative flex flex-col gap-space-lg">
      <div aria-hidden="true" className="absolute bottom-4 left-4 top-4 w-0.5 bg-surface-container-highest/60" />
      {order.filter((g) => groups[g].length > 0).map((g) => {
        const m = meta[g]
        const badge = m.badge(groups[g][0], today)
        return (
          <section key={g} aria-label={m.title} className="relative flex flex-col gap-space-sm pl-7">
            <div className="absolute -left-0.5 top-1.5 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full bg-surface">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full shadow-md ${m.node}`}>
                <Icon name={m.icon} size={16} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={`text-label-xs font-semibold uppercase tracking-wider ${m.tone}`}>{m.title}</span>
              {badge && (
                <span className={`rounded-full bg-surface-container-highest px-2 py-0.5 font-mono text-label-md font-semibold ${m.tone}`}>{badge}</span>
              )}
            </div>
            {groups[g].map((r) => (
              <div key={`${r.kind}-${r.contest.id}-${r.itemId ?? ''}`}>{m.card(r)}</div>
            ))}
          </section>
        )
      })}
    </div>
  )
}
