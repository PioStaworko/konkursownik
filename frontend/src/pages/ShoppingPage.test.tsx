import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ShoppingGroupDto, ShoppingItemDto } from '../api/types'
import { todayInPoland } from '../lib/format'
import ShoppingPage from './ShoppingPage'

afterEach(() => vi.unstubAllGlobals())

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const item = (o: Partial<ShoppingItemDto> & { id: string; product: string }): ShoppingItemDto => ({
  contestId: 'c1', contestName: 'Loteria', quantity: null, contestEndDate: '2026-12-31', contestIcon: null, note: null, ...o,
})
const base = (): ShoppingGroupDto[] => [
  { store: 'Biedronka', items: [
    item({ id: 'i1', product: 'Mleko', quantity: '2 szt.', note: 'paragon papierowy' }),
    item({ id: 'i2', product: 'Chleb', contestName: 'Konkurs B', contestId: 'c2' }),
  ] },
  { store: 'Lidl', items: [item({ id: 'i3', product: 'Masło' })] },
]

/** A server whose list drops items once PATCHed true, like the real API. */
function setup(initial: ShoppingGroupDto[] = base(), patchStatus = 204) {
  let list = initial
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH') {
      if (patchStatus === 204) {
        const id = url.split('/').pop()!
        const value = JSON.parse(init.body as string).value
        if (value) list = list.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) })).filter((g) => g.items.length > 0)
      }
      return Promise.resolve(new Response(null, { status: patchStatus }))
    }
    if (url.includes('/api/shopping')) return Promise.resolve(new Response(JSON.stringify(list)))
    return Promise.resolve(new Response('[]'))
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter><ShoppingPage /></MemoryRouter>
    </QueryClientProvider>,
  )
  return fetchMock
}

describe('ShoppingPage', () => {
  it('renders summary, groups, quantity and note', async () => {
    setup()
    expect(await screen.findByRole('heading', { name: /Biedronka/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Lidl/ })).toBeInTheDocument()
    expect(screen.getByText('2 szt.')).toBeInTheDocument()
    expect(screen.getByText('paragon papierowy')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Do kupienia: 3 pozycji w 2 sklepach')
  })

  it('check keeps item crossed out and uncheck restores', async () => {
    const fetchMock = setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Mleko/ }))
    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-items/i1', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ value: true }),
    }))
    // survives the refetch that drops it from the server list
    await waitFor(() => expect(fetchMock.mock.calls.filter(([u]) => String(u).includes('/api/shopping')).length).toBeGreaterThan(1))
    expect(screen.getByText('Mleko')).toHaveClass('line-through')
    expect(screen.getByRole('button', { name: /Mleko/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Do kupienia: 2 pozycji w 2 sklepach')

    await user.click(screen.getByRole('button', { name: /Mleko/ }))
    expect(fetchMock).toHaveBeenCalledWith('/api/purchase-items/i1', expect.objectContaining({
      method: 'PATCH', body: JSON.stringify({ value: false }),
    }))
    await waitFor(() => expect(screen.getByText('Mleko')).not.toHaveClass('line-through'))
  })

  it('failed toggle restores previous state and shows alert', async () => {
    setup(base(), 500)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Mleko/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się')
    expect(screen.getByText('Mleko')).not.toHaveClass('line-through')
    expect(screen.getByRole('button', { name: /Mleko/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('progress bar reflects session checks', async () => {
    setup()
    const user = userEvent.setup()
    const mleko = await screen.findByRole('button', { name: /Mleko/ })
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0')
    await user.click(mleko)
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '33'))
  })

  it('ending badge only when ≤3 days', async () => {
    const today = todayInPoland()
    setup([{ store: 'Biedronka', items: [
      item({ id: 'a', product: 'Dziś', contestEndDate: today }),
      item({ id: 'b', product: 'Za trzy', contestEndDate: addDays(today, 3) }),
      item({ id: 'c', product: 'Za cztery', contestEndDate: addDays(today, 4) }),
    ] }])
    await screen.findByText('Dziś')
    expect(screen.getByText('Koniec dziś!')).toBeInTheDocument()
    expect(screen.getByText('Koniec za 3 dni!')).toBeInTheDocument()
    expect(screen.queryByText(/Koniec za 4/)).not.toBeInTheDocument()
  })

  it('sections collapse and expand, Dowolny sklep last', async () => {
    setup([
      { store: 'Dowolny sklep', items: [item({ id: 'x', product: 'Cokolwiek' })] },
      { store: 'Lidl', items: [item({ id: 'y', product: 'Masło' })] },
    ])
    const user = userEvent.setup()
    await screen.findByText('Masło')
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(headings[headings.length - 1]).toContain('Dowolny sklep')
    const toggle = screen.getByRole('button', { name: /Lidl/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Masło')).not.toBeInTheDocument()
    expect(within(screen.getByRole('heading', { name: /Lidl/ })).getByText('1 poz.')).toBeInTheDocument()
  })

  it('shows empty state', async () => {
    setup([])
    expect(await screen.findByText('Lista zakupów jest pusta')).toBeInTheDocument()
  })

  it('opens the new entry picker from the bottom banner', async () => {
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Dodaj zgłoszenie' }))
    expect(await screen.findByText('Wybierz konkurs')).toBeInTheDocument()
  })
})
