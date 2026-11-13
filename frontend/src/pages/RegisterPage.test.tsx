import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import RegisterPage from './RegisterPage'

afterEach(() => vi.unstubAllGlobals())

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/register']}>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const failing = (error: string) =>
  vi.fn((input: RequestInfo | URL, _init?: RequestInit) =>
    Promise.resolve(
      String(input).endsWith('/api/auth/register')
        ? new Response(JSON.stringify({ error }), { status: 400 })
        : new Response(null, { status: 401 }),
    ),
  )

describe('RegisterPage', () => {
  it('register sends userName and maps username errors', async () => {
    const fetchMock = failing('username_taken')
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    expect(screen.getByText('min. 8 znaków')).toBeInTheDocument()
    await user.type(await screen.findByLabelText('Nazwa użytkownika'), 'ania')
    await user.type(screen.getByLabelText('Hasło'), 'haslo1234')
    await user.type(screen.getByLabelText('Kod zaproszenia'), 'KOD')
    await user.click(screen.getByRole('button', { name: 'Załóż konto' }))
    expect(await screen.findByText('Ta nazwa jest już zajęta')).toBeInTheDocument()
    const call = fetchMock.mock.calls.find(([u]) => String(u).endsWith('/api/auth/register'))!
    expect(JSON.parse((call[1] as RequestInit).body as string)).toEqual({ userName: 'ania', password: 'haslo1234', inviteCode: 'KOD' })
    expect(screen.getByLabelText('Nazwa użytkownika')).toHaveAttribute('autocomplete', 'username')
  })

  it('maps invalid_username', async () => {
    vi.stubGlobal('fetch', failing('invalid_username'))
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nazwa użytkownika'), 'a')
    await user.type(screen.getByLabelText('Hasło'), 'haslo1234')
    await user.type(screen.getByLabelText('Kod zaproszenia'), 'KOD')
    await user.click(screen.getByRole('button', { name: 'Załóż konto' }))
    expect(await screen.findByText('Nazwa: 3–32 znaki, litery, cyfry, kropka, podkreślnik lub myślnik')).toBeInTheDocument()
  })

  it('shows invite error message', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(
        String(input).endsWith('/api/auth/register')
          ? new Response(JSON.stringify({ error: 'invalid_invite' }), { status: 400 })
          : new Response(null, { status: 401 }),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nazwa użytkownika'), 'ania')
    await user.type(screen.getByLabelText('Hasło'), 'haslo1234')
    await user.type(screen.getByLabelText('Kod zaproszenia'), 'ZLY')
    await user.click(screen.getByRole('button', { name: 'Załóż konto' }))
    expect(await screen.findByText('Nieprawidłowy lub zużyty kod zaproszenia')).toBeInTheDocument()
  })
})
