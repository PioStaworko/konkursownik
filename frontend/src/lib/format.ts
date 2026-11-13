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

/** "3/5 · dziś 1/1"; parts without a limit are reduced to the plain count. */
export function formatEntryCounter(
  entryCount: number,
  limitTotal: number | null,
  entriesToday: number,
  limitPerDay: number | null,
): string {
  const total = limitTotal == null ? `${entryCount}` : `${entryCount}/${limitTotal}`
  return limitPerDay == null ? total : `${total} · dziś ${entriesToday}/${limitPerDay}`
}

/** Returns the URL only when it is an absolute http(s) URL; guards against javascript: and similar schemes. */
export function safeHttpUrl(s: string | null): string | null {
  if (!s) return null
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? s : null
  } catch {
    return null
  }
}

/** Today's date as YYYY-MM-DD in Polish time. */
export function todayInPoland(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Warsaw' }).format(new Date())
}

/** Current Polish local time as "dd.MM.yyyy, HH:mm". */
export function nowInPolandLabel(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('pl-PL', {
    timeZone: 'Europe/Warsaw', day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? ''
  return `${p('day')}.${p('month')}.${p('year')}, ${p('hour')}:${p('minute')}`
}

export const keepUntilDetail = (keepUntil: string | null, location: string | null) =>
  [keepUntil && `do ${formatDate(keepUntil)}`, location].filter(Boolean).join(' · ') || null

/** Polish plural form: 1 → one, 2-4 (except 12-14) → few, otherwise many. */
export function pluralPl(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one
  const last = n % 10
  const lastTwo = n % 100
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many
}
