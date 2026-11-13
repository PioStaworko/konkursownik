import type { ContestDto } from '../../api/types'
import { asIcon } from '../../lib/contestIcons'
import { formatDate, formatMoney, pluralPl, safeHttpUrl, todayInPoland } from '../../lib/format'
import { Icon } from '../../ui/Icon'
import type { IconName } from '../../ui/icons'

const daysUntil = (date: string, today: string) =>
  Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)

function endingBadge(endDate: string): string | null {
  const days = daysUntil(endDate, todayInPoland())
  if (days < 0 || days > 3) return null
  return days === 0 ? 'Kończy się dziś' : `Koniec za ${days} ${pluralPl(days, 'dzień', 'dni', 'dni')}`
}

function ExternalLink({ label, href, icon }: { label: string; href: string | null; icon: IconName }) {
  const safe = safeHttpUrl(href)
  if (!safe) return null
  return (
    <a
      href={safe}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-6 items-center gap-1 text-label-xs text-primary hover:underline"
    >
      <Icon name={icon} size={14} />
      <span>{label}</span>
    </a>
  )
}

function Counter({ label, count, limit, icon, tone }: { label: string; count: number; limit: number | null; icon: IconName; tone: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-container p-2">
      <div className="flex flex-col">
        <span className="text-label-xs text-on-surface-variant">{label}</span>
        <span className={`font-mono text-body-md font-semibold ${tone}`}>
          {count}
          {limit != null && <span className="text-outline"> / {limit}</span>}
        </span>
      </div>
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-high ${tone}`}>
        <Icon name={icon} size={18} />
      </span>
    </div>
  )
}

export default function DetailsHeaderCard({ c }: { c: ContestDto }) {
  const badge = endingBadge(c.endDate)
  const first = c.prizes[0]
  const prizeName = first ? [first.name, first.count != null && `(${first.count} szt.)`].filter(Boolean).join(' ') : ''
  const prize = [prizeName, first?.value != null && formatMoney(first.value)].filter(Boolean).join(' · ')
  return (
    <div className="overflow-hidden rounded-xl bg-surface-container p-space-md shadow-md">
      <div className="flex items-start gap-3.5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-surface-container-highest text-primary shadow-sm">
          <Icon name={asIcon(c.icon)} size={32} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="break-words text-headline-sm text-on-surface">{c.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <ExternalLink label="Strona" href={c.url} icon="open_in_new" />
            <ExternalLink label="Regulamin" href={c.rulesUrl} icon="description" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-2.5 rounded-lg bg-surface-container-low p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Icon name="alarm" size={16} className="text-tertiary" />
            <span className="font-mono text-mono-data text-on-surface">
              {formatDate(c.startDate)} – {formatDate(c.endDate)}
            </span>
          </div>
          {badge && <span className="rounded-full bg-error-container px-2 py-0.5 text-label-xs text-error">{badge}</span>}
        </div>
        {(c.resultsDate || prize) && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 text-label-xs text-on-surface-variant">
            {c.resultsDate && (
              <span>
                Ogłoszenie wyników: <span className="font-mono text-mono-data text-on-surface">{formatDate(c.resultsDate)}</span>
              </span>
            )}
            {prize && <span className="text-tertiary">Nagroda: {prize}</span>}
          </div>
        )}
        <div className="mt-1 grid grid-cols-2 gap-2">
          <Counter label="Limit zgłoszeń" count={c.entries.length} limit={c.entryLimitTotal} icon="receipt_long" tone="text-primary" />
          {c.entryLimitPerDay != null && (
            <Counter label="Limit na dziś" count={c.entriesToday} limit={c.entryLimitPerDay} icon="today" tone="text-secondary" />
          )}
        </div>
      </div>
    </div>
  )
}
