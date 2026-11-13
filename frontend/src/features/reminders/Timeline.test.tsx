import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ContestCardDto, Reminder } from '../../api/types'
import RemindersPage from '../../pages/RemindersPage'
import { renderApp, stubApi } from '../../test/render'

afterEach(() => vi.unstubAllGlobals())

const contest = (id: string, name: string, extra: Partial<ContestCardDto> = {}): ContestCardDto => ({
  id, name, organizer: null, icon: null, type: 'Purchase', prizeDescription: null, prizeValue: null,
  startDate: '2026-11-01', endDate: '2026-11-14', resultsDate: null, status: 'Planned', effectiveStatus: 'Planned',
  entryCount: 0, entriesToday: 0, entryLimitTotal: null, entryLimitPerDay: null, url: null, rulesUrl: null,
  purchasesTotal: 0, purchasesBought: 0, firstOpenPurchase: null, stores: [], firstProofLocation: null, win: null,
  createdAt: '2026-11-01T00:00:00Z', ...extra,
} as ContestCardDto)

const base = { itemId: null, itemText: null, confirmationCodes: [], winSteps: [], proofLocation: null, proofNote: null, boughtPurchases: [] }

const laureate: Reminder = {
  ...base, kind: 'LaureateDeadline', dueDate: '2026-11-16',
  contest: contest('c1', 'Colgate', {
    rulesUrl: 'https://example.com/rules',
    win: { prizeWon: 'Karta podarunkowa', prizeValue: 500, laureateDeadline: '2026-11-16', laureateDataSent: false, stepsDone: 0, stepsTotal: 1 },
  }),
  winSteps: [{ id: 's1', text: 'Odeślij oświadczenie', done: false }],
}
const results: Reminder = {
  ...base, kind: 'ResultsDue', dueDate: '2026-11-13', contest: contest('c2', 'Tchibo', { url: 'https://example.com/wyniki' }),
  confirmationCodes: ['KOD-1', 'KOD-2'],
}
const ending: Reminder = {
  ...base, kind: 'EndingSoon', dueDate: '2026-11-14', contest: contest('c3', 'Wedel'),
  boughtPurchases: [{ product: 'Czekolada', quantity: '2 szt.', store: 'Biedronka', note: null }],
}
const ended: Reminder = { ...base, kind: 'Ended', dueDate: '2026-11-10', contest: contest('c4', 'Zakończony') }
const disposal: Reminder = {
  ...base, kind: 'ProofDisposable', dueDate: '2026-11-01', contest: contest('c5', 'Danone'),
  itemId: 'p1', itemText: 'Paragon', proofLocation: 'Pudełko na biurku', proofNote: 'Z wieczkiem',
}

const all = [disposal, ended, ending, results, laureate]

type Call = [unknown, RequestInit | undefined]
const findCall = (calls: Call[], suffix: string, method: string) =>
  calls.find(([u, i]) => String(u).endsWith(suffix) && i?.method === method)
const bodyOf = (c: Call | undefined) => JSON.parse(String(c![1]!.body))

