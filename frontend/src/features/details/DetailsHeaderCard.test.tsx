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
          prizes: [{ id: 'z1', name: 'Rower', value: 1000, count: null }],
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

  it('details list shows all prizes and hides the list when there are none', () => {
    const { rerender } = render(
      <DetailsHeaderCard
        c={{
          ...contestFixture,
          prizes: [
            { id: 'z1', name: 'Rower', value: 1000, count: 2 },
            { id: 'z2', name: 'Bon', value: null, count: null },
            { id: 'z3', name: 'Kubek', value: null, count: 5 },
          ],
        }}
      />,
    )
    const items = screen.getAllByRole('listitem').map((li) => li.textContent)
    expect(items[0]).toMatch(/^Rower — .*1\s?000.* ×2$/)
    expect(items[1]).toBe('Bon')
    expect(items[2]).toBe('Kubek ×5')
    rerender(<DetailsHeaderCard c={{ ...contestFixture, prizes: [] }} />)
    expect(screen.queryByText('Nagrody:')).not.toBeInTheDocument()
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
    render(<DetailsHeaderCard c={{ ...contestFixture, prizes: [{ id: 'z1', name: 'Rower', value: null, count: 3 }] }} />)
    expect(screen.getByText(/Rower/)).toHaveTextContent('Rower ×3')
  })
})
