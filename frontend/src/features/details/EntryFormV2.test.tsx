import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestType } from '../../api/types'
import { todayInPoland } from '../../lib/format'
import EntryFormV2 from './EntryFormV2'

afterEach(() => vi.unstubAllGlobals())

function renderForm(type: ContestType = 'Lottery', extra: Partial<ComponentProps<typeof EntryFormV2>> = {}) {
  const onDone = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <EntryFormV2 contestId="c1" contestType={type} onDone={onDone} {...extra} />
    </QueryClientProvider>,
  )
  return { onDone, user: userEvent.setup() }
}

const created = (id: string) => new Response(JSON.stringify({ id }), { status: 201 })
const fileInput = () => screen.getByLabelText('Dodaj zdjęcie') as HTMLInputElement
const jpg = (name = 'a.jpg') => new File(['x'], name, { type: 'image/jpeg' })

describe('EntryFormV2', () => {
  it('marks receipt-filled fields with the AI badge and clears a badge when its field is edited', async () => {
    vi.stubGlobal('fetch', vi.fn())
    const { user } = renderForm('Lottery', {
      renderAi: (onExtracted) => (
        <button
          type="button"
          onClick={() => onExtracted({ receiptNumber: 'R-7', purchaseAmount: 9.9, store: 'Żabka', date: '2026-11-09' }, jpg('r.jpg'))}
        >
          Odczytaj
        </button>
      ),
    })
    expect(screen.queryByText('AI — sprawdź')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(screen.getAllByText('AI — sprawdź')).toHaveLength(4)
    await user.type(screen.getByLabelText('Kwota zakupu'), '0')
    expect(screen.getAllByText('AI — sprawdź')).toHaveLength(3)
    await user.type(screen.getByLabelText('Sklep'), 'x')
    await user.type(screen.getByLabelText('Numer paragonu'), 'x')
    expect(screen.getAllByText('AI — sprawdź')).toHaveLength(1)
  })


  it('saves store and photo label (photo uploaded after the entry)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(created('e1')).mockResolvedValueOnce(created('p1'))
    vi.stubGlobal('fetch', fetchMock)
    const { onDone, user } = renderForm()
    await user.type(screen.getByLabelText('Sklep'), ' Biedronka ')
    await user.type(screen.getByLabelText('Kwota zakupu'), '12,50')
    await user.upload(fileInput(), jpg())
    await user.selectOptions(screen.getByLabelText('Podpis zdjęcia a.jpg'), 'Opakowanie')
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const [entryUrl, entryInit] = fetchMock.mock.calls[0]
    expect(entryUrl).toBe('/api/contests/c1/entries')
    const body = JSON.parse(entryInit.body as string)
    expect(body).toMatchObject({ store: 'Biedronka', purchaseAmount: 12.5, date: todayInPoland(), answerText: null })
    const [photoUrl, photoInit] = fetchMock.mock.calls[1]
    expect(photoUrl).toBe('/api/entries/e1/photos')
    expect((photoInit.body as FormData).get('label')).toBe('Packaging')
    expect((photoInit.body as FormData).get('file')).toBeInstanceOf(File)
  })

  it('defaults the label to Paragon', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(created('e1')).mockResolvedValueOnce(created('p1'))
    vi.stubGlobal('fetch', fetchMock)
    const { onDone, user } = renderForm()
    await user.upload(fileInput(), jpg())
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect((fetchMock.mock.calls[1][1].body as FormData).get('label')).toBe('Receipt')
  })

  it('photo over 10MB rejected before upload', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { user } = renderForm()
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.jpg', { type: 'image/jpeg' })
    await user.upload(fileInput(), big)
    expect(await screen.findByText('Zdjęcie jest za duże (maks. 10 MB)')).toBeInTheDocument()
    expect(screen.queryByLabelText('Podpis zdjęcia big.jpg')).not.toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('accepts only jpeg/png/webp with no capture attribute', () => {
    renderForm()
    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
    expect(fileInput()).not.toHaveAttribute('capture')
  })

  it('maps unsupported_type from the API and keeps the saved entry for retry', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(created('e1'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: 'unsupported_type' }), { status: 400 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(created('p1'))
    vi.stubGlobal('fetch', fetchMock)
    const { onDone, user } = renderForm()
    await user.upload(fileInput(), jpg())
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    expect(await screen.findByText('Nieobsługiwany format zdjęcia')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    expect(fetchMock.mock.calls[2][0]).toBe('/api/entries/e1')
    expect(fetchMock.mock.calls[2][1].method).toBe('PUT')
  })

  it('hides the answer field for Lottery contests', () => {
    renderForm('Lottery')
    expect(screen.queryByLabelText('Treść odpowiedzi')).not.toBeInTheDocument()
  })

  it('shows the answer field for Creative contests', () => {
    renderForm('Creative')
    expect(screen.getByLabelText('Treść odpowiedzi')).toBeInTheDocument()
  })

  it('rejects an invalid amount', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { user } = renderForm()
    await user.type(screen.getByLabelText('Kwota zakupu'), 'abc')
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    expect(await screen.findByText('Nieprawidłowa kwota')).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('copies the confirmation code', async () => {
    const { user } = renderForm()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    await user.type(screen.getByLabelText('Kod potwierdzenia'), 'ABC-1')
    await user.click(screen.getByRole('button', { name: 'Kopiuj kod' }))
    expect(writeText).toHaveBeenCalledWith('ABC-1')
  })

  it('mounts the AI slot and applies extracted values with the file as a receipt photo', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(created('e1')).mockResolvedValueOnce(created('p1'))
    vi.stubGlobal('fetch', fetchMock)
    const { onDone, user } = renderForm('Lottery', {
      renderAi: (onExtracted) => (
        <button
          type="button"
          onClick={() => onExtracted({ receiptNumber: 'R-7', purchaseAmount: 9.9, store: 'Żabka', date: '2026-11-09' }, jpg('r.jpg'))}
        >
          Odczytaj
        </button>
      ),
    })
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(screen.getByLabelText('Numer paragonu')).toHaveValue('R-7')
    expect(screen.getByLabelText('Kwota zakupu')).toHaveValue('9,9')
    expect(screen.getByLabelText('Sklep')).toHaveValue('Żabka')
    expect(screen.getByLabelText('Data zgłoszenia')).toHaveValue('2026-11-09')
    expect(screen.getByLabelText('Podpis zdjęcia r.jpg')).toHaveValue('Receipt')
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('photo upload failure keeps entry and offers retry of the photo only', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(created('e1'))
      .mockResolvedValueOnce(new Response(null, { status: 500 }))
      .mockResolvedValueOnce(created('p1'))
    vi.stubGlobal('fetch', fetchMock)
    const { onDone, user } = renderForm()
    await user.upload(fileInput(), jpg())
    await user.click(screen.getByRole('button', { name: 'Zapisz zgłoszenie' }))
    expect(await screen.findByText('Nie udało się dodać zdjęcia')).toBeInTheDocument()
    expect(onDone).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    await waitFor(() => expect(onDone).toHaveBeenCalled())
    const urls = fetchMock.mock.calls.map(([u, i]) => `${i?.method} ${u}`)
    expect(urls).toEqual(['POST /api/contests/c1/entries', 'POST /api/entries/e1/photos', 'POST /api/entries/e1/photos'])
  })
})
