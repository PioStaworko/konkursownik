import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider, useAuth } from './AuthProvider'

afterEach(() => vi.unstubAllGlobals())

function Probe() {
  const { user, logout } = useAuth()
  return (
    <>
      <p>{user ? user.email : 'anon'}</p>
      <button onClick={() => void logout()}>out</button>
    </>
  )
}

describe('AuthProvider.logout', () => {
  it('logs out locally even when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) =>
      String(input).includes('logout') ? Promise.reject(new TypeError('offline'))
        : Promise.resolve(new Response(JSON.stringify({ email: 'a@b.pl' })))))
    render(<QueryClientProvider client={new QueryClient()}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>)
    expect(await screen.findByText('a@b.pl')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'out' }))
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument())
  })

  it('wipes cached user data and calls POST /api/auth/logout', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(String(input).includes('logout') ? new Response(null, { status: 204 })
        : new Response(JSON.stringify({ email: 'a@b.pl' }))))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient()
    client.setQueryData(['contests', 'active'], [{ id: 'c1' }])
    client.setQueryData(['reminders'], [{ id: 'r1' }])
    render(<QueryClientProvider client={client}><AuthProvider><Probe /></AuthProvider></QueryClientProvider>)
    expect(await screen.findByText('a@b.pl')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'out' }))
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument())
    expect(client.getQueryData(['contests', 'active'])).toBeUndefined()
    expect(client.getQueryData(['reminders'])).toBeUndefined()
    const logoutCall = fetchMock.mock.calls.find(([u]) => String(u).includes('/api/auth/logout'))
    expect(logoutCall?.[1]?.method).toBe('POST')
  })
})
