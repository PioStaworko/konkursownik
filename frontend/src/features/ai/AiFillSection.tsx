import { useRef, useState } from 'react'
import { useExtractContest } from '../../api/hooks'
import type { ContestExtractionDto } from '../../api/types'
import { tokenInputClass } from '../../lib/styles'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import { Section } from '../../ui/Section'
import { aiErrorMessage } from './aiErrors'
import { useAiNotice } from './AiNotice'

const FILE_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp'

export default function AiFillSection({ onExtracted }: { onExtracted: (dto: ContestExtractionDto) => void }) {
  const extract = useExtractContest()
  const { gate, notice } = useAiNotice()
  const file = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [needFile, setNeedFile] = useState(false)

  const run = async (input: { url: string } | { file: File }) => {
    setNeedFile(false)
    try {
      onExtracted(await extract.mutateAsync(input))
    } catch (err) {
      if ((err as { code?: string }).code === 'page_unreadable') setNeedFile(true)
    }
  }

  return (
    <Section icon="document_scanner" title="Wypełnij automatycznie" subtitle="AI wypełni formularz — nic nie zapisuje się samo.">
      <Field label="Link do konkursu lub regulaminu">
        <input
          className={tokenInputClass}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </Field>
      <div className="flex flex-wrap gap-space-sm">
        <Button
          icon="search"
          disabled={extract.isPending || url.trim() === ''}
          onClick={() => gate(() => void run({ url: url.trim() }))}
        >
          Odczytaj
        </Button>
        <input
          ref={file}
          type="file"
          accept={FILE_ACCEPT}
          aria-label="Plik regulaminu"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void run({ file: f })
          }}
        />
        <Button
          variant="secondary"
          icon="picture_as_pdf"
          data-attention={needFile ? 'true' : undefined}
          disabled={extract.isPending}
          className={needFile ? 'ring-2 ring-primary' : ''}
          onClick={() => gate(() => file.current?.click())}
        >
          Wgraj PDF / zrzut
        </Button>
      </div>
      {extract.isPending && <p className="text-label-md text-on-surface-variant">Odczytywanie…</p>}
      {extract.isError && (
        <p role="alert" className="text-label-md text-error">
          {aiErrorMessage(extract.error)}
        </p>
      )}
      {notice}
    </Section>
  )
}
