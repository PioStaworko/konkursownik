/** Empty → null, invalid → NaN. Accepts comma or dot, ignores whitespace. */
export function parseAmount(input: string): number | null {
  const s = input.replace(/\s/g, '').replace(',', '.')
  if (s === '') return null
  return /^-?\d+(\.\d+)?$/.test(s) ? Number(s) : NaN
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${day}.${m}.${y}`
}

const money = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' })

export function formatMoney(n: number): string {
  return money.format(n)
}
