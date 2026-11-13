import { describe, expect, it } from 'vitest'
import { emptyValues, extractionToValues, validate } from './contestForm'
import type { ContestExtractionDto } from '../../api/types'

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

describe('extractionToValues prizes', () => {
  it('maps the prize list with null ids and drops nameless entries', () => {
    const x = { prizes: [{ name: ' Rower ', value: 2500, count: 10 }, { name: null, value: 5, count: 1 }, { name: 'Bon', value: null, count: null }] } as ContestExtractionDto
    expect(extractionToValues(x).prizes).toEqual([
      { id: null, name: 'Rower', value: 2500, count: 10 },
      { id: null, name: 'Bon', value: null, count: null },
    ])
  })
})
