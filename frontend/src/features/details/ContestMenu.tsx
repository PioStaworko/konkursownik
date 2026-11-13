import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useDeleteContest, useDuplicateContest } from '../../api/hooks'
import { IconButton } from '../../ui/Button'

const itemClass = 'flex min-h-11 w-full items-center rounded-lg px-3 text-left text-body-md hover:bg-surface-variant disabled:opacity-60'

/** The ⋮ menu: edit, duplicate (opens the copy for editing) and delete (with confirmation). */
export default function ContestMenu({ contestId }: { contestId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()
  const duplicate = useDuplicateContest()
  const remove = useDeleteContest()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const onDuplicate = async () => {
    try {
      navigate(`/konkursy/${await duplicate.mutateAsync(contestId)}/edycja`)
    } catch {
      // surfaced through duplicate.isError
    }
  }

  const onDelete = async () => {
    if (!window.confirm('Usunąć konkurs razem ze zdjęciami?')) return
    try {
      await remove.mutateAsync(contestId)
      navigate('/konkursy')
    } catch {
      // surfaced through remove.isError
    }
  }

  return (
    <div ref={ref} className="relative">
      <IconButton icon="more_vert" label="Więcej opcji" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} />
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 w-44 rounded-xl bg-surface-container-high p-1 shadow-xl">
          <Link role="menuitem" to={`/konkursy/${contestId}/edycja`} className={`${itemClass} text-on-surface`}>
            Edytuj
          </Link>
          <button type="button" role="menuitem" disabled={duplicate.isPending} onClick={onDuplicate} className={`${itemClass} text-on-surface`}>
            Duplikuj
          </button>
          <button type="button" role="menuitem" disabled={remove.isPending} onClick={onDelete} className={`${itemClass} text-error`}>
            Usuń
          </button>
        </div>
      )}
      {(duplicate.isError || remove.isError) && (
        <p role="alert" className="absolute right-0 mt-1 w-48 text-label-md text-error">
          Operacja nie powiodła się. Spróbuj ponownie.
        </p>
      )}
    </div>
  )
}
