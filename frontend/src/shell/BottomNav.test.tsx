import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp, stubApi } from '../test/render'
import BottomNav from './BottomNav'

afterEach(() => vi.unstubAllGlobals())

const reminders = (n: number) => Array.from({ length: n }, (_, i) => ({ kind: 'EndingSoon', itemId: `r${i}` }))
const shopping = [{ store: 'A', items: [{ id: 'i1' }, { id: 'i2' }] }]

function contest(id: string, name: string, endDate: string, extra: Record<string, unknown> = {}) {
  return { id, name, endDate, entriesToday: 0, entryCount: 0, entryLimitPerDay: null, ...extra }
}

describe('BottomNav', () => {
  it('nav order and badges', async () => {
    stubApi({ '/api/reminders': reminders(3), '/api/shopping-list': shopping })
    renderApp(<BottomNav />)
    const nav = screen.getByRole('navigation', { name: 'Nawigacja główna' })
    const links = within(nav).getAllByRole('link')
    expect(links.map((l) => l.textContent?.replace(/\d+$/, ''))).toEqual(['Konkursy', 'Pilne', 'Zakupy', 'Statystyki'])
    expect(await within(nav).findByLabelText('3 pilnych')).toHaveTextContent('3')
    expect(await within(nav).findByLabelText('2 do kupienia')).toHaveTextContent('2')
    expect(within(nav).getByRole('button', { name: 'Dodaj konkurs lub zgłoszenie' })).toBeInTheDocument()
  })

  it('pilne badge hidden at zero', async () => {
    const fetchMock = stubApi({ '/api/reminders': [], '/api/shopping-list': [] })
    renderApp(<BottomNav />)
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3))
    expect(screen.queryByLabelText(/pilnych/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/do kupienia/)).not.toBeInTheDocument()
  })

  it('add sheet → new entry picker lists only open contests sorted by end date', async () => {
    stubApi({
      '/api/reminders': [],
      '/api/shopping-list': [],
      '/api/contests': [
        contest('c1', 'Późny', '2999-12-31', { entriesToday: 1, entryLimitPerDay: 3 }),
        contest('c2', 'Zakończony', '2000-01-01'),
        contest('c3', 'Wczesny', '2998-01-01', { entriesToday: 2 }),
      ],
    })
    renderApp(<BottomNav />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dodaj konkurs lub zgłoszenie' }))
    await user.click(screen.getByRole('button', { name: /Nowe zgłoszenie/ }))
    const items = await screen.findAllByRole('button', { name: /Wczesny|Późny|Zakończony/ })
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('Wczesny')
    expect(items[0]).toHaveTextContent('dziś 2')
    expect(items[0]).not.toHaveTextContent('/')
    expect(items[1]).toHaveTextContent('Późny')
    expect(items[1]).toHaveTextContent('dziś 1/3')
  })

  it('picker navigates with ?zgloszenie=1', async () => {
    stubApi({
      '/api/reminders': [],
      '/api/shopping-list': [],
      '/api/contests': [contest('c1', 'Loteria', '2999-12-31')],
    })
    renderApp(<BottomNav />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dodaj konkurs lub zgłoszenie' }))
    await user.click(screen.getByRole('button', { name: /Nowe zgłoszenie/ }))
    await user.click(await screen.findByRole('button', { name: /Loteria/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/konkursy/c1?zgloszenie=1')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('new contest goes to /konkursy/nowy', async () => {
    stubApi({ '/api/reminders': [], '/api/shopping-list': [] })
    renderApp(<BottomNav />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Dodaj konkurs lub zgłoszenie' }))
    await user.click(screen.getByRole('button', { name: /Nowy konkurs/ }))
    expect(screen.getByTestId('location')).toHaveTextContent('/konkursy/nowy')
  })
})
