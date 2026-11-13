import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import AuthForm from '../components/AuthForm'
import { tokenInputClass } from '../lib/styles'
import { Field } from '../ui/Field'

function registerErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === 'invalid_invite') return 'Nieprawidłowy lub zużyty kod zaproszenia'
  if (e instanceof ApiError && e.code === 'invalid_username')
    return 'Nazwa: 3–32 znaki, litery, cyfry, kropka, podkreślnik lub myślnik'
  if (e instanceof ApiError && e.code === 'username_taken') return 'Ta nazwa jest już zajęta'
  if (e instanceof ApiError && e.status === 400)
    return 'Nie udało się założyć konta. Hasło musi mieć min. 8 znaków.'
  return 'Nie udało się założyć konta. Spróbuj ponownie.'
}

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await register(userName, password, inviteCode)
      navigate('/', { replace: true })
    } catch (e) {
      setError(registerErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthForm
      title="Załóż konto"
      error={error}
      submitLabel="Załóż konto"
      busy={busy}
      onSubmit={submit}
      footer={
        <>
          Masz już konto?{' '}
          <Link to="/login" className="font-medium text-primary">
            Zaloguj się
          </Link>
        </>
      }
    >
      <Field label="Nazwa użytkownika">
        <input type="text" required autoComplete="username" autoCapitalize="none" value={userName} onChange={(e) => setUserName(e.target.value)} className={tokenInputClass} />
      </Field>
      <Field label="Hasło" hint={<span className="text-label-md text-on-surface-variant">min. 8 znaków</span>}>
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={tokenInputClass} />
      </Field>
      <Field label="Kod zaproszenia">
        <input type="text" required autoComplete="off" autoCapitalize="characters" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className={tokenInputClass} />
      </Field>
    </AuthForm>
  )
}
