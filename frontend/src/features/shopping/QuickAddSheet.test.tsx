import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestCardDto, ContestDto } from '../../api/types'
import QuickAddSheet from './QuickAddSheet'

afterEach(() => vi.unstubAllGlobals())

const card = { id: 'c1', name: 'Loteria' } as ContestCardDto
const contest = {
  id: 'c1', name: 'Loteria', organizer: null, url: null, rulesUrl: null, type: 'Lottery', prizeDescription: null,
  prizeValue: null, prizeCount: null, startDate: '2026-11-01', endDate: '2026-11-30', resultsDate: null,
  resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null, status: 'Planned', notes: null, icon: null,
  tasks: [{ id: 't1', text: 'Krok', done: false }],
  purchases: [{ id: 'p1', product: 'Mleko', store: 'Lidl', quantity: null, bought: true, note: null }],
  proofs: [], effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
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
    expect(body.tasks).toEqual([{ id: 't1', text: 'Krok', done: false }])
    expect(body.purchases).toEqual([
      { id: 'p1', product: 'Mleko', store: 'Lidl', quantity: null, bought: true, note: null },
      { id: null, product: 'Masło', store: 'Biedronka', quantity: '2 szt.', bought: false, note: 'min. 2 na paragonie' },
    ])
    expect(body).not.toHaveProperty('entries')
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
