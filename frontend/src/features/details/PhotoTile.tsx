import { useState } from 'react'
import { useDeletePhoto } from '../../api/hooks'
import type { PhotoDto } from '../../api/types'
import { formatBytes } from '../../lib/format'
import { photoLabel } from '../../lib/labels'
import { Icon } from '../../ui/Icon'

export default function PhotoTile({ photo }: { photo: PhotoDto }) {
  const remove = useDeletePhoto()
  const [failed, setFailed] = useState(false)
  const src = `/api/photos/${photo.id}`

  const onDelete = async () => {
    if (!window.confirm('Usunąć zdjęcie?')) return
    setFailed(false)
    try {
      await remove.mutateAsync(photo.id)
    } catch {
      setFailed(true)
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="relative h-32 overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
        <a href={src} target="_blank" rel="noopener noreferrer" aria-label={`Otwórz zdjęcie: ${photoLabel[photo.label]}`}>
          <img src={src} alt={photoLabel[photo.label]} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        </a>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface-container-lowest/90 via-transparent to-transparent" />
        <div className="absolute inset-x-2 top-2 flex items-center justify-between">
          <span className="rounded bg-surface-container-highest/90 px-2 py-0.5 text-label-xs text-on-surface">{photoLabel[photo.label]}</span>
          <button
            type="button"
            aria-label="Usuń zdjęcie"
            disabled={remove.isPending}
            onClick={onDelete}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-surface-container-highest/80 text-on-surface hover:text-error"
          >
            <Icon name="delete" size={16} />
          </button>
        </div>
        <span className="absolute bottom-2 left-2 font-mono text-[10px] text-on-surface">{formatBytes(photo.sizeBytes)}</span>
      </div>
      <p className="flex items-center gap-1 text-label-xs text-on-surface-variant">
        <Icon name="lock" size={12} />
        Widoczne tylko dla Ciebie
      </p>
      {failed && (
        <p role="alert" className="text-label-md text-error">
          Nie udało się usunąć zdjęcia.
        </p>
      )}
    </div>
  )
}
