import { describe, expect, it } from 'vitest'
import { emptyValues, validate } from './contestForm'

const base = { ...emptyValues, name: 'K', startDate: '2026-11-01', endDate: '2026-12-01' }
const purchase = (note: string | null) => ({ id: null, product: 'Mleko', store: null, quantity: null, bought: false, note })
const proof = (note: string | null) => ({ id: null, what: 'Paragon', keepUntil: null, location: null, discarded: false, note })

describe('contest form notes', () => {
  it('trims purchase and proof notes and turns empty ones into null', () => {
    const { dto } = validate({
      ...base,
      purchases: [purchase('  weź paragon  '), purchase('   ')],
      proofs: [proof(' dowód '), proof('')],
    })
    expect(dto!.purchases.map((p) => p.note)).toEqual(['weź paragon', null])
    expect(dto!.proofs.map((p) => p.note)).toEqual(['dowód', null])
  })

  it('rejects notes over 300 characters', () => {
    const long = 'a'.repeat(301)
    expect(validate({ ...base, purchases: [purchase(long)] }).errors.purchases).toBe('Notatka do zakupu może mieć maks. 300 znaków.')
    expect(validate({ ...base, proofs: [proof(long)] }).errors.proofs).toBe('Notatka do dowodu może mieć maks. 300 znaków.')
    expect(validate({ ...base, purchases: [purchase('a'.repeat(300))] }).dto).not.toBeNull()
  })
})
