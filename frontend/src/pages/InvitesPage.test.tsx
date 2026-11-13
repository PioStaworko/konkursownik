import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp, stubApi } from '../test/render'
import InvitesPage from './InvitesPage'

afterEach(() => vi.unstubAllGlobals())

describe('InvitesPage', () => {
  it('lists invites with status and generates a code', async () => {
    const fetchMock = stubApi({
      '/api/invites': [
        { code: 'AAA', createdAt: '2026-11-01', used: false },
        { code: 'BBB', createdAt: '2026-11-01', used: true },
      ],
    })
    renderApp(<InvitesPage />)
    expect(await screen.findByText('AAA')).toBeInTheDocument()
    expect(screen.getByText('wolny')).toBeInTheDocument()
    expect(screen.getByText('zużyty')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Wygeneruj kod' }))
    expect(fetchMock).toHaveBeenCalledWith('/api/invites', expect.objectContaining({ method: 'POST' }))
  })

  it('copies a code and shows Skopiowano', async () => {
    stubApi({ '/api/invites': [{ code: 'AAA', createdAt: '2026-11-01', used: false }] })
    const user = userEvent.setup()
    renderApp(<InvitesPage />)
    await user.click(await screen.findByRole('button', { name: 'Kopiuj' }))
    expect(await screen.findByRole('button', { name: 'Skopiowano' })).toBeInTheDocument()
  })
})
