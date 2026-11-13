import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { LocationProbe, stubApi } from './test/render'

afterEach(() => vi.unstubAllGlobals())

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <App />
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App routes', () => {
  it('/zaproszenia redirects non-admin', async () => {
    stubApi({
      '/api/auth/me': { userName: 'ania', isAdmin: false },
      '/api/invites': [],
      '/api/reminders': [],
      '/api/shopping-list': [],
    })
    renderAt('/zaproszenia')
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(/^[/]$/))
    expect(screen.queryByRole('heading', { name: 'Zaproszenia' })).not.toBeInTheDocument()
  })

  it('/zaproszenia stays for admin', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true }, '/api/invites': [] })
    renderAt('/zaproszenia')
    expect(await screen.findByRole('heading', { name: 'Zaproszenia' })).toBeInTheDocument()
  })

  it('/wiecej redirects to /statystyki', async () => {
    stubApi({
      '/api/auth/me': { userName: 'ania', isAdmin: true },
      '/api/stats': { contests: 7, entries: 1, wins: 0, totalSpent: 0, totalWonValue: 0 },
      '/api/reminders': [],
      '/api/shopping-list': [],
    })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={['/wiecej']}>
          <AuthProvider>
            <App />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(await screen.findByText('Bilans')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Statystyki' })).toBeInTheDocument()
  })
})
