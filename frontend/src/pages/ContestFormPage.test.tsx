import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContestDto } from '../api/types'
import ContestFormPage from './ContestFormPage'

beforeEach(() => localStorage.clear())
afterEach(() => vi.unstubAllGlobals())

function renderPage(path = '/konkursy/nowy') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/konkursy/nowy" element={<ContestFormPage />} />
          <Route path="/konkursy/:id/edycja" element={<ContestFormPage />} />
          <Route path="/konkursy/:id" element={<p>Szczegóły konkursu</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })

/** Answers GET /api/features itself; `calls()` lists every other request. */
function stub(handler: (url: string, init?: RequestInit) => Response, ai = false) {
  const mock = vi.fn((url: string, init?: RequestInit) =>
    Promise.resolve(url === '/api/features' ? json({ aiExtraction: ai }) : handler(url, init)),
  )
  vi.stubGlobal('fetch', mock)
  return { mock, calls: () => mock.mock.calls.filter(([u]) => u !== '/api/features') }
}

async function fillBasics(user: ReturnType<typeof userEvent.setup>, start = '2026-11-01', end = '2026-11-10') {
  await user.type(screen.getByLabelText('Nazwa'), 'Konkurs')
  await user.type(screen.getByLabelText('Data startu'), start)
  await user.type(screen.getByLabelText('Data końca'), end)
}

