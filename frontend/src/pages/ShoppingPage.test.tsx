import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ShoppingGroupDto } from '../api/types'
import ShoppingPage from './ShoppingPage'

afterEach(() => vi.unstubAllGlobals())

const groups: ShoppingGroupDto[] = [
  { store: 'Biedronka', items: [
    { id: 'i1', contestId: 'c1', contestName: 'Loteria', product: 'Mleko', quantity: '2 szt.' },
    { id: 'i2', contestId: 'c2', contestName: 'Konkurs B', product: 'Chleb', quantity: null },
  ] },
  { store: 'Lidl', items: [{ id: 'i3', contestId: 'c1', contestName: 'Loteria', product: 'Masło', quantity: null }] },
]

function setup(patchStatus = 204) {
  let list = groups
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'PATCH') {
      if (patchStatus === 204) {
        list = list.map((g) => ({ ...g, items: g.items.filter((i) => !String(input).endsWith(i.id)) }))
          .filter((g) => g.items.length > 0)
      }
      return Promise.resolve(new Response(null, { status: patchStatus }))
    }
    return Promise.resolve(new Response(JSON.stringify(list)))
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ShoppingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fetchMock
}

describe('ShoppingPage', () => {
  it('renders groups and removes item after check', async () => {
    const fetchMock = setup()
    expect(await screen.findByRole('heading', { name: 'Biedronka' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Lidl' })).toBeInTheDocument()
    expect(screen.getByText('2 szt.')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('checkbox', { name: /Mleko/ }))
    await waitFor(() => expect(screen.queryByText('Mleko')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-items/i1', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ value: true }),
    }))
    expect(screen.getByText('Chleb')).toBeInTheDocument()
  })

  it('restores the item and shows an error when the toggle fails', async () => {
    setup(500)
    await userEvent.setup().click(await screen.findByRole('checkbox', { name: /Mleko/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się')
    expect(screen.getByText('Mleko')).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response('[]'))))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><MemoryRouter><ShoppingPage /></MemoryRouter></QueryClientProvider>)
    expect(await screen.findByText('Lista zakupów jest pusta')).toBeInTheDocument()
  })
})
