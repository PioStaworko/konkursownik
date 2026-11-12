import { Outlet } from 'react-router'
import BottomNav from './BottomNav'

export default function Layout() {
  return (
    <div className="min-h-dvh bg-slate-50 pb-20">
      <main className="mx-auto max-w-xl p-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
