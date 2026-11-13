import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PhotoTile from './PhotoTile'

afterEach(() => vi.unstubAllGlobals())

function renderTile() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PhotoTile photo={{ id: 'p1', label: 'Packaging', sizeBytes: 2048 }} />
    </QueryClientProvider>,
  )
}

describe('PhotoTile', () => {
  it('shows label, size, privacy note and links to the full image', () => {
    renderTile()
    expect(screen.getByText('Opakowanie')).toBeInTheDocument()
    expect(screen.getByText('2,0 KB')).toBeInTheDocument()
    expect(screen.getByText('Widoczne tylko dla Ciebie')).toBeInTheDocument()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/api/photos/p1')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('deletes only after confirmation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    const confirm = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
    vi.stubGlobal('confirm', confirm)
    renderTile()
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Usuń zdjęcie' }))
    expect(fetchMock).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Usuń zdjęcie' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/photos/p1', expect.objectContaining({ method: 'DELETE' })))
  })
})
