import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestDto } from '../api/types'
import ContestFormPage from './ContestFormPage'

afterEach(() => vi.unstubAllGlobals())

function renderPage(path = '/konkursy/nowy') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/konkursy/nowy" element={<ContestFormPage />} />
          <Route path="/konkursy/:id/edycja" element={<ContestFormPage />} />
          <Route path="/konkursy/:id" element={<p>Szczegóły konkursu</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

async function fillBasics(user: ReturnType<typeof userEvent.setup>, start = '2026-11-01', end = '2026-11-10') {
  await user.type(screen.getByLabelText('Nazwa'), 'Konkurs')
  await user.type(screen.getByLabelText('Data startu'), start)
  await user.type(screen.getByLabelText('Data końca'), end)
}

describe('ContestFormPage', () => {
  it('blocks end before start', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user, '2026-11-10', '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Data końca nie może być przed datą startu')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('shows invalid amount error', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    await user.type(screen.getByLabelText('Wartość nagrody'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Nieprawidłowa kwota')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('submits purchases with store and prize value as number, then navigates', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(json({ id: 'abc' }, 201)))
    vi.stubGlobal('fetch', fetchMock)
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    await user.type(screen.getByLabelText('Wartość nagrody'), '99,99')
    await user.click(screen.getByRole('button', { name: 'Dodaj produkt' }))
    await user.type(screen.getByLabelText('Produkt 1'), 'Mleko')
    await user.type(screen.getByLabelText('Sklep 1'), 'Biedronka')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/contests')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.prizeValue).toBe(99.99)
    expect(body.purchases).toEqual([
      { id: null, product: 'Mleko', store: 'Biedronka', quantity: null, bought: false, note: null },
    ])
    expect(body.icon).toBeNull()
  })

  it('shows server validation errors at top', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(json({ errors: { Name: ['Nazwa jest wymagana (maks. 200 znaków).'] } }, 400))),
    )
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nazwa jest wymagana (maks. 200 znaków).')
  })

  it('edit PUTs full dto preserving child ids', async () => {
    const contest: ContestDto = {
      id: 'c1', name: 'Stary', organizer: null, url: null, rulesUrl: null, type: 'Lottery',
      prizeDescription: null, prizeValue: 10, prizeCount: null, startDate: '2026-11-01', endDate: '2026-11-30',
      resultsDate: null, resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null,
      status: 'Planned', notes: null, icon: null,
      tasks: [{ id: 't1', text: 'Krok', done: true }],
      purchases: [{ id: 'p1', product: 'Mleko', store: null, quantity: null, bought: true, note: null }],
      proofs: [{ id: 'r1', what: 'Paragon', keepUntil: null, location: null, discarded: true, note: null }],
      effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
    }
    const fetchMock = vi.fn((_: string, init?: RequestInit) =>
      Promise.resolve(init?.method === 'PUT' ? new Response(null, { status: 204 }) : json(contest)),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/konkursy/c1/edycja')
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Nazwa')
    await waitFor(() => expect(name).toHaveValue('Stary'))
    await user.clear(name)
    await user.type(name, 'Nowy')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')!
    expect(put[0]).toBe('/api/contests/c1')
    const body = JSON.parse(put[1]!.body as string)
    expect(body.name).toBe('Nowy')
    expect(body.prizeValue).toBe(10)
    expect(body.tasks).toEqual([{ id: 't1', text: 'Krok', done: true }])
    expect(body.purchases[0]).toMatchObject({ id: 'p1', bought: true })
    expect(body.proofs[0]).toMatchObject({ id: 'r1', discarded: true })
    expect(body).not.toHaveProperty('entries')
  })

  it('edit_preserves_icon_and_notes', async () => {
    const contest: ContestDto = {
      id: 'c1', name: 'Stary', organizer: null, url: null, rulesUrl: null, type: 'Lottery',
      prizeDescription: null, prizeValue: null, prizeCount: null, startDate: '2026-11-01', endDate: '2026-11-30',
      resultsDate: null, resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null,
      status: 'Planned', notes: null, icon: 'coffee',
      tasks: [],
      purchases: [{ id: 'p1', product: 'Mleko', store: null, quantity: null, bought: false, note: 'Weź paragon papierowy' }],
      proofs: [{ id: 'r1', what: 'Paragon', keepUntil: null, location: null, discarded: false, note: 'Nie wyrzucać folii' }],
      effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
    }
    const fetchMock = vi.fn((_: string, init?: RequestInit) =>
      Promise.resolve(init?.method === 'PUT' ? new Response(null, { status: 204 }) : json(contest)),
    )
    vi.stubGlobal('fetch', fetchMock)
    renderPage('/konkursy/c1/edycja')
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Nazwa')
    await waitFor(() => expect(name).toHaveValue('Stary'))
    await user.clear(name)
    await user.type(name, 'Nowy')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const put = fetchMock.mock.calls.find(([, i]) => i?.method === 'PUT')!
    const body = JSON.parse(put[1]!.body as string)
    expect(body.icon).toBe('coffee')
    expect(body.purchases[0].note).toBe('Weź paragon papierowy')
    expect(body.proofs[0].note).toBe('Nie wyrzucać folii')
  })
})
