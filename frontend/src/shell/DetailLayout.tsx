import { Outlet, useLocation } from 'react-router'
import AppHeader from './AppHeader'

const titles: Record<string, string> = {
  '/konkursy/nowy': 'Nowy konkurs',
  '/zaproszenia': 'Zaproszenia',
  '/dowody': 'Schowek dowodów',
}

export default function DetailLayout() {
  const { pathname } = useLocation()
  const title = titles[pathname] ?? (pathname.endsWith('/edycja') ? 'Edycja konkursu' : 'Konkurs')
  return (
    <div className="min-h-dvh bg-surface text-on-surface">
      <AppHeader back title={title} />
      <main className="mx-auto w-full max-w-[640px] px-margin-mobile pt-[calc(4rem+env(safe-area-inset-top)+0.875rem)] pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}
