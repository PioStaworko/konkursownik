import { Link } from 'react-router'
import { useProofs, useToggleItem } from '../api/hooks'
import type { ProofListItemDto } from '../api/types'
import { formatDate } from '../lib/format'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Section } from '../ui/Section'

const NO_PLACE = 'Bez miejsca'

function groupByLocation(items: ProofListItemDto[]): [string, ProofListItemDto[]][] {
  const map = new Map<string, ProofListItemDto[]>()
  for (const i of items) {
    const key = i.location?.trim() || NO_PLACE
    map.set(key, [...(map.get(key) ?? []), i])
  }
  return [...map.entries()].sort(([a], [b]) => (a === NO_PLACE ? 1 : b === NO_PLACE ? -1 : a.localeCompare(b, 'pl')))
}

export default function ProofsPage() {
  const { data, isPending, isError } = useProofs()
  const toggle = useToggleItem('proof-items')

  return (
    <div className="flex flex-col gap-space-lg">
      {isPending && <p className="text-on-surface-variant">Ładowanie…</p>}
      {isError && <p role="alert" className="text-error">Nie udało się wczytać dowodów</p>}
      {toggle.isError && <p role="alert" className="text-error">Nie udało się zapisać zmiany</p>}
      {data && data.length === 0 && <p className="py-8 text-center text-on-surface-variant">Schowek jest pusty</p>}
      {data &&
        groupByLocation(data).map(([location, items]) => (
          <Section key={location} icon="inventory_2" title={location}>
            <ul className="flex flex-col gap-space-sm">
              {items.map((i) => (
                <li key={i.id}>
                  <Card tone="default" className="flex flex-col gap-1.5">
                    <span className="text-title-md font-semibold text-on-surface">{i.what}</span>
                    <Link to={`/konkursy/${i.contestId}`} className="text-label-md text-primary hover:underline">
                      {i.contestName}
                    </Link>
                    {i.keepUntil && <span className="text-label-md text-on-surface-variant">trzymać do {formatDate(i.keepUntil)}</span>}
                    {i.note && <span className="text-label-md text-on-surface-variant">{i.note}</span>}
                    <Button
                      variant="secondary"
                      icon="delete_sweep"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: i.id, value: true })}
                    >
                      Wyrzucono
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          </Section>
        ))}
    </div>
  )
}
