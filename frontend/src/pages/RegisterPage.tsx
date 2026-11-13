import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import AuthForm from '../components/AuthForm'
import { tokenInputClass } from '../lib/styles'
import { Field } from '../ui/Field'

function registerErrorMessage(e: unknown): string {
  if (e instanceof ApiError && e.code === 'invalid_invite') return 'Nieprawidłowy lub zużyty kod zaproszenia'
  if (e instanceof ApiError && e.status === 400)
    return 'Nie udało się założyć konta. Hasło musi mieć min. 8 znaków, a e-mail nie może być już używany.'
  return 'Nie udało się założyć konta. Spróbuj ponownie.'
}

export default function RegisterPage() {
  const { user, register } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      await register(email, password, inviteCode)
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
      <Field label="E-mail">
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={tokenInputClass} />
      </Field>
      <Field label="Hasło">
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={tokenInputClass} />
      </Field>
      <Field label="Kod zaproszenia">
        <input type="text" required autoComplete="off" autoCapitalize="characters" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} className={tokenInputClass} />
      </Field>
    </AuthForm>
  )
}
