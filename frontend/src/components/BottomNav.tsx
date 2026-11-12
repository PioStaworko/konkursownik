import { NavLink } from 'react-router'
import { useReminders } from '../api/hooks'

const items = [
  { to: '/', label: 'Pilne', end: true },
  { to: '/konkursy', label: 'Konkursy', end: false },
  { to: '/zakupy', label: 'Zakupy', end: false },
  { to: '/wiecej', label: 'Więcej', end: false },
]

export default function BottomNav() {
  const reminderCount = useReminders().data?.length ?? 0
  return (
    <nav
      aria-label="Nawigacja główna"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex min-h-14 items-center justify-center text-sm font-medium ${
                  isActive ? 'text-indigo-600' : 'text-slate-500'
                }`
              }
            >
              {item.label}
              {item.to === '/' && reminderCount > 0 && (
                <span
                  aria-label={`${reminderCount} pilnych`}
                  className="ml-1 rounded-full bg-red-600 px-1.5 text-xs font-semibold text-white"
                >
                  {reminderCount}
                </span>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
