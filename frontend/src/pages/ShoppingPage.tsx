import { useState } from 'react'
import { useShoppingList, useToggleItem } from '../api/hooks'

export default function ShoppingPage() {
  const { data, isPending, isError } = useShoppingList()
  const toggle = useToggleItem('purchase-items')
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState(false)

  const check = (id: string) => {
    setFailed(false)
    setHidden((h) => new Set(h).add(id))
    toggle.mutate(
      { id, value: true },
      {
        onError: () => {
          setHidden((h) => {
            const next = new Set(h)
            next.delete(id)
            return next
          })
          setFailed(true)
        },
      },
    )
  }

  const groups = data
    ?.map((g) => ({ ...g, items: g.items.filter((i) => !hidden.has(i.id)) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-slate-900">Zakupy</h1>
      {isPending && <p className="text-slate-500">Ładowanie…</p>}
      {isError && <p role="alert" className="text-red-700">Nie udało się wczytać listy zakupów</p>}
      {failed && <p role="alert" className="text-red-700">Nie udało się zapisać zmiany</p>}
      {groups && groups.length === 0 && (
        <p className="py-8 text-center text-slate-500">Lista zakupów jest pusta</p>
      )}
      {groups?.map((g) => (
        <section key={g.store} className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-100 px-4 py-2 text-sm font-semibold uppercase text-slate-600">
            {g.store}
          </h2>
          <ul>
            {g.items.map((i) => (
              <li key={i.id}>
                <label className="flex min-h-11 items-center gap-3 px-4 py-2">
                  <input
                    type="checkbox"
                    className="size-5"
                    checked={false}
                    onChange={() => check(i.id)}
                    aria-label={`${i.product} — ${i.contestName}`}
                  />
                  <span className="flex-1">
                    <span className="block text-slate-900">{i.product}</span>
                    <span className="block text-xs text-slate-500">{i.contestName}</span>
                  </span>
                  {i.quantity && <span className="text-sm text-slate-600">{i.quantity}</span>}
                </label>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
