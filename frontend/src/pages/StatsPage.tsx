import { useStats } from '../api/hooks'
import { formatMoney } from '../lib/format'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/icons'

type TileProps = { label: string; value: string; icon: IconName; valueClass?: string; testId?: string }

function Tile({ label, value, icon, valueClass = 'text-on-surface', testId }: TileProps) {
  return (
    <div className="flex flex-col justify-between gap-space-sm rounded-xl bg-surface-container-low p-space-md shadow-sm">
      <div className="flex items-center justify-between text-on-surface-variant">
        <span className="text-label-xs uppercase tracking-wider">{label}</span>
        <Icon name={icon} size={16} className="text-primary" />
      </div>
      <span data-testid={testId} className={`font-mono text-headline-lg ${valueClass}`}>
        {value}
      </span>
    </div>
  )
}

export default function StatsPage() {
  const stats = useStats()
  const s = stats.data
  const balance = s ? (Math.round((s.totalWonValue - s.totalSpent) * 100) / 100 || 0) : 0

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="text-headline-lg">Statystyki</h1>
      {stats.isPending && <p className="text-on-surface-variant">Ładowanie…</p>}
      {stats.isError && <p role="alert" className="text-error">Nie udało się wczytać statystyk</p>}
      {s && (
        <div className="grid grid-cols-2 gap-space-sm">
          <Tile label="Konkursy" value={String(s.contests)} icon="emoji_events" />
          <Tile label="Zgłoszenia" value={String(s.entries)} icon="receipt_long" />
          <Tile label="Wygrane" value={String(s.wins)} icon="trophy" />
          <Tile label="Wydane" value={formatMoney(s.totalSpent)} icon="shopping_bag" />
          <Tile label="Wartość wygranych" value={formatMoney(s.totalWonValue)} icon="redeem" />
          <Tile
            label="Bilans"
            value={formatMoney(balance)}
            icon="account_balance_wallet"
            testId="balance"
            valueClass={balance >= 0 ? 'text-secondary' : 'text-error'}
          />
        </div>
      )}
    </div>
  )
}
