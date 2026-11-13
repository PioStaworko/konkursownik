import { useMemo, useState } from 'react'
import { useShoppingList, useToggleItem } from '../api/hooks'
import type { ShoppingItemDto } from '../api/types'
import { ANY_STORE, storeIcon } from '../features/shopping/storeIcons'
import QuickAddSheet from '../features/shopping/QuickAddSheet'
import { todayInPoland } from '../lib/format'
import NewEntryPicker from '../shell/NewEntryPicker'
import { BottomSheet } from '../ui/BottomSheet'
import { Button } from '../ui/Button'
import { CheckButton } from '../ui/CheckButton'
import { Icon } from '../ui/Icon'

type Snapshot = { item: ShoppingItemDto; store: string }

const DAY = 86_400_000
const daysUntil = (end: string, today: string) => Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / DAY)

function endingLabel(days: number): string | null {
  if (days < 0 || days > 3) return null
  if (days === 0) return 'Koniec dziś!'
  return days === 1 ? 'Koniec za 1 dzień!' : `Koniec za ${days} dni!`
}

export default function ShoppingPage() {
  const { data, isPending, isError } = useShoppingList()
  const toggle = useToggleItem('purchase-items')
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set())
  const [session, setSession] = useState<ReadonlyMap<string, Snapshot>>(new Map())
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const today = todayInPoland()

  const flip = (id: string, on: boolean) =>
    setChecked((c) => {
      const next = new Set(c)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  const change = (snap: Snapshot, value: boolean) => {
    const id = snap.item.id
    setFailed(false)
    setSession((s) => (s.has(id) ? s : new Map(s).set(id, snap)))
    flip(id, value)
    toggle.mutate(
      { id, value },
      {
        onError: () => {
          flip(id, !value)
          setFailed(true)
        },
      },
    )
  }

  const groups = useMemo(() => {
    const byStore = new Map<string, Map<string, ShoppingItemDto>>()
    const add = (store: string, item: ShoppingItemDto) => {
      const items = byStore.get(store) ?? new Map<string, ShoppingItemDto>()
      if (!items.has(item.id)) items.set(item.id, item)
      byStore.set(store, items)
    }
    const serverIds = new Set<string>()
    for (const g of data ?? []) for (const i of g.items) { serverIds.add(i.id); add(g.store, i) }
    for (const [id, s] of session) if (!serverIds.has(id)) add(s.store, s.item)
    return [...byStore.entries()]
      .map(([store, items]) => ({ store, items: [...items.values()] }))
      .sort((a, b) => Number(a.store === ANY_STORE) - Number(b.store === ANY_STORE))
  }, [data, session])

  const total = groups.reduce((n, g) => n + g.items.length, 0)
  const done = groups.reduce((n, g) => n + g.items.filter((i) => checked.has(i.id)).length, 0)
  const remaining = total - done
  const storeCount = groups.filter((g) => g.items.some((i) => !checked.has(i.id))).length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="flex flex-col gap-space-md">
      <div className="relative flex items-center justify-between gap-space-sm overflow-hidden rounded-xl bg-surface-container-high p-space-md shadow-md">
        <div className="flex min-w-0 items-center gap-space-sm">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-container/20 text-primary">
            <Icon name="shopping_bag" size={24} />
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-secondary" />
              <span className="text-label-xs uppercase tracking-wider text-secondary">Tryb sklepowy aktywny</span>
            </div>
            <h1 className="text-title-md text-on-surface">
              Do kupienia: <span className="font-mono text-mono-data font-bold text-primary">{remaining}</span>{' '}
              pozycji w{' '}
              <span className="font-mono text-mono-data font-bold text-primary">{storeCount}</span>{' '}
              sklepach
            </h1>
          </div>
        </div>
        <Button icon="add" onClick={() => setAddOpen(true)} className="shrink-0">Dodaj</Button>
      </div>

      <div className="flex flex-col gap-1.5 rounded-xl bg-surface-container-lowest p-space-sm shadow-sm">
        <div className="flex items-center justify-between px-1">
          <span className="text-label-xs text-on-surface-variant">Odhaczone: {done} z {total}</span>
          <span className="font-mono text-mono-data text-primary">{percent}%</span>
        </div>
        <div
          role="progressbar"
          aria-label="Postęp zakupów"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2 w-full overflow-hidden rounded-full bg-surface-container-highest"
        >
          <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-300" style={{ width: `${percent}%` }} />
        </div>
      </div>

      {isPending && <p className="text-on-surface-variant">Ładowanie…</p>}
      {isError && <p role="alert" className="text-error">Nie udało się wczytać listy zakupów</p>}
      {failed && <p role="alert" className="text-error">Nie udało się zapisać zmiany</p>}
      {!isPending && !isError && total === 0 && (
        <p className="py-8 text-center text-on-surface-variant">Lista zakupów jest pusta</p>
      )}

      {groups.map((g) => {
        const open = !collapsed.has(g.store)
        const left = g.items.filter((i) => !checked.has(i.id)).length
        return (
          <section key={g.store} className="flex flex-col overflow-hidden rounded-xl bg-surface-container-low shadow-sm">
            <h2>
              <button
                type="button"
                aria-expanded={open}
                onClick={() =>
                  setCollapsed((c) => {
                    const next = new Set(c)
                    if (open) next.add(g.store)
                    else next.delete(g.store)
                    return next
                  })
                }
                className="flex min-h-11 w-full items-center justify-between p-space-md text-left transition-colors active:bg-surface-container"
              >
                <span className="flex min-w-0 items-center gap-space-sm">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-container-highest text-tertiary">
                    <Icon name={storeIcon(g.store)} size={20} />
                  </span>
                  <span className="text-headline-sm tracking-tight text-on-surface">{g.store}</span>
                  <span className="rounded-full bg-surface-container-highest px-2 py-0.5 font-mono text-label-xs text-on-surface-variant">
                    {left} poz.
                  </span>
                </span>
                <Icon name={open ? 'expand_less' : 'expand_more'} className="text-on-surface-variant" />
              </button>
            </h2>
            {open && (
              <ul className="flex flex-col gap-space-sm px-space-md pb-space-md">
                {g.items.map((i) => {
                  const on = checked.has(i.id)
                  const ending = endingLabel(daysUntil(i.contestEndDate, today))
                  return (
                    <li
                      key={i.id}
                      className={`flex items-start justify-between gap-space-sm rounded-lg bg-surface-container p-space-md transition-opacity ${on ? 'opacity-60' : ''}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          {ending && (
                            <span className="flex items-center gap-1 rounded-full bg-tertiary/15 px-2 py-0.5 text-label-xs text-tertiary">
                              <Icon name="alarm" size={13} />
                              {ending}
                            </span>
                          )}
                          <span className="text-label-xs text-on-surface-variant">{i.contestName}</span>
                        </div>
                        <div className="flex items-baseline gap-space-sm">
                          <span className={`text-title-md font-semibold leading-snug text-on-surface ${on ? 'line-through' : ''}`}>
                            {i.product}
                          </span>
                          {i.quantity && <span className="text-label-md text-on-surface-variant">{i.quantity}</span>}
                        </div>
                        {i.note && (
                          <p className="mt-1 flex items-start gap-2 rounded-lg bg-surface-container-highest/70 p-2 text-label-md font-medium text-primary">
                            <Icon name="receipt_long" size={16} className="mt-0.5 text-tertiary" />
                            <span>{i.note}</span>
                          </p>
                        )}
                      </div>
                      <CheckButton
                        checked={on}
                        onChange={(v) => change({ item: i, store: g.store }, v)}
                        label={`${i.product} — ${i.contestName}`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        )
      })}

      <div className="flex items-center justify-between gap-space-sm rounded-xl bg-surface-container-high p-space-md">
        <span className="flex items-center gap-space-sm text-label-md text-on-surface-variant">
          <Icon name="photo_camera" size={20} className="text-tertiary" />
          Po zakupie zrób zdjęcie paragonu
        </span>
        <Button variant="secondary" onClick={() => setPickerOpen(true)} className="shrink-0">Dodaj zgłoszenie</Button>
      </div>

      <QuickAddSheet open={addOpen} onClose={() => setAddOpen(false)} />
      <BottomSheet open={pickerOpen} onClose={() => setPickerOpen(false)} title="Wybierz konkurs">
        <NewEntryPicker onDone={() => setPickerOpen(false)} />
      </BottomSheet>
    </div>
  )
}
