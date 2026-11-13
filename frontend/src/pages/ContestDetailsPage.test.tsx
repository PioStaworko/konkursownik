import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestDto } from '../api/types'
import { todayInPoland } from '../lib/format'
import { contestFixture, entryFixture } from '../test/fixtures'
import ContestDetailsPage from './ContestDetailsPage'

afterEach(() => vi.unstubAllGlobals())

function renderPage(fetchMock: ReturnType<typeof vi.fn>, initial = '/konkursy/c1') {
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initial]}>
        <Routes>
          <Route path="/konkursy/:id" element={<ContestDetailsPage />} />
          <Route path="/konkursy/:id/edycja" element={<p>Edycja kopii</p>} />
          <Route path="/konkursy" element={<p>Lista konkursów</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
const serve = (c: ContestDto) =>
  vi.fn((_url: string, init?: RequestInit) =>
    Promise.resolve(init?.method && init.method !== 'GET' ? new Response(null, { status: 204 }) : ok(c)),
  )

describe('ContestDetailsPage', () => {
  it('unsafe urls not linked, safe ones open in a new tab', async () => {
    renderPage(serve(contestFixture))
    const rules = await screen.findByRole('link', { name: /Regulamin/ })
    expect(rules).toHaveAttribute('href', 'https://x.pl/regulamin')
    expect(rules).toHaveAttribute('target', '_blank')
    expect(rules).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: /Strona/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/javascript:alert/)).not.toBeInTheDocument()
  })

  it('delete confirm then navigate', async () => {
    const fetchMock = serve(contestFixture)
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Więcej opcji' }))
    await user.click(screen.getByRole('menuitem', { name: 'Usuń' }))
    expect(confirm).toHaveBeenCalledWith('Usunąć konkurs razem ze zdjęciami?')
    expect(await screen.findByText('Lista konkursów')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('does not delete when the confirmation is declined', async () => {
    const fetchMock = serve(contestFixture)
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Więcej opcji' }))
    await user.click(screen.getByRole('menuitem', { name: 'Usuń' }))
    expect(fetchMock).not.toHaveBeenCalledWith('/api/contests/c1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('duplicate navigates to the copy edit page', async () => {
    const fetchMock = vi.fn((url: string, init?: RequestInit) =>
      Promise.resolve(init?.method === 'POST' && url.endsWith('/duplicate') ? ok({ id: 'c2' }, 201) : ok(contestFixture)),
    )
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Więcej opcji' }))
    await user.click(screen.getByRole('menuitem', { name: 'Duplikuj' }))
    expect(await screen.findByText('Edycja kopii')).toBeInTheDocument()
  })

  it('edit links to the edit page', async () => {
    renderPage(serve(contestFixture))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Więcej opcji' }))
    expect(screen.getByRole('menuitem', { name: 'Edytuj' })).toHaveAttribute('href', '/konkursy/c1/edycja')
  })

  it('status menu patches status', async () => {
    const fetchMock = serve(contestFixture)
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Status: Planowany/ }))
    await user.click(screen.getByRole('menuitemradio', { name: 'Wygrana' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1/status', expect.objectContaining({ method: 'PATCH' })),
    )
  })

  it('tabs show step progress and entries is the default tab', async () => {
    renderPage(serve(contestFixture))
    expect(await screen.findByRole('tab', { name: /Kroki \(1\/2\)/ })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Zgłoszenia' })).toHaveAttribute('aria-selected', 'true')
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: /Kroki/ }))
    expect(screen.getByText('Krok drugi')).toBeInTheDocument()
  })

  it('?zgloszenie=1 opens entries tab with form', async () => {
    renderPage(serve(contestFixture), '/konkursy/c1?zgloszenie=1')
    expect(await screen.findByRole('button', { name: 'Zapisz zgłoszenie' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Zgłoszenia' })).toHaveAttribute('aria-selected', 'true')
  })

  it('the form is closed by default and opened with the add button', async () => {
    renderPage(serve(contestFixture))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Dodaj zgłoszenie/ }))
    expect(screen.getByRole('button', { name: 'Zapisz zgłoszenie' })).toBeInTheDocument()
  })

  it('toggles a step via contest-tasks', async () => {
    const fetchMock = serve(contestFixture)
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: /Kroki/ }))
    await user.click(screen.getByRole('button', { name: 'Krok drugi' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/contest-tasks/t2', expect.objectContaining({ method: 'PATCH' })),
    )
  })

  it('lists purchases and proofs in their tabs', async () => {
    const c: ContestDto = {
      ...contestFixture,
      purchases: [{ id: 'p1', product: 'Cola', store: 'Żabka', quantity: '2', bought: false, note: 'duża' }],
      proofs: [{ id: 'r1', what: 'Paragon papierowy', keepUntil: '2027-01-31', location: 'Teczka', discarded: false, note: null }],
    }
    renderPage(serve(c))
    const user = userEvent.setup()
    await user.click(await screen.findByRole('tab', { name: 'Do kupienia' }))
    expect(screen.getByText('Cola × 2')).toBeInTheDocument()
    expect(screen.getByText(/Żabka/)).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'Schowek' }))
    expect(screen.getByText('Paragon papierowy')).toBeInTheDocument()
    expect(screen.getByText(/Teczka/)).toBeInTheDocument()
  })

  it('shows entries with total, counter and notes', async () => {
    const c: ContestDto = {
      ...contestFixture,
      notes: 'Moja notatka',
      entries: [
        entryFixture({ id: 'e1', receiptNumber: 'A1', purchaseAmount: 10.5, store: 'Biedronka' }),
        entryFixture({ id: 'e2', receiptNumber: 'A2', purchaseAmount: 20 }),
      ],
    }
    renderPage(serve(c))
    expect(await screen.findByText('2/5 · dziś 0/1')).toBeInTheDocument()
    expect(screen.getByText(/Suma:/).textContent?.replace(/\s/g, ' ')).toBe('Suma: 30,50 zł')
    expect(screen.getByText('Moja notatka')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
  })

  it('deletes an entry after confirmation', async () => {
    const c: ContestDto = { ...contestFixture, entries: [entryFixture()] }
    const fetchMock = serve(c)
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true))
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Usuń zgłoszenie' }))
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/entries/e1', expect.objectContaining({ method: 'DELETE' })),
    )
  })

  it('shows the ending badge', async () => {
    const [y, m, d] = todayInPoland().split('-').map(Number)
    const end = new Date(Date.UTC(y, m - 1, d + 2)).toISOString().slice(0, 10)
    renderPage(serve({ ...contestFixture, endDate: end }))
    expect(await screen.findByText('Koniec za 2 dni')).toBeInTheDocument()
  })

  it('no share button and no fabricated badges', async () => {
    renderPage(serve({ ...contestFixture, entries: [entryFixture({ photos: [{ id: 'p1', label: 'Receipt', sizeBytes: 5 }] })] }))
    await screen.findByRole('tab', { name: 'Zgłoszenia' })
    const page = document.body
    for (const text of ['Udostępnij', 'Zweryfikowany', 'Czytelne', 'Potwierdzony', 'EAN-13', 'szyfrowane', 'Regulamin PDF']) {
      expect(within(page).queryByText(new RegExp(text))).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: /Udostępnij/ })).not.toBeInTheDocument()
  })
})
