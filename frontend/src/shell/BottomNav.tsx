import { useState } from 'react'
import { NavLink } from 'react-router'
import { useReminders, useShoppingList } from '../api/hooks'
import { Icon } from '../ui/Icon'
import type { IconName } from '../ui/icons'
import AddSheet from './AddSheet'

type ItemProps = {
  to: string
  end?: boolean
  icon: IconName
  label: string
  badge?: number
  badgeLabel?: string
  badgeClass?: string
}

function NavItem({ to, end, icon, label, badge, badgeLabel, badgeClass }: ItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `relative flex h-full min-w-11 flex-1 flex-col items-center justify-center transition-colors ${
          isActive ? 'font-bold text-primary' : 'text-on-surface-variant hover:text-on-surface'
        }`
      }
    >
      <span className="relative flex items-center justify-center">
        <Icon name={icon} size={22} />
        {badge ? (
          <span
            aria-label={badgeLabel}
            className={`absolute -right-2 -top-1 rounded-full px-1.5 font-mono text-[10px] font-bold leading-tight ${badgeClass}`}
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className="mt-1 text-label-xs">{label}</span>
    </NavLink>
  )
}

export default function BottomNav() {
  const [adding, setAdding] = useState(false)
  const reminderCount = useReminders().data?.length ?? 0
  const toBuy = useShoppingList().data?.reduce((n, g) => n + g.items.length, 0) ?? 0

  return (
    <>
      <nav
        aria-label="Nawigacja główna"
        className="fixed bottom-0 z-40 w-full bg-surface/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <div className="relative mx-auto flex h-16 max-w-md items-center justify-between px-margin-mobile md:max-w-xl">
          <NavItem to="/konkursy" icon="emoji_events" label="Konkursy" />
          <NavItem
            to="/"
            end
            icon="local_fire_department"
            label="Pilne"
            badge={reminderCount}
            badgeLabel={`${reminderCount} pilnych`}
            badgeClass="bg-tertiary text-on-tertiary"
          />
          <div className="flex flex-1 items-center justify-center">
            <button
              type="button"
              aria-label="Dodaj konkurs lub zgłoszenie"
              onClick={() => setAdding(true)}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-tr from-primary-container to-surface-tint text-on-primary shadow-[0_4px_12px_rgba(128,131,255,0.4)] transition-transform active:scale-95"
            >
              <Icon name="add" size={28} />
            </button>
          </div>
          <NavItem
            to="/zakupy"
            icon="shopping_cart"
            label="Zakupy"
            badge={toBuy}
            badgeLabel={`${toBuy} do kupienia`}
            badgeClass="bg-surface-container-highest text-on-surface"
          />
          <NavItem to="/statystyki" icon="account_balance_wallet" label="Statystyki" />
        </div>
      </nav>
      <AddSheet open={adding} onClose={() => setAdding(false)} />
    </>
  )
}
