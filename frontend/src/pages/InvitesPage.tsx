import { useState } from 'react'
import { useCreateInvite, useInvites } from '../api/hooks'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'

export default function InvitesPage() {
  const invites = useInvites()
  const createInvite = useCreateInvite()
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000)
    } catch {
      // clipboard unavailable: the code stays selectable
    }
  }

  return (
    <div className="flex flex-col gap-space-md">
      <h1 className="text-headline-lg">Zaproszenia</h1>
      <Button icon="add" disabled={createInvite.isPending} onClick={() => createInvite.mutate()}>
        Wygeneruj kod
      </Button>
      {createInvite.isError && <p role="alert" className="text-error">Nie udało się wygenerować kodu</p>}
      {invites.isError && <p role="alert" className="text-error">Nie udało się wczytać zaproszeń</p>}
      {invites.data && (
        <ul className="flex flex-col gap-space-sm">
          {invites.data.map((i) => (
            <li key={i.code}>
              <Card className="flex items-center gap-space-sm">
                <code className="flex-1 select-all break-all font-mono text-mono-data">{i.code}</code>
                <span className="text-label-md text-on-surface-variant">{i.used ? 'zużyty' : 'wolny'}</span>
                <Button variant="secondary" icon="content_copy" onClick={() => void copy(i.code)}>
                  {copied === i.code ? 'Skopiowano' : 'Kopiuj'}
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
