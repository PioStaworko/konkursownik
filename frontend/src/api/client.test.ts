import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiFetch } from './client'

afterEach(() => vi.unstubAllGlobals())

describe('apiFetch', () => {
  it('throws ApiError with status and code', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'invalid_invite' }), { status: 400 })),
    )
    const err = await apiFetch('/api/x').catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 400, code: 'invalid_invite' })
  })

  it('returns undefined for 204', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 204 })))
    await expect(apiFetch('/api/x', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('returns undefined for 200 with empty body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 200 })))
    await expect(apiFetch('/api/auth/login', { method: 'POST' })).resolves.toBeUndefined()
  })

  it('sends same-origin credentials and a JSON body with content type', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 1 }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await apiFetch<{ ok: number }>('/api/x', { method: 'POST', body: JSON.stringify({ a: 1 }) })
    expect(result).toEqual({ ok: 1 })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.credentials).toBe('same-origin')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('does not force a JSON content type for FormData', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await apiFetch('/api/x', { method: 'POST', body: new FormData() })
    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(new Headers(init.headers).get('Content-Type')).toBeNull()
  })

  it('throws ApiError without code for non-JSON error bodies', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(apiFetch('/api/x')).rejects.toMatchObject({ status: 500, code: undefined })
  })
})
