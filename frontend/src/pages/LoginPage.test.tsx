import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import LoginPage from './LoginPage'

afterEach(() => vi.unstubAllGlobals())

describe('LoginPage', () => {
  it('login with username', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 401 })))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Nazwa użytkownika')
    expect(name).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Hasło')).toHaveAttribute('autocomplete', 'current-password')
    await user.type(name, 'ania')
    await user.type(screen.getByLabelText('Hasło'), 'haslo1234')
    await user.click(screen.getByRole('button', { name: 'Zaloguj' }))
    expect(await screen.findByText('Nieprawidłowa nazwa użytkownika lub hasło')).toBeInTheDocument()
    const call = (fetchMock.mock.calls as unknown as [RequestInfo, RequestInit][]).find(([u]) => String(u).endsWith('/api/auth/login'))!
    expect(JSON.parse(call[1].body as string)).toEqual({ userName: 'ania', password: 'haslo1234' })
  })
})
