import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WinDto } from '../api/types'
import WinForm from './WinForm'

afterEach(() => vi.unstubAllGlobals())

describe('WinForm', () => {
  it('win_form_preserves_steps', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const win: WinDto = {
      prizeWon: 'Rower',
      prizeValue: 1000,
      laureateDeadline: null,
      laureateDataSent: false,
      steps: [
        { id: 's1', text: 'Oświadczenie laureata', done: true },
        { id: 's2', text: 'Skan paragonu', done: false },
      ],
    }
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <WinForm contestId="c1" win={win} onDone={() => {}} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    const value = screen.getByLabelText('Wartość nagrody')
    await user.clear(value)
    await user.type(value, '1500')
    await user.click(screen.getByRole('button', { name: 'Zapisz wygraną' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string)
    expect(body.prizeValue).toBe(1500)
    expect(body.steps).toEqual(win.steps)
  })
})
