import { describe, expect, it } from 'vitest'
import { storeIcon } from './storeIcons'

describe('storeIcon', () => {
  it('maps known chains case-insensitively', () => {
    expect(storeIcon('Biedronka')).toBe('storefront')
    expect(storeIcon('LIDL')).toBe('storefront')
    expect(storeIcon('żabka')).toBe('storefront')
    expect(storeIcon('Rossmann')).toBe('spa')
    expect(storeIcon('Super-Pharm')).toBe('spa')
    expect(storeIcon('Dowolny sklep')).toBe('local_mall')
    expect(storeIcon('Osiedlowy')).toBe('local_mall')
  })
})
