import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestDto } from '../api/types'
import ContestDetailsPage from './ContestDetailsPage'

afterEach(() => vi.unstubAllGlobals())

const contest: ContestDto = {
  id: 'c1',
  name: 'Konkurs',
  organizer: null,
  url: 'javascript:alert(1)',
  rulesUrl: 'https://x.pl/regulamin',
  type: 'Lottery',
  prizeDescription: null,
  prizeValue: null,
  prizeCount: null,
  startDate: '2026-11-01',
  endDate: '2026-11-30',
  resultsDate: null,
  resultsCheckNote: null,
  entryLimitPerDay: 1,
  entryLimitTotal: 5,
  status: 'Planned',
  effectiveStatus: 'Planned',
  notes: null,
  icon: null,
  tasks: [{ id: 't1', text: 'Krok', done: false }],
  purchases: [],
  proofs: [],
  entries: [],
  win: null,
  entriesToday: 0,
}

function renderPage(fetchMock: ReturnType<typeof vi.fn>) {
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/konkursy/c1']}>
        <Routes>
          <Route path="/konkursy/:id" element={<ContestDetailsPage />} />
          <Route path="/konkursy" element={<p>Lista konkursów</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const ok = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

describe('ContestDetailsPage', () => {
  it('links only http(s) urls and shows the entry counter', async () => {
    renderPage(vi.fn().mockResolvedValue(ok(contest)))
    const rules = await screen.findByRole('link', { name: 'Regulamin' })
    expect(rules).toHaveAttribute('href', 'https://x.pl/regulamin')
    expect(rules).toHaveAttribute('target', '_blank')
    expect(rules).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.queryByRole('link', { name: /Strona konkursu/ })).not.toBeInTheDocument()
    expect(screen.getByText(/javascript:alert\(1\)/)).toBeInTheDocument()
    expect(screen.getByText('0/5 · dziś 0/1')).toBeInTheDocument()
  })

  it('deletes after confirmation and navigates to the list', async () => {
    const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
      Promise.resolve(init?.method === 'DELETE' ? new Response(null, { status: 204 }) : ok(contest)),
    )
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    renderPage(fetchMock)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Menu' }))
    await user.click(screen.getByRole('button', { name: 'Usuń' }))
    expect(confirm).toHaveBeenCalledWith('Usunąć konkurs razem ze zdjęciami?')
    expect(await screen.findByText('Lista konkursów')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/contests/c1', expect.objectContaining({ method: 'DELETE' }))
  })
})
