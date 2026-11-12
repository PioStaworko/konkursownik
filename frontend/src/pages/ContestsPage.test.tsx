import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestSummaryDto } from '../api/types'
import ContestsPage from './ContestsPage'

afterEach(() => vi.unstubAllGlobals())

const card: ContestSummaryDto = {
  id: 'c1', name: 'Wielka loteria', endDate: '2026-11-30', resultsDate: null,
  status: 'Planned', effectiveStatus: 'Submitted', entryCount: 3, entryLimitTotal: 10,
}

describe('ContestsPage', () => {
  it('shows cards for active view and empty archive', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) =>
      Promise.resolve(new Response(JSON.stringify(String(input).includes('view=archive') ? [] : [card]))),
    )
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <ContestsPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )
    const link = await screen.findByRole('link', { name: /Wielka loteria/ })
    expect(link).toHaveAttribute('href', '/konkursy/c1')
    expect(link).toHaveTextContent('Zgłoszony')
    expect(link).toHaveTextContent('do 30.11.2026')
    expect(link).toHaveTextContent('3/10')
    await userEvent.setup().click(screen.getByRole('tab', { name: 'Archiwum' }))
    expect(await screen.findByText('Archiwum jest puste')).toBeInTheDocument()
  })
})
