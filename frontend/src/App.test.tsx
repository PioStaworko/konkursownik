import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { stubApi } from './test/render'

afterEach(() => vi.unstubAllGlobals())

describe('App routes', () => {
  it('/wiecej redirects to /statystyki', async () => {
    stubApi({
      '/api/auth/me': { email: 'a@b.pl' },
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
