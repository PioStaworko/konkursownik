import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Icon } from '../ui/Icon'

export default function ProfileMenu() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      triggerRef.current?.focus()
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const itemClass =
    'flex min-h-11 w-full items-center rounded-lg px-space-sm text-left text-body-md text-on-surface hover:bg-surface-container-highest'

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Profil"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary">
          <Icon name="person" size={18} />
        </span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-space-xs w-64 rounded-xl bg-surface-container-high p-space-sm shadow-lg">
          {user && <p className="break-all px-space-sm py-space-sm text-label-md text-on-surface-variant">{user.email}</p>}
          <Link to="/zaproszenia" onClick={() => setOpen(false)} className={itemClass}>
            Zaproszenia
          </Link>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false)
              void logout().then(() => navigate('/login'))
            }}
          >
            Wyloguj
          </button>
        </div>
      )}
    </div>
  )
}
