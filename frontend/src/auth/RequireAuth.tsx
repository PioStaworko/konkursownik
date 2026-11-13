import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './AuthProvider'

export default function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <p className="p-6 text-center text-on-surface-variant">Ładowanie…</p>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
