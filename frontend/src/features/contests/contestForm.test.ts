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
      { id: null, name: 'Rower', value: '2500', count: '10' },
      { id: null, name: 'Bon', value: '', count: '' },
    ])
  })
})

describe('prize validation', () => {
  const prize = (over: Partial<{ id: string | null; name: string; value: string; count: string }> = {}) => ({
    id: null, name: 'Rower', value: '', count: '', ...over,
  })
  it('parses values to numbers and keeps ids', () => {
    const { dto } = validate({ ...base, prizes: [prize({ id: 'z1', value: '2 500,50', count: '3' }), prize({ name: ' Bon ' })] })
    expect(dto!.prizes).toEqual([
      { id: 'z1', name: 'Rower', value: 2500.5, count: 3 },
      { id: null, name: 'Bon', value: null, count: null },
    ])
  })
  it.each([
    [{ name: '  ' }, 'Nazwa nagrody jest wymagana (maks. 200 znaków).'],
    [{ name: 'a'.repeat(201) }, 'Nazwa nagrody jest wymagana (maks. 200 znaków).'],
    [{ value: 'abc' }, 'Nieprawidłowa wartość nagrody.'],
    [{ value: '-1' }, 'Wartość nagrody nie może być ujemna.'],
    [{ count: '0' }, 'Liczba nagród musi być większa od zera.'],
    [{ count: '1,5' }, 'Liczba nagród musi być większa od zera.'],
  ])('rejects %o', (over, message) => {
    const r = validate({ ...base, prizes: [prize(over)] })
    expect(r.errors.prizes).toBe(message)
    expect(r.dto).toBeNull()
  })
})
