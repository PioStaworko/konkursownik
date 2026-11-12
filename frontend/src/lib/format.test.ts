import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, parseAmount } from './format'

describe('format', () => {
  it.each([
    ['12,50', 12.5],
    ['12.50', 12.5],
    [' 1 200,00 ', 1200],
    ['', null],
  ])('parseAmount(%s)', (i, o) => expect(parseAmount(i)).toBe(o))
  it('parseAmount invalid → NaN', () => expect(parseAmount('abc')).toBeNaN())
  it('formatMoney', () => expect(formatMoney(12.5).replace(/\s/g, ' ')).toBe('12,50 zł'))
  it('formatDate', () => expect(formatDate('2026-11-12')).toBe('12.11.2026'))
})
