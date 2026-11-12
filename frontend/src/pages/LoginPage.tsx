import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import AuthForm, { inputClass } from '../components/AuthForm'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Nieprawidłowy e-mail lub hasło'
          : 'Nie udało się zalogować. Spróbuj ponownie.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title="Zaloguj się"
      error={error}
      submitLabel="Zaloguj"
      busy={busy}
      onSubmit={submit}
      footer={
        <>
          Nie masz konta?{' '}
          <Link to="/register" className="font-medium text-indigo-600">
            Załóż konto
          </Link>
        </>
      }
    >
      <label className="block text-sm font-medium text-slate-700">
        E-mail
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </label>
      <label className="block text-sm font-medium text-slate-700">
        Hasło
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </label>
    </AuthForm>
  )
}
