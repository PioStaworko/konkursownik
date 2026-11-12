import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PhotoPicker from './PhotoPicker'

afterEach(() => vi.unstubAllGlobals())

function renderPicker() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <PhotoPicker entryId="e1" photoIds={['p1']} />
    </QueryClientProvider>,
  )
}

const fileInput = () => screen.getByLabelText('Dodaj zdjęcie') as HTMLInputElement

describe('PhotoPicker', () => {
  it('uses the camera-friendly accept/capture attributes', () => {
    renderPicker()
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp,image/heic')
    expect(fileInput()).toHaveAttribute('capture', 'environment')
  })

  it('rejects >10MB without upload', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    renderPicker()
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    await userEvent.setup().upload(fileInput(), big)
    expect(await screen.findByText('Zdjęcie jest za duże (maks. 10 MB)')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('uploads a file as multipart field "file"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 'p2' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    renderPicker()
    await userEvent.setup().upload(fileInput(), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/entries/e1/photos')
    expect((init.body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('maps unsupported_type API error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'unsupported_type' }), { status: 400 })),
    )
    renderPicker()
    await userEvent.setup().upload(fileInput(), new File(['x'], 'a.jpg', { type: 'image/jpeg' }))
    expect(await screen.findByText('Nieobsługiwany format zdjęcia')).toBeInTheDocument()
  })

  it('links thumbnails to the full image in a new tab', () => {
    renderPicker()
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/api/photos/p1')
    expect(link).toHaveAttribute('target', '_blank')
  })
})
