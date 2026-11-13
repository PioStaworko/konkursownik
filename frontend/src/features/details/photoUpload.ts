import { ApiError } from '../../api/client'

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024
export const PHOTO_TOO_LARGE = 'Zdjęcie jest za duże (maks. 10 MB)'
export const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp'

export function uploadError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'too_large') return PHOTO_TOO_LARGE
  if (err instanceof ApiError && err.code === 'unsupported_type') return 'Nieobsługiwany format zdjęcia'
  return 'Nie udało się wysłać zdjęcia. Spróbuj ponownie.'
}
