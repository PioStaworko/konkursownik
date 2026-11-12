export class ApiError extends Error {
  status: number
  code?: string
  errors?: Record<string, string[]>

  constructor(status: number, code?: string, errors?: Record<string, string[]>) {
    super(code ?? `HTTP ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.errors = errors
  }
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body != null && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  if (!res.ok) {
    let code: string | undefined
    let errors: Record<string, string[]> | undefined
    try {
      const body: unknown = await res.json()
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        code = body.error
      }
      if (body && typeof body === 'object' && 'errors' in body && body.errors && typeof body.errors === 'object') {
        errors = body.errors as Record<string, string[]>
      }
    } catch {
      // body is empty or not JSON
    }
    throw new ApiError(res.status, code, errors)
  }
  if (res.status === 204) return undefined as T
  const text = await res.text()
  return (text ? JSON.parse(text) : undefined) as T
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value)
}
