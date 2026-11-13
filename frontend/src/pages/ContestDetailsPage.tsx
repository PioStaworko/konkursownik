import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { useContest } from '../api/hooks'
import type { ContestDto } from '../api/types'
import ChecklistTab from '../features/details/ChecklistTab'
import ContestMenu from '../features/details/ContestMenu'
import DetailsHeaderCard from '../features/details/DetailsHeaderCard'
import EntriesTab from '../features/details/EntriesTab'
import TabsBar, { type TabDef } from '../features/details/TabsBar'
import WinSection from '../features/details/WinSection'
import StatusMenu from '../features/details/StatusMenu'
import { keepUntilDetail } from '../lib/format'
import { typeLabel } from '../lib/labels'
import { Icon } from '../ui/Icon'
import { Section } from '../ui/Section'

type TabKey = 'steps' | 'purchases' | 'proofs' | 'entries'

const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(' · ') || null

function ContestDetails({ c }: { c: ContestDto }) {
  const [params] = useSearchParams()
  const [tab, setTab] = useState<TabKey>('entries')
  const openForm = params.get('zgloszenie') === '1'
  const autoReceipt = openForm && params.get('paragon') === '1'

  const tabs: TabDef<TabKey>[] = [
    { key: 'steps', label: `Kroki (${c.tasks.filter((t) => t.done).length}/${c.tasks.length})`, icon: 'checklist' },
    { key: 'purchases', label: 'Do kupienia', icon: 'shopping_cart' },
    { key: 'proofs', label: 'Schowek', icon: 'inventory_2' },
    { key: 'entries', label: 'Zgłoszenia', icon: 'assignment_turned_in' },
  ]

  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-space-xs text-label-md text-on-surface-variant">
          <Icon name="stars" size={16} className="shrink-0 text-tertiary" />
          <span className="shrink-0">{typeLabel[c.type]}</span>
          {c.organizer && (
            <>
              <span>•</span>
              <span className="truncate">{c.organizer}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center">
          <StatusMenu contestId={c.id} status={c.effectiveStatus} />
          <ContestMenu contestId={c.id} />
        </div>
      </div>

      <DetailsHeaderCard c={c} />
      {c.resultsCheckNote && <p className="text-body-md text-on-surface-variant">Wyniki: {c.resultsCheckNote}</p>}

      <TabsBar tabs={tabs} active={tab} onChange={setTab} />

      {tab === 'steps' && (
        <ChecklistTab
          kind="contest-tasks"
          empty="Brak kroków"
          items={c.tasks.map((t) => ({ id: t.id, label: t.text, checked: t.done }))}
        />
      )}
      {tab === 'purchases' && (
        <ChecklistTab
          kind="purchase-items"
          empty="Nic do kupienia"
          items={c.purchases.map((p) => ({
            id: p.id,
            label: [p.product, p.quantity].filter(Boolean).join(' × '),
            detail: join(p.store, p.note),
            checked: p.bought,
          }))}
        />
      )}
      {tab === 'proofs' && (
        <ChecklistTab
          kind="proof-items"
          empty="Nic do zachowania"
          items={c.proofs.map((p) => ({
            id: p.id,
            label: p.what,
            detail: join(keepUntilDetail(p.keepUntil, p.location), p.note),
            checked: p.discarded,
          }))}
        />
      )}
      {tab === 'entries' && <EntriesTab c={c} initialFormOpen={openForm} autoReceipt={autoReceipt} />}

      <WinSection contestId={c.id} win={c.win} />

      {c.notes && (
        <Section icon="description" title="Notatki">
          <p className="whitespace-pre-wrap text-body-md text-on-surface">{c.notes}</p>
        </Section>
      )}
    </div>
  )
}

export default function ContestDetailsPage() {
  const { id } = useParams()
  const { data, isPending, isError } = useContest(id)
  if (isPending) return <p className="text-on-surface-variant">Ładowanie…</p>
  if (isError) return <p role="alert" className="text-error">Nie udało się wczytać konkursu</p>
  return <ContestDetails c={data} />
}
