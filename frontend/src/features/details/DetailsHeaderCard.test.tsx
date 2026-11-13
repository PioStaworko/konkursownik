import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { contestFixture } from '../../test/fixtures'
import { todayInPoland } from '../../lib/format'
import DetailsHeaderCard from './DetailsHeaderCard'

const inDays = (n: number) => {
  const [y, m, d] = todayInPoland().split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

describe('DetailsHeaderCard', () => {
  it('shows name, dates, results date, prize and counters from data', () => {
    render(
      <DetailsHeaderCard
        c={{
          ...contestFixture,
          name: 'Loteria',
          resultsDate: '2026-12-05',
          prizeDescription: 'Rower',
          prizeValue: 1000,
          entryLimitTotal: 5,
          entryLimitPerDay: 1,
          entriesToday: 1,
          entries: [],
        }}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Loteria' })).toBeInTheDocument()
    expect(screen.getByText(/01\.11\.2026 – 30\.11\.2026/)).toBeInTheDocument()
    expect(screen.getByText('05.12.2026')).toBeInTheDocument()
    expect(screen.getByText(/Rower/)).toBeInTheDocument()
    expect(screen.getByText('Limit zgłoszeń').parentElement).toHaveTextContent('0 / 5')
    expect(screen.getByText('Limit na dziś').parentElement).toHaveTextContent('1 / 1')
  })

  it('badge: today and within 3 days only', () => {
    const { rerender } = render(<DetailsHeaderCard c={{ ...contestFixture, endDate: inDays(0) }} />)
    expect(screen.getByText('Kończy się dziś')).toBeInTheDocument()
    rerender(<DetailsHeaderCard c={{ ...contestFixture, endDate: inDays(1) }} />)
    expect(screen.getByText('Koniec za 1 dzień')).toBeInTheDocument()
    rerender(<DetailsHeaderCard c={{ ...contestFixture, endDate: inDays(3) }} />)
    expect(screen.getByText('Koniec za 3 dni')).toBeInTheDocument()
    rerender(<DetailsHeaderCard c={{ ...contestFixture, endDate: inDays(4) }} />)
    expect(screen.queryByText(/Koniec za|Kończy się/)).not.toBeInTheDocument()
  })

  it('omits the daily limit tile without a daily limit', () => {
    render(<DetailsHeaderCard c={{ ...contestFixture, entryLimitPerDay: null, entryLimitTotal: null }} />)
    expect(screen.queryByText('Limit na dziś')).not.toBeInTheDocument()
    expect(screen.getByText('Limit zgłoszeń')).toBeInTheDocument()
  })

  it('shows the prize count next to the prize', () => {
    render(<DetailsHeaderCard c={{ ...contestFixture, prizeDescription: 'Rower', prizeCount: 3 }} />)
    expect(screen.getByText(/Rower/)).toHaveTextContent('3 szt.')
  })
})
