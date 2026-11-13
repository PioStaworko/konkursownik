import { describe, expect, it } from 'vitest'
import { formatBytes, formatDate, formatEntryCounter, formatMoney, parseAmount, pluralPl, safeHttpUrl, todayInPoland } from './format'

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

describe('pluralPl', () => {
  it.each([[1, 'a'], [2, 'b'], [4, 'b'], [5, 'c'], [12, 'c'], [14, 'c'], [22, 'b'], [112, 'c'], [0, 'c']])(
    '%i -> %s',
    (n, form) => expect(pluralPl(n, 'a', 'b', 'c')).toBe(form),
  )
})

describe('formatBytes', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1,0 KB'],
    [1536, '1,5 KB'],
    [Math.round(2.4 * 1024 * 1024), '2,4 MB'],
  ])('formatBytes(%s)', (n, out) => expect(formatBytes(n)).toBe(out))
})
