import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ProofListItemDto } from '../api/types'
import { renderApp, stubApi } from '../test/render'
import ProofsPage from './ProofsPage'

afterEach(() => vi.unstubAllGlobals())

const p = (id: string, what: string, location: string | null, extra: Partial<ProofListItemDto> = {}): ProofListItemDto => ({
  id, contestId: 'c1', contestName: 'Loteria', contestIcon: null, what, keepUntil: null, location, note: null, ...extra,
})

describe('ProofsPage', () => {
  it('proofs page groups by location, no location last', async () => {
    const fetchMock = stubApi({
      '/api/proofs': [
        p('a', 'Paragon A', null),
        p('b', 'Paragon B', 'Szuflada', { keepUntil: '2026-12-01', note: 'Z wieczkiem' }),
        p('c', 'Paragon C', 'Biurko'),
      ],
      '/api/proof-items/b': null,
    })
    renderApp(<ProofsPage />)
    await screen.findByText('Paragon A')
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Biurko', 'Szuflada', 'Bez miejsca'])
    expect(screen.getByText(/trzymać do 01\.12\.2026/)).toBeInTheDocument()
    expect(screen.getByText('Z wieczkiem')).toBeInTheDocument()
    const item = screen.getByText('Paragon B').closest('li')!
    await userEvent.setup().click(within(item).getByRole('button', { name: 'Wyrzucono' }))
    await waitFor(() =>
      expect((fetchMock.mock.calls as unknown as [unknown, RequestInit?][]).some(([u, i]) => String(u).endsWith('/api/proof-items/b') && i?.method === 'PATCH')).toBe(true),
    )
  })

  it('shows empty state', async () => {
    stubApi({ '/api/proofs': [] })
    renderApp(<ProofsPage />)
    expect(await screen.findByText('Schowek jest pusty')).toBeInTheDocument()
  })
})