describe('ContestFormPage', () => {
  it('blocks end before start', async () => {
    const api = stub(() => json({}))
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user, '2026-11-10', '2026-11-01')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Data końca nie może być przed datą startu')).toBeInTheDocument()
    expect(api.calls()).toHaveLength(0)
  })

  it('submits purchases with store and no prizes by default, then navigates', async () => {
    const api = stub(() => json({ id: 'abc' }, 201))
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: 'Dodaj produkt' }))
    await user.type(screen.getByLabelText('Produkt 1'), 'Mleko')
    await user.type(screen.getByLabelText('Sklep 1'), 'Biedronka')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const [url, init] = api.calls()[0] as unknown as [string, RequestInit]
    expect(url).toBe('/api/contests')
    expect(init.method).toBe('POST')
    const body = JSON.parse(init.body as string)
    expect(body.prizes).toEqual([])
    expect(body).not.toHaveProperty('prizeValue')
    expect(body.purchases).toEqual([
      { id: null, product: 'Mleko', store: 'Biedronka', quantity: null, bought: false, note: null },
    ])
    expect(body.icon).toBeNull()
  })

  it('shows server validation errors at top', async () => {
    stub(() => json({ errors: { Name: ['Nazwa jest wymagana (maks. 200 znaków).'] } }, 400))
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Nazwa jest wymagana (maks. 200 znaków).')
  })

  it('edit PUTs full dto preserving child ids', async () => {
    const contest: ContestDto = {
      id: 'c1', name: 'Stary', organizer: null, url: null, rulesUrl: null, type: 'Lottery',
      startDate: '2026-11-01', endDate: '2026-11-30',
      resultsDate: null, resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null,
      status: 'Planned', notes: null, icon: null,
      tasks: [{ id: 't1', text: 'Krok', done: true }],
      purchases: [{ id: 'p1', product: 'Mleko', store: null, quantity: null, bought: true, note: null }],
      proofs: [{ id: 'r1', what: 'Paragon', keepUntil: null, location: null, discarded: true, note: null }],
      prizes: [{ id: 'z1', name: 'Rower', value: 10, count: null }],
      effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
    }
    const api = stub((_, init) => (init?.method === 'PUT' ? new Response(null, { status: 204 }) : json(contest)))
    renderPage('/konkursy/c1/edycja')
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Nazwa')
    await waitFor(() => expect(name).toHaveValue('Stary'))
    await user.clear(name)
    await user.type(name, 'Nowy')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const put = api.calls().find(([, i]) => i?.method === 'PUT')!
    expect(put[0]).toBe('/api/contests/c1')
    const body = JSON.parse(put[1]!.body as string)
    expect(body.name).toBe('Nowy')
    expect(body.prizes).toEqual([{ id: 'z1', name: 'Rower', value: 10, count: null }])
    expect(body.tasks).toEqual([{ id: 't1', text: 'Krok', done: true }])
    expect(body.purchases[0]).toMatchObject({ id: 'p1', bought: true })
    expect(body.proofs[0]).toMatchObject({ id: 'r1', discarded: true })
    expect(body).not.toHaveProperty('entries')
  })

  it('edit_preserves_icon_and_notes', async () => {
    const contest: ContestDto = {
      id: 'c1', name: 'Stary', organizer: null, url: null, rulesUrl: null, type: 'Lottery',
      startDate: '2026-11-01', endDate: '2026-11-30',
      resultsDate: null, resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null,
      status: 'Planned', notes: null, icon: 'coffee',
      tasks: [],
      purchases: [{ id: 'p1', product: 'Mleko', store: null, quantity: null, bought: false, note: 'Weź paragon papierowy' }],
      proofs: [{ id: 'r1', what: 'Paragon', keepUntil: null, location: null, discarded: false, note: 'Nie wyrzucać folii' }],
      prizes: [],
      effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
    }
    const api = stub((_, init) => (init?.method === 'PUT' ? new Response(null, { status: 204 }) : json(contest)))
    renderPage('/konkursy/c1/edycja')
    const user = userEvent.setup()
    const name = await screen.findByLabelText('Nazwa')
    await waitFor(() => expect(name).toHaveValue('Stary'))
    await user.clear(name)
    await user.type(name, 'Nowy')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    expect(await screen.findByText('Szczegóły konkursu')).toBeInTheDocument()
    const put = api.calls().find(([, i]) => i?.method === 'PUT')!
    const body = JSON.parse(put[1]!.body as string)
    expect(body.icon).toBe('coffee')
    expect(body.purchases[0].note).toBe('Weź paragon papierowy')
    expect(body.proofs[0].note).toBe('Nie wyrzucać folii')
  })

  it('icon picker selects icon into payload', async () => {
    const api = stub(() => json({ id: 'abc' }, 201))
    renderPage()
    const user = userEvent.setup()
    await fillBasics(user)
    const kawa = screen.getByRole('button', { name: 'Kawa' })
    expect(kawa).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('group', { name: 'Ikona' }).querySelectorAll('button')).toHaveLength(20)
    await user.click(kawa)
    expect(kawa).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Zapisz' }))
    await screen.findByText('Szczegóły konkursu')
    expect(JSON.parse(api.calls()[0][1]!.body as string).icon).toBe('coffee')
  })

  it('ai buttons hidden when feature disabled', async () => {
    const api = stub(() => json({}), false)
    renderPage()
    await waitFor(() => expect(api.mock).toHaveBeenCalledWith('/api/features', expect.anything()))
    expect(screen.queryByText('Wypełnij automatycznie')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Odczytaj' })).not.toBeInTheDocument()
  })

  const extraction = {
    name: 'Konkurs z linku', organizer: 'Org AI', url: null, rulesUrl: null, type: 'Creative', icon: 'coffee',
    prizeDescription: null, prizeValue: 1500.5, prizeCount: 2, startDate: '2026-11-02', endDate: '2026-11-20',
    resultsDate: null, resultsCheckNote: null, entryLimitPerDay: 1, entryLimitTotal: null,
    tasks: ['Dodaj opis'], purchases: [{ product: 'Kawa', store: 'Lidl', quantity: '2 szt.', note: 'promocja' }],
    proofs: [{ what: 'Paragon', keepUntil: '2026-12-31', note: 'folia' }], notes: null,
  }

  it('fills the form from a link, shows notice once, badges disappear after edit', async () => {
    const api = stub((url) => (url === '/api/ai/contest' ? json(extraction) : json({})), true)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/konkurs')
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(screen.getByText('Zdjęcie lub plik zostanie wysłany do Google Gemini w celu odczytania danych.')).toBeInTheDocument()
    expect(api.calls()).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Rozumiem' }))
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Konkurs z linku'))
    expect(localStorage.getItem('konkursownik-ai-notice')).toBe('1')
    const [url, init] = api.calls()[0] as [string, RequestInit]
    expect(url).toBe('/api/ai/contest')
    expect(JSON.parse(init.body as string)).toEqual({ url: 'https://x.pl/konkurs' })
    expect(screen.getByLabelText('Typ')).toHaveValue('Creative')
    expect(screen.getByLabelText('Krok 1')).toHaveValue('Dodaj opis')
    expect(screen.getByLabelText('Notatka pozycji 1')).toHaveValue('promocja')
    expect(screen.getByLabelText('Notatka dowodu 1')).toHaveValue('folia')
    expect(screen.getByRole('button', { name: 'Kawa' })).toHaveAttribute('aria-pressed', 'true')
    const before = screen.getAllByText('AI — sprawdź').length
    expect(before).toBeGreaterThanOrEqual(8)
    await user.type(screen.getByLabelText('Nazwa'), '!')
    expect(screen.getAllByText('AI — sprawdź')).toHaveLength(before - 1)
    // second read: no notice
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(screen.queryByRole('button', { name: 'Rozumiem' })).not.toBeInTheDocument()
  })

  it('page_unreadable shows file fallback', async () => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    stub((url) => (url === '/api/ai/contest' ? json({ error: 'page_unreadable' }, 422) : json({})), true)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/k')
    expect(screen.getByRole('button', { name: 'Wgraj PDF / zrzut' })).not.toHaveAttribute('data-attention')
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(await screen.findByText('Nie mogę odczytać tej strony. Wgraj regulamin (PDF) albo zrzut ekranu.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Wgraj PDF / zrzut' })).toHaveAttribute('data-attention', 'true')
  })

  it('uploads a file as multipart', async () => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    const api = stub((url) => (url === '/api/ai/contest' ? json(extraction) : json({})), true)
    renderPage()
    const user = userEvent.setup()
    const input = await screen.findByLabelText('Plik regulaminu')
    await user.upload(input, new File(['%PDF'], 'r.pdf', { type: 'application/pdf' }))
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Konkurs z linku'))
    const body = (api.calls()[0][1] as RequestInit).body as FormData
    expect(body.get('file')).toBeInstanceOf(File)
  })

  it.each([
    [503, 'ai_unavailable', 'Odczyt AI jest teraz niedostępny'],
    [429, 'rate_limited', 'Limit odczytów na tę godzinę wyczerpany'],
    [429, 'ai_busy', 'Za dużo odczytów naraz — spróbuj za minutę'],
    [422, 'extraction_failed', 'Nie udało się odczytać — uzupełnij ręcznie'],
  ])('%i %s shows message, form values intact', async (status, code, message) => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    stub((url) => (url === '/api/ai/contest' ? json({ error: code }, status) : json({})), true)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Nazwa'), 'Mój konkurs')
    await user.type(screen.getByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/k')
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    expect(await screen.findByText(message)).toBeInTheDocument()
    expect(screen.getByLabelText('Nazwa')).toHaveValue('Mój konkurs')
  })

  it('edit mode asks before overwriting and keeps what AI left empty', async () => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    const contest: ContestDto = {
      id: 'c1', name: 'Stary', organizer: 'Mój org', url: null, rulesUrl: null, type: 'Lottery',
      startDate: '2026-11-01', endDate: '2026-11-30',
      resultsDate: null, resultsCheckNote: null, entryLimitPerDay: null, entryLimitTotal: null,
      status: 'Planned', notes: null, icon: null, tasks: [], purchases: [], proofs: [], prizes: [],
      effectiveStatus: 'Planned', entries: [], win: null, entriesToday: 0,
    }
    stub(
      (url) =>
        url === '/api/ai/contest'
          ? json({ ...extraction, organizer: null, tasks: [], purchases: [], proofs: [] })
          : json(contest),
      true,
    )
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    renderPage('/konkursy/c1/edycja')
    const user = userEvent.setup()
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Stary'))
    await user.type(await screen.findByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/k')
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Konkurs z linku'))
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/^Nadpisać \d+ pól danymi z AI\?$/))
    expect(screen.getByLabelText('Organizator')).toHaveValue('Mój org')
  })

  it('keeps values typed while the read is in flight', async () => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    let release: (r: Response) => void = () => {}
    const gate = new Promise<Response>((r) => (release = r))
    const mock = vi.fn((url: string) =>
      url === '/api/features' ? Promise.resolve(json({ aiExtraction: true })) : url === '/api/ai/contest' ? gate : Promise.resolve(json({})),
    )
    vi.stubGlobal('fetch', mock)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/k')
    await user.click(screen.getByRole('button', { name: 'Odczytaj' }))
    await user.type(screen.getByLabelText('Notatki'), 'moja notatka')
    release(json(extraction))
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Konkurs z linku'))
    expect(screen.getByLabelText('Notatki')).toHaveValue('moja notatka')
  })

  it('Enter in the link field reads the link and never saves the contest', async () => {
    localStorage.setItem('konkursownik-ai-notice', '1')
    const api = stub((url) => (url === '/api/ai/contest' ? json(extraction) : json({ id: 'z' }, 201)), true)
    renderPage()
    const user = userEvent.setup()
    await user.type(await screen.findByLabelText('Link do konkursu lub regulaminu'), 'https://x.pl/k{Enter}')
    await waitFor(() => expect(screen.getByLabelText('Nazwa')).toHaveValue('Konkurs z linku'))
    const calls = api.calls().map(([u, i]) => `${i?.method ?? 'GET'} ${u}`)
    expect(calls).toEqual(['POST /api/ai/contest'])
  })
})
