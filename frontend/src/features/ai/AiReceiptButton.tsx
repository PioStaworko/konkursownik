import { useEffect, useRef } from 'react'
import { useExtractReceipt } from '../../api/hooks'
import { Button } from '../../ui/Button'
import type { ExtractedReceipt } from '../details/EntryFormV2'
import { PHOTO_ACCEPT } from '../details/photoUpload'
import { aiErrorMessage } from './aiErrors'
import { useAiNotice } from './AiNotice'

type Props = {
  onExtracted: (dto: ExtractedReceipt, file: File) => void
  autoReceipt?: boolean
  /** Called once the deep-link picker was opened, so the caller can stop passing `autoReceipt`. */
  onAutoOpened?: () => void
}

export default function AiReceiptButton({ onExtracted, autoReceipt = false, onAutoOpened }: Props) {
  const input = useRef<HTMLInputElement>(null)
  const extract = useExtractReceipt()
  const { gate, notice } = useAiNotice()
  const opened = useRef(false)

  const openPicker = () => gate(() => input.current?.click())

  useEffect(() => {
    if (!autoReceipt || opened.current) return
    opened.current = true
    openPicker()
    onAutoOpened?.()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPick = async (file: File | undefined) => {
    if (!file) return
    try {
      const r = await extract.mutateAsync(file)
      onExtracted({ store: r.store, date: r.date, purchaseAmount: r.amount, receiptNumber: r.receiptNumber }, file)
    } catch {
      // surfaced through extract.error
    }
  }

  return (
    <div className="flex flex-col gap-space-xs">
      <input
        ref={input}
        type="file"
        accept={PHOTO_ACCEPT}
        aria-label="Plik paragonu"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          void onPick(file)
        }}
      />
      <Button variant="secondary" icon="document_scanner" disabled={extract.isPending} onClick={openPicker}>
        {extract.isPending ? 'Odczytywanie…' : 'Odczytaj z paragonu'}
      </Button>
      {extract.isError && (
        <p role="alert" className="text-label-md text-error">
          {aiErrorMessage(extract.error)}
        </p>
      )}
      {notice}
    </div>
  )
}
