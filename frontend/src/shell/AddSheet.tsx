import { useState } from 'react'
import { useNavigate } from 'react-router'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import NewEntryPicker from './NewEntryPicker'

export default function AddSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const [picking, setPicking] = useState(false)
  const close = () => {
    setPicking(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={close} title={picking ? 'Wybierz konkurs' : 'Dodaj'}>
      {picking ? (
        <NewEntryPicker onDone={close} />
      ) : (
        <div className="flex flex-col gap-space-sm">
          <Button
            variant="secondary"
            icon="emoji_events"
            className="justify-start"
            onClick={() => {
              close()
              navigate('/konkursy/nowy')
            }}
          >
            Nowy konkurs
          </Button>
          <Button variant="secondary" icon="receipt_long" className="justify-start" onClick={() => setPicking(true)}>
            Nowe zgłoszenie / paragon
          </Button>
        </div>
      )}
    </BottomSheet>
  )
}
