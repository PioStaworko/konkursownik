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
})
