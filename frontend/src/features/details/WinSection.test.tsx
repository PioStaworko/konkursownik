import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PrizeDto, WinDto } from '../../api/types'
import WinSection from './WinSection'

afterEach(() => vi.unstubAllGlobals())

const win: WinDto = {
  prizeWon: 'Rower',
  prizeValue: 1000,
  laureateDeadline: '2026-12-01',
  laureateDataSent: false,
  steps: [
    { id: 's1', text: 'Oświadczenie laureata', done: true },
    { id: 's2', text: 'Skan paragonu', done: false },
  ],
}

const prizes: PrizeDto[] = [
  { id: 'z1', name: 'Rower', value: 1000, count: null },
  { id: 'z2', name: 'Bon', value: null, count: 5 },
]

function renderWin(w: WinDto | null, p: PrizeDto[] = prizes) {
  const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WinSection contestId="c1" win={w} prizes={p} />
    </QueryClientProvider>,
  )
  return { fetchMock, user: userEvent.setup() }
}

describe('WinSection', () => {
  it('shows prize, deadline and steps, and toggles a step via win-steps', async () => {
    const { fetchMock, user } = renderWin(win)
    expect(screen.getByText('Rower')).toBeInTheDocument()
    expect(screen.getByText(/01\.12\.2026/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Skan paragonu' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/win-steps/s2')
    expect(init.method).toBe('PATCH')
    expect(JSON.parse(init.body as string)).toEqual({ value: true })
  })

  it('save preserves steps when only the value changes', async () => {
    const { fetchMock, user } = renderWin(win)
    await user.click(screen.getByRole('button', { name: 'Edytuj wygraną' }))
    const value = screen.getByLabelText('Wartość nagrody')
    await user.clear(value)
    await user.type(value, '1500')
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.prizeValue).toBe(1500)
    expect(body.steps).toEqual(win.steps)
  })

  it('sends the full edited steps list (rename, remove, add)', async () => {
    const { fetchMock, user } = renderWin(win)
    await user.click(screen.getByRole('button', { name: 'Edytuj wygraną' }))
    const first = screen.getByLabelText('Krok laureata 1')
    await user.clear(first)
    await user.type(first, 'Nowy tekst')
    await user.click(screen.getByRole('button', { name: 'Usuń krok laureata 2' }))
    await user.type(screen.getByLabelText('Nowy krok laureata'), 'Wyślij dane')
    await user.click(screen.getByRole('button', { name: 'Dodaj krok laureata' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).steps).toEqual([
      { id: 's1', text: 'Nowy tekst', done: true },
      { id: null, text: 'Wyślij dane', done: false },
    ])
  })

  it('marks data as sent', async () => {
    const { fetchMock, user } = renderWin(win)
    await user.click(screen.getByRole('button', { name: 'Edytuj wygraną' }))
    await user.click(screen.getByLabelText('Dane wysłane'))
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).laureateDataSent).toBe(true)
  })

  it('save keeps prizeId and steps', async () => {
    const { fetchMock, user } = renderWin({ ...win, prizeId: 'z1' })
    await user.click(screen.getByRole('button', { name: 'Edytuj wygraną' }))
    expect(screen.getByLabelText('Nagroda')).toHaveValue('z1')
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.prizeId).toBe('z1')
    expect(body.steps).toEqual(win.steps)
  })

  it('win select fills name and value and sends prizeId; Inna clears prizeId', async () => {
    const { fetchMock, user } = renderWin(null)
    await user.click(screen.getByRole('button', { name: 'Dodaj wygraną' }))
    const select = screen.getByLabelText('Nagroda')
    expect(screen.getByRole('option', { name: /^Rower \(/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Bon' })).toBeInTheDocument()
    await user.selectOptions(select, 'z1')
    expect(screen.getByLabelText('Wygrana nagroda')).toHaveValue('Rower')
    expect(screen.getByLabelText('Wartość nagrody')).toHaveValue('1000')
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string)).toMatchObject({ prizeId: 'z1', prizeWon: 'Rower', prizeValue: 1000 })
  })

  it('Inna clears prizeId and keeps the typed text', async () => {
    const { fetchMock, user } = renderWin({ ...win, prizeId: 'z1' })
    await user.click(screen.getByRole('button', { name: 'Edytuj wygraną' }))
    await user.selectOptions(screen.getByLabelText('Nagroda'), 'Inna')
    expect(screen.getByLabelText('Wygrana nagroda')).toHaveValue('Rower')
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.prizeId).toBeNull()
    expect(body.prizeWon).toBe('Rower')
  })

  it('without a win offers adding one and requires the prize name', async () => {
    const { fetchMock, user } = renderWin(null)
    await user.click(screen.getByRole('button', { name: 'Dodaj wygraną' }))
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    expect(await screen.findByText('Podaj, co zostało wygrane')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
