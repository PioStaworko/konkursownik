import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import StatusMenu from './StatusMenu'

afterEach(() => vi.unstubAllGlobals())

describe('StatusMenu', () => {
  it('lists all 7 statuses with the current one checked and patches the chosen one', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <StatusMenu contestId="c1" status="Bought" />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /Status: Kupione/ }))
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(7)
    expect(screen.getByRole('menuitemradio', { name: 'Kupione' })).toHaveAttribute('aria-checked', 'true')
    await user.click(screen.getByRole('menuitemradio', { name: 'Zgłoszony' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/contests/c1/status')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ status: 'Submitted' })
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('marks the stored status as current, not the effective one', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <StatusMenu contestId="c1" status="Submitted" />
      </QueryClientProvider>,
    )
    await userEvent.setup().click(screen.getByRole('button', { name: /Status/ }))
    expect(screen.getByRole('menuitemradio', { name: 'Zgłoszony' })).toHaveAttribute('aria-checked', 'true')
  })
})
