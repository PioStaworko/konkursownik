import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp, stubApi } from '../test/render'
import AppHeader from './AppHeader'

afterEach(() => vi.unstubAllGlobals())

describe('AppHeader', () => {
  it('shows brand and title', () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    renderApp(<AppHeader title="Konkursy" />)
    expect(screen.getByText('Konkursownik')).toBeInTheDocument()
    expect(screen.getByText('· Konkursy')).toBeInTheDocument()
  })

  it('back variant goes to the fallback when there is no history', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    renderApp(<AppHeader back title="Zaproszenia" />, '/zaproszenia')
    await userEvent.setup().click(screen.getByRole('button', { name: 'Wróć' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/')
    expect(screen.getByTestId('location')).not.toHaveTextContent('zaproszenia')
  })

  it('profile menu shows user name, opens invites, closes on Esc', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Profil' }))
    expect(await screen.findByText('ania')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByText('ania')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Profil' }))
    await user.click(screen.getByRole('link', { name: 'Zaproszenia' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/zaproszenia')
    expect(screen.queryByText('ania')).not.toBeInTheDocument()
  })

  it('profile menu hides Zaproszenia for non-admin', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: false } })
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Profil' }))
    expect(await screen.findByText('ania')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Zaproszenia' })).not.toBeInTheDocument()
  })

  it('profile menu closes on outside click', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Profil' }))
    await user.click(document.body)
    expect(screen.queryByText('ania')).not.toBeInTheDocument()
  })

  it('profile menu logout clears user and goes to /login', async () => {
    let loggedOut = false
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      if (String(input).endsWith('/api/auth/logout')) {
        loggedOut = true
        return Promise.resolve(new Response(null, { status: 204 }))
      }
      return Promise.resolve(
        loggedOut ? new Response(null, { status: 401 }) : new Response(JSON.stringify({ userName: 'ania', isAdmin: true })),
      )
    })
    vi.stubGlobal('fetch', fetchMock)
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Profil' }))
    await user.click(await screen.findByRole('button', { name: 'Wyloguj' }))
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/login'))
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/logout', expect.objectContaining({ method: 'POST' }))
  })

  it('theme toggle switches theme and persists it', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    localStorage.removeItem('konkursownik-theme')
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Zmień motyw' }))
    expect(localStorage.getItem('konkursownik-theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    await user.click(screen.getByRole('button', { name: 'Zmień motyw' }))
    expect(localStorage.getItem('konkursownik-theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('Escape closes the profile menu and returns focus to the trigger', async () => {
    stubApi({ '/api/auth/me': { userName: 'ania', isAdmin: true } })
    renderApp(<AppHeader title="Pilne" />)
    const user = userEvent.setup()
    const trigger = await screen.findByRole('button', { name: 'Profil' })
    await user.click(trigger)
    await user.keyboard('{Escape}')
    expect(screen.queryByText('ania')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(trigger).not.toHaveAttribute('aria-haspopup')
  })
})
