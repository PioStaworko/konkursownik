import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestCardDto, ContestDto } from '../../api/types'
import QuickAddSheet from './QuickAddSheet'

afterEach(() => vi.unstubAllGlobals())

const card = { id: 'c1', name: 'Loteria' } as ContestCardDto
const upsert = {
  name: 'Loteria', organizer: 'Org', url: 'https://x.pl', rulesUrl: 'https://x.pl/regulamin', type: 'Lottery',
  prizes: [{ id: 'z1', name: 'Auto', value: 50000, count: 2 }], startDate: '2026-11-01', endDate: '2026-11-30',
  resultsDate: '2026-12-10', resultsCheckNote: 'sprawdź na stronie', entryLimitPerDay: 3, entryLimitTotal: 20,
  status: 'Planned', notes: 'moje notatki', icon: 'local_pizza',
  tasks: [{ id: 't1', text: 'Krok', done: true }],
  purchases: [{ id: 'p1', product: 'Mleko', store: 'Lidl', quantity: '2 szt.', bought: true, note: 'paragon' }],
  proofs: [{ id: 'f1', what: 'Paragon', keepUntil: '2027-01-01', location: 'szuflada', discarded: true, note: 'wyrzucony' }],
}
const contest = {
  ...upsert, id: 'c1', effectiveStatus: 'Planned', entries: [{ id: 'e1' }], win: { prizeWon: 'x' }, entriesToday: 1,
} as unknown as ContestDto

describe('QuickAddSheet', () => {
  it('PUTs contest with appended purchase and keeps existing ids', async () => {
    const onClose = vi.fn()
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (init?.method === 'PUT') return Promise.resolve(new Response(null, { status: 204 }))
      if (url.startsWith('/api/contests?')) return Promise.resolve(new Response(JSON.stringify([card])))
      if (url === '/api/contests/c1') return Promise.resolve(new Response(JSON.stringify(contest)))
      return Promise.resolve(new Response('[]'))
    })
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><QuickAddSheet open onClose={onClose} /></QueryClientProvider>)
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Loteria' })
    await user.selectOptions(screen.getByLabelText('Konkurs'), 'c1')
    await user.type(screen.getByLabelText('Produkt'), 'Masło')
    await user.type(screen.getByLabelText('Sklep'), 'Biedronka')
    await user.type(screen.getByLabelText('Ilość'), '2 szt.')
    await user.type(screen.getByLabelText('Notatka'), 'min. 2 na paragonie')
    await user.click(screen.getByRole('button', { name: 'Dodaj do listy' }))
    await waitFor(() => expect(onClose).toHaveBeenCalled())
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')!
    expect(String(put[0])).toBe('/api/contests/c1')
    const body = JSON.parse(put[1]!.body as string)
    expect(body).toEqual({
      ...upsert,
      purchases: [
        ...upsert.purchases,
        { id: null, product: 'Masło', store: 'Biedronka', quantity: '2 szt.', bought: false, note: 'min. 2 na paragonie' },
      ],
    })
  })

  it('requires product', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify([card])))))
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(<QueryClientProvider client={client}><QuickAddSheet open onClose={() => {}} /></QueryClientProvider>)
    const user = userEvent.setup()
    await screen.findByRole('option', { name: 'Loteria' })
    await user.selectOptions(screen.getByLabelText('Konkurs'), 'c1')
    await user.click(screen.getByRole('button', { name: 'Dodaj do listy' }))
    expect(await screen.findByText('Podaj nazwę produktu')).toBeInTheDocument()
  })
})
