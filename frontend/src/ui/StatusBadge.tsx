import type { ContestStatus } from '../api/types'
import { statusLabel } from '../lib/labels'

const styles: Record<ContestStatus, { badge: string; dot: string }> = {
  Planned: { badge: 'bg-surface-container-high text-on-surface-variant', dot: 'bg-outline' },
  Bought: { badge: 'bg-secondary-container/20 text-secondary', dot: 'bg-secondary' },
  Submitted: { badge: 'bg-primary/15 text-primary', dot: 'bg-primary' },
  AwaitingResults: { badge: 'bg-primary/15 text-primary', dot: 'bg-primary' },
  Won: { badge: 'bg-secondary text-on-secondary', dot: 'bg-on-secondary' },
  Lost: { badge: 'bg-outline-variant/40 text-on-surface-variant', dot: 'bg-outline' },
  Archived: { badge: 'bg-outline-variant/40 text-on-surface-variant', dot: 'bg-outline' },
}

export function StatusBadge({ status }: { status: ContestStatus }) {
  const s = styles[status]
  return (
    <span className={`${s.badge} inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 font-mono text-label-xs`}>
      <span className={`${s.dot} h-1.5 w-1.5 rounded-full`} />
      {statusLabel[status]}
    </span>
  )
}
