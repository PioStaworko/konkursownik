import { Navigate, Outlet } from 'react-router'
import { useAuth } from './AuthProvider'

export default function RequireAdmin() {
  const { user, loading } = useAuth()
  if (loading) return <p className="p-6 text-center text-on-surface-variant">Ładowanie…</p>
  if (!user?.isAdmin) return <Navigate to="/" replace />
  return <Outlet />
}
