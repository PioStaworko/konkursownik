import { useRef, useState, type ChangeEvent } from 'react'
import { ApiError } from '../api/client'
import type { PhotoDto } from '../api/types'
import { useDeletePhoto, useUploadPhoto } from '../api/hooks'
import { secondaryButtonClass } from '../lib/styles'

const MAX_BYTES = 10 * 1024 * 1024
const TOO_LARGE = 'Zdjęcie jest za duże (maks. 10 MB)'

function uploadError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'too_large') return TOO_LARGE
  if (err instanceof ApiError && err.code === 'unsupported_type') return 'Nieobsługiwany format zdjęcia'
  return 'Nie udało się wysłać zdjęcia. Spróbuj ponownie.'
}

export default function PhotoPicker({ entryId, photos }: { entryId: string; photos: PhotoDto[] }) {
  const upload = useUploadPhoto()
  const remove = useDeletePhoto()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    if (file.size > MAX_BYTES) {
      setError(TOO_LARGE)
      return
    }
    try {
      await upload.mutateAsync({ entryId, file })
    } catch (err) {
      setError(uploadError(err))
    }
  }

  const onDelete = async (id: string) => {
    if (!window.confirm('Usunąć zdjęcie?')) return
    setError(null)
    try {
      await remove.mutateAsync(id)
    } catch {
      setError('Nie udało się usunąć zdjęcia.')
    }
  }

  return (
    <div className="space-y-2">
      {photos.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {photos.map(({ id }, i) => (
            <li key={id} className="relative">
              <a href={`/api/photos/${id}`} target="_blank" rel="noopener noreferrer" aria-label={`Zdjęcie ${i + 1}`}>
                <img
                  src={`/api/photos/${id}`}
                  alt={`Zdjęcie paragonu ${i + 1}`}
                  loading="lazy"
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-slate-300"
                />
              </a>
              <button
                type="button"
                aria-label={`Usuń zdjęcie ${i + 1}`}
                onClick={() => onDelete(id)}
                className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-red-700 shadow ring-1 ring-slate-300"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Dodaj zdjęcie"
        className="sr-only"
        onChange={onChange}
      />
      <button
        type="button"
        className={secondaryButtonClass}
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {upload.isPending ? 'Wysyłanie…' : 'Dodaj zdjęcie paragonu'}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
