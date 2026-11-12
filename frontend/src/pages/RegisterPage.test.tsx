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

describe('RegisterPage', () => {
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
    await user.type(await screen.findByLabelText('E-mail'), 'a@b.pl')
    await user.type(screen.getByLabelText('Hasło'), 'haslo1234')
    await user.type(screen.getByLabelText('Kod zaproszenia'), 'ZLY')
    await user.click(screen.getByRole('button', { name: 'Załóż konto' }))
    expect(await screen.findByText('Nieprawidłowy lub zużyty kod zaproszenia')).toBeInTheDocument()
  })
})
