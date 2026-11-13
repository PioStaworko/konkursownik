import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import EntryForm from './EntryForm'

afterEach(() => vi.unstubAllGlobals())

describe('EntryForm', () => {
  it('sends the store field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'e1' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <EntryForm contestId="c1" contestType="Lottery" onDone={() => {}} />
      </QueryClientProvider>,
    )
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Sklep'), ' Biedronka ')
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(JSON.parse(fetchMock.mock.calls[0][1].body as string).store).toBe('Biedronka')
  })
})
