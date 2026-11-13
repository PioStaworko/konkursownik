/* oxlint-disable react/only-export-components */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter, useLocation } from 'react-router'
import { vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'

/** Stubs fetch: first route whose key is contained in the URL wins; unknown URLs answer 404. */
export function stubApi(routes: Record<string, unknown>) {
  const mock = vi.fn((input: RequestInfo | URL) => {
    const url = String(input)
    const key = Object.keys(routes).find((k) => url.includes(k))
    if (key === undefined) return Promise.resolve(new Response(null, { status: 404 }))
    const body = routes[key]
    return Promise.resolve(body === null ? new Response(null, { status: 204 }) : new Response(JSON.stringify(body)))
  })
  vi.stubGlobal('fetch', mock)
  return mock
}

export function LocationProbe() {
  const l = useLocation()
  return <p data-testid="location">{l.pathname + l.search}</p>
}

export function renderApp(ui: ReactElement, initialEntry = '/') {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <AuthProvider>
          {ui}
          <LocationProbe />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
