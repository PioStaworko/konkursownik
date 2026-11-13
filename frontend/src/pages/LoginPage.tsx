import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import AuthForm from '../components/AuthForm'
import { tokenInputClass } from '../lib/styles'
import { Field } from '../ui/Field'

export default function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const from = (location.state as { from?: string } | null)?.from ?? '/'
  if (user) return <Navigate to={from} replace />

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await login(userName, password)
      navigate(from, { replace: true })
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Nieprawidłowa nazwa użytkownika lub hasło'
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
          <Link to="/register" className="font-medium text-primary">
            Załóż konto
          </Link>
        </>
      }
    >
      <Field label="Nazwa użytkownika">
        <input type="text" required autoComplete="username" autoCapitalize="none" value={userName} onChange={(e) => setUserName(e.target.value)} className={tokenInputClass} />
      </Field>
      <Field label="Hasło">
        <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={tokenInputClass} />
      </Field>
    </AuthForm>
  )
}
