import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp, stubApi } from '../test/render'
import StatsPage from './StatsPage'

afterEach(() => vi.unstubAllGlobals())

describe('StatsPage', () => {
  it('shows tiles and a positive balance in secondary tone', async () => {
    stubApi({ '/api/stats': { contests: 4, entries: 12, wins: 2, totalSpent: 10, totalWonValue: 50 } })
    renderApp(<StatsPage />)
    expect(await screen.findByText('Konkursy')).toBeInTheDocument()
    for (const l of ['Zgłoszenia', 'Wygrane', 'Wydane', 'Wartość wygranych', 'Bilans']) {
      expect(screen.getByText(l)).toBeInTheDocument()
    }
    expect(screen.getByTestId('balance').className).toContain('text-secondary')
  })

  it('stats balance negative uses error tone', async () => {
    stubApi({ '/api/stats': { contests: 1, entries: 1, wins: 0, totalSpent: 80, totalWonValue: 20 } })
    renderApp(<StatsPage />)
    const balance = await screen.findByTestId('balance')
    expect(balance.className).toContain('text-error')
    expect(balance.className).not.toContain('text-secondary')
  })

  it('shows an error alert', async () => {
    stubApi({})
    renderApp(<StatsPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wczytać statystyk')
  })

  it('balance equal to zero after rounding is not an error', async () => {
    stubApi({ '/api/stats': { contests: 1, entries: 1, wins: 0, totalSpent: 0.1 + 0.2, totalWonValue: 0.3 } })
    renderApp(<StatsPage />)
    const balance = await screen.findByTestId('balance')
    expect(balance.className).toContain('text-secondary')
    expect(balance.textContent).not.toContain('-')
  })
})
