import { useLocation, useNavigate } from 'react-router'
import { IconButton } from '../ui/Button'
import { useTheme } from '../ui/theme'
import ProfileMenu from './ProfileMenu'

type Props = { title?: string; back?: boolean }

export default function AppHeader({ title, back = false }: Props) {
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <header className="fixed top-0 z-40 w-full bg-surface/85 pt-[env(safe-area-inset-top)] shadow-[0_1px_8px_rgba(0,0,0,0.4)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-margin-mobile">
        <div className="flex min-w-0 items-center gap-space-sm">
          {back ? (
            <>
              <IconButton icon="arrow_back" label="Wróć" onClick={goBack} />
              {title && <span className="truncate text-headline-sm text-on-surface">{title}</span>}
            </>
          ) : (
            <div className="flex items-center gap-space-xs">
              <span className="text-headline-sm leading-none tracking-tight text-on-surface">Konkursownik</span>
              {title && (
                <span className="ml-1.5 hidden text-label-xs uppercase tracking-wider text-on-surface-variant/70 sm:inline-block">
                  · {title}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-space-xs sm:gap-space-sm">
          <IconButton icon={theme === 'dark' ? 'dark_mode' : 'light_mode'} label="Zmień motyw" onClick={toggle} />
          <ProfileMenu />
        </div>
      </div>
    </header>
  )
}
