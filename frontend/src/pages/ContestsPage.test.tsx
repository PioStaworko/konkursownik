import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestCardDto, Reminder } from '../api/types'
import { todayInPoland } from '../lib/format'
import ContestsPage from './ContestsPage'

afterEach(() => vi.unstubAllGlobals())

const base: ContestCardDto = {
  id: 'c1', name: 'Wielka loteria', organizer: null, icon: null, type: 'Lottery',
  prizeDescription: null, prizeValue: null, startDate: '2026-11-01', endDate: '2026-11-30', resultsDate: null,
  status: 'Submitted', effectiveStatus: 'Submitted', entryCount: 3, entriesToday: 0,
  entryLimitTotal: 10, entryLimitPerDay: null, url: null, rulesUrl: null,
  purchasesTotal: 0, purchasesBought: 0, firstOpenPurchase: null, stores: [], firstProofLocation: null,
  win: null, createdAt: '2026-11-01T00:00:00+00:00',
}
const card = (o: Partial<ContestCardDto>): ContestCardDto => ({ ...base, ...o })

function addDays(date: string, n: number) {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function setup(active: ContestCardDto[], archive: ContestCardDto[] = [], reminders: Partial<Reminder>[] = []) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'PATCH' || init?.method === 'PUT') return Promise.resolve(new Response(null, { status: 204 }))
    if (url.includes('/api/reminders')) return Promise.resolve(new Response(JSON.stringify(reminders)))
    return Promise.resolve(new Response(JSON.stringify(url.includes('view=archive') ? archive : active)))
  })
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <ContestsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return fetchMock
}

describe('ContestsPage', () => {
  it('shows tiles, pills with counts and a card linking to details', async () => {
    setup([card({}), card({ id: 'c2', name: 'Druga', effectiveStatus: 'Bought' })], [], [{ dueDate: todayInPoland() }])
    const link = await screen.findByRole('link', { name: /Wielka loteria/ })
    expect(link).toHaveAttribute('href', '/konkursy/c1')
    expect(await screen.findByText('1 na dziś')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wszystkie/ })).toHaveTextContent('2')
    expect(screen.getByRole('button', { name: /Kupione/ })).toHaveTextContent('1')
    expect(screen.getByText('Twoje dane widzisz tylko Ty')).toBeInTheDocument()
  })

  it('status pill filters and shows empty state', async () => {
    setup([card({})])
    await screen.findByRole('link', { name: /Wielka loteria/ })
    await userEvent.setup().click(screen.getByRole('button', { name: /Wygrana/ }))
    expect(screen.getByText('Brak konkursów w tej kategorii')).toBeInTheDocument()
  })

  it('search matches without diacritics', async () => {
    setup([card({ name: 'Łoś' }), card({ id: 'c2', name: 'Inny' })])
    await screen.findByRole('link', { name: /Łoś/ })
    await userEvent.setup().type(screen.getByRole('searchbox'), 'los')
    expect(screen.queryByRole('link', { name: /Inny/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Łoś/ })).toBeInTheDocument()
  })

  it('sort button cycles through labels', async () => {
    setup([card({})])
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Termin/ }))
    await user.click(screen.getByRole('button', { name: /Wartość/ }))
    expect(screen.getByRole('button', { name: /Najnowsze/ })).toBeInTheDocument()
  })

  it('bought card shows ending warning when ≤3 days', async () => {
    const end = addDays(todayInPoland(), 2)
    setup([card({ effectiveStatus: 'Bought', endDate: end, entryLimitPerDay: 1, entriesToday: 0 })])
    const [, m, d] = end.split('-')
    expect(await screen.findByText(`Kończy się za 2 dni (${d}.${m})`)).toBeInTheDocument()
    expect(screen.getByText('Dziś: 0/1')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Zgłoś paragon/ })).toHaveAttribute('href', '/konkursy/c1?zgloszenie=1')
  })

  it('bought card far from deadline has no warning', async () => {
    setup([card({ effectiveStatus: 'Bought', endDate: addDays(todayInPoland(), 10) })])
    await screen.findByRole('link', { name: /Wielka loteria/ })
    expect(screen.queryByText(/Kończy się/)).not.toBeInTheDocument()
  })

  it('planned card mark bought calls PATCH status', async () => {
    const fetchMock = setup([
      card({
        effectiveStatus: 'Planned', status: 'Planned', purchasesTotal: 1,
        firstOpenPurchase: { product: 'napój', quantity: '2x', store: 'Lidl', note: null },
      }),
    ])
    expect(await screen.findByText(/napój/)).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: /Oznacz jako kupione/ }))
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')
      expect(String(call![0])).toBe('/api/contests/c1/status')
      expect(JSON.parse(call![1]!.body as string)).toEqual({ status: 'Bought' })
    })
  })

  it('won card mark sent keeps prize fields in PUT and omits steps', async () => {
    const fetchMock = setup([
      card({
        effectiveStatus: 'Won',
        win: { prizeWon: 'Karta', prizeValue: 500, laureateDeadline: '2026-12-01', laureateDataSent: false, stepsDone: 0, stepsTotal: 2 },
      }),
    ])
    await userEvent.setup().click(await screen.findByRole('button', { name: /Oznacz dane jako wysłane/ }))
    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
      expect(String(call![0])).toBe('/api/contests/c1/win')
      const body = JSON.parse(call![1]!.body as string)
      expect(body).toEqual({ prizeWon: 'Karta', prizeValue: 500, laureateDeadline: '2026-12-01', laureateDataSent: true })
      expect('steps' in body).toBe(false)
    })
  })

  it('card menu offers Edytuj and Duplikuj', async () => {
    setup([card({})])
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Więcej opcji' }))
    const menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Edytuj' })).toHaveAttribute('href', '/konkursy/c1/edycja')
    expect(within(menu).getByRole('menuitem', { name: 'Duplikuj' })).toBeInTheDocument()
  })

  it('archive pill loads archive view', async () => {
    const fetchMock = setup([card({})], [card({ id: 'z', name: 'Stary konkurs', effectiveStatus: 'Archived' })])
    await screen.findByRole('link', { name: /Wielka loteria/ })
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('view=archive'))).toBe(false)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Archiwum' }))
    expect(await screen.findByRole('link', { name: /Stary konkurs/ })).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('view=archive'))).toBe(true)
  })
})