describe('RemindersPage timeline', () => {
  it('renders header, pills with counts and sections in order', async () => {
    stubApi({ '/api/reminders': all, '/api/proofs': [{}, {}, {}] })
    renderApp(<RemindersPage />)
    expect(await screen.findByRole('heading', { name: 'Wymaga Twojej uwagi' })).toBeInTheDocument()
    expect(await screen.findByText('5 alertów')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Wszystkie\s*5/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Kończące się\s*2/ })).toBeInTheDocument()
    const names = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(names).toEqual(['Colgate', 'Tchibo', 'Wedel', 'Zakończony', 'Danone'])
    expect(await screen.findByRole('link', { name: /Schowek dowodów — 3 przechowywanych/ })).toHaveAttribute('href', '/dowody')
  })

  it('filters by pill', async () => {
    stubApi({ '/api/reminders': all, '/api/proofs': [] })
    renderApp(<RemindersPage />)
    await userEvent.setup().click(await screen.findByRole('button', { name: /Wyniki/ }))
    expect(screen.getByText('Tchibo')).toBeInTheDocument()
    expect(screen.queryByText('Colgate')).not.toBeInTheDocument()
  })

  it('shows empty state', async () => {
    stubApi({ '/api/reminders': [], '/api/proofs': [] })
    renderApp(<RemindersPage />)
    expect(await screen.findByText('Nic pilnego. Wszystko pod kontrolą!')).toBeInTheDocument()
  })

  it('laureate card toggles step and marks data sent', async () => {
    const fetchMock = stubApi({ '/api/reminders': [laureate], '/api/proofs': [], '/api/win-steps/s1': null, '/api/contests/c1/win': null })
    renderApp(<RemindersPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: /Odeślij oświadczenie/ }))
    await waitFor(() => expect(bodyOf(findCall(fetchMock.mock.calls as unknown as Call[], '/api/win-steps/s1', 'PATCH'))).toEqual({ value: true }))
    expect(screen.getByText(/500,00/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Regulamin' })).toHaveAttribute('href', 'https://example.com/rules')
    await user.click(screen.getByRole('button', { name: 'Oznacz jako dane wysłane' }))
    await waitFor(() =>
      expect(bodyOf(findCall(fetchMock.mock.calls as unknown as Call[], '/api/contests/c1/win', 'PUT'))).toEqual({
        prizeWon: 'Karta podarunkowa', prizeValue: 500, laureateDeadline: '2026-11-16', laureateDataSent: true,
      }),
    )
  })

  it('results card copies confirmation code', async () => {
    stubApi({ '/api/reminders': [results], '/api/proofs': [] })
    renderApp(<RemindersPage />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Kopiuj kod KOD-2' }))
    expect(await navigator.clipboard.readText()).toBe('KOD-2')
    expect(await screen.findByText('Skopiowano')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /strony konkursu/ })).toHaveAttribute('href', 'https://example.com/wyniki')
  })

  it('ending card links to entry form and camera', async () => {
    stubApi({ '/api/reminders': [ending], '/api/proofs': [] })
    renderApp(<RemindersPage />)
    expect(await screen.findByRole('link', { name: 'Dodaj zgłoszenie' })).toHaveAttribute('href', '/konkursy/c3?zgloszenie=1')
    expect(screen.getByRole('link', { name: 'Zrób zdjęcie paragonu' })).toHaveAttribute('href', '/konkursy/c3?zgloszenie=1&paragon=1')
    expect(screen.getByText(/Czekolada/)).toBeInTheDocument()
  })

  it('ended card changes status', async () => {
    const fetchMock = stubApi({ '/api/reminders': [ended], '/api/proofs': [], '/api/contests/c4/status': null })
    renderApp(<RemindersPage />)
    await userEvent.setup().click(await screen.findByRole('button', { name: 'Przegrana' }))
    await waitFor(() => expect(bodyOf(findCall(fetchMock.mock.calls as unknown as Call[], '/api/contests/c4/status', 'PATCH'))).toEqual({ status: 'Lost' }))
  })

  it('disposal card discards proof', async () => {
    const fetchMock = stubApi({ '/api/reminders': [disposal], '/api/proofs': [], '/api/proof-items/p1': null })
    renderApp(<RemindersPage />)
    expect(await screen.findByText('Pudełko na biurku')).toBeInTheDocument()
    expect(screen.getByText('Z wieczkiem')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Wyrzucono' }))
    await waitFor(() => expect(bodyOf(findCall(fetchMock.mock.calls as unknown as Call[], '/api/proof-items/p1', 'PATCH'))).toEqual({ value: true }))
  })

  it('no fabricated copy', async () => {
    stubApi({ '/api/reminders': all, '/api/proofs': [] })
    const { container } = renderApp(<RemindersPage />)
    await screen.findByText('Colgate')
    expect(container.textContent).not.toMatch(/§|reklamac|rezerwow|audyt/i)
  })
})
