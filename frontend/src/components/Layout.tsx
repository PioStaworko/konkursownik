import { Outlet } from 'react-router'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-dvh bg-slate-50 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <main className="mx-auto max-w-xl p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
