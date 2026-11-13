import { ApiError } from '../../api/client'

export const PAGE_UNREADABLE = 'Nie mogę odczytać tej strony. Wgraj regulamin (PDF) albo zrzut ekranu.'

export function aiErrorMessage(err: unknown, subject: 'receipt' | 'contest' = 'contest'): string {
  if (err instanceof ApiError) {
    if (err.code === 'page_unreadable') return PAGE_UNREADABLE
    if (err.code === 'ai_unavailable' || err.status === 503) return 'Odczyt AI jest teraz niedostępny'
    if (err.code === 'rate_limited') return 'Limit odczytów na tę godzinę wyczerpany'
    if (err.code === 'ai_busy') return 'Za dużo odczytów naraz — spróbuj za minutę'
    if (err.code === 'too_large') return 'Plik jest za duży'
    if (err.code === 'unsupported_type') return 'Nieobsługiwany format pliku'
    if (err.code === 'invalid_url') return 'Nieprawidłowy adres strony'
  }
  return subject === 'receipt'
    ? 'Nie udało się odczytać paragonu — uzupełnij ręcznie'
    : 'Nie udało się odczytać — uzupełnij ręcznie'
}
