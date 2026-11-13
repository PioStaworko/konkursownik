import type { IconName } from '../../ui/icons'

const groceries = ['biedronka', 'lidl', 'żabka', 'kaufland', 'auchan', 'carrefour', 'dino', 'netto', 'stokrotka', 'lewiatan']
const drugstores = ['rossmann', 'hebe', 'super-pharm']

export const ANY_STORE = 'Dowolny sklep'

export function storeIcon(store: string): IconName {
  const key = store.trim().toLowerCase()
  if (groceries.includes(key)) return 'storefront'
  if (drugstores.includes(key)) return 'spa'
  return 'local_mall'
}
