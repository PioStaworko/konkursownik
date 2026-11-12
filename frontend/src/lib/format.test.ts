import { describe, expect, it } from 'vitest'
import { formatDate, formatEntryCounter, formatMoney, parseAmount, safeHttpUrl, todayInPoland } from './format'

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
  it.each([
    [3, 5, 1, 1, '3/5 · dziś 1/1'],
    [3, null, 0, null, '3'],
    [3, 5, 0, null, '3/5'],
    [3, null, 1, 1, '3 · dziś 1/1'],
  ])('formatEntryCounter(%s, %s, %s, %s)', (a, b, c, d, out) =>
    expect(formatEntryCounter(a, b, c, d)).toBe(out))
  it.each([
    ['javascript:alert(1)', null],
    ['https://x.pl', 'https://x.pl'],
    ['http://x.pl/a?b=1', 'http://x.pl/a?b=1'],
    ['x.pl', null],
    ['', null],
    [null, null],
  ])('safeHttpUrl(%s)', (i, o) => expect(safeHttpUrl(i)).toBe(o))
  it('todayInPoland is YYYY-MM-DD', () => expect(todayInPoland()).toMatch(/^\d{4}-\d{2}-\d{2}$/))
})
