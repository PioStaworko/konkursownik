import { Outlet, useLocation } from 'react-router'
import AppHeader from './AppHeader'
import BottomNav from './BottomNav'

const titles: Record<string, string> = {
  '/': 'Pilne',
  '/konkursy': 'Konkursy',
  '/zakupy': 'Zakupy',
  '/statystyki': 'Statystyki',
}

export default function Layout() {
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <AppHeader title={titles[pathname]} />
      <main className="mx-auto w-full max-w-7xl px-margin-mobile pt-[calc(4rem+env(safe-area-inset-top)+0.875rem)] pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
