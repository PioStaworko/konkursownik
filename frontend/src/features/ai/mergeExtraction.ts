export interface MergeOptions<T> {
  /** Overrides what counts as "empty" in `new` mode (e.g. a select that always holds a default). */
  isEmpty?: (key: keyof T, value: T[keyof T]) => boolean
}

const blank = (v: unknown) =>
  v == null || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

/**
 * Applies AI-extracted values to a form.
 * `new`: fills empty fields only. `edit`: replaces fields the AI returned non-empty, after a confirmation.
 * Lists are appended. `aiFields` are the keys that were changed (badge them as "AI — sprawdź").
 */
export function mergeExtraction<T extends object>(
  current: T,
  extracted: Partial<T>,
  mode: 'new' | 'edit',
  options: MergeOptions<T> = {},
): { value: T; aiFields: Set<keyof T> } {
  const next = { ...current }
  const changed = new Set<keyof T>()
  for (const key of Object.keys(extracted) as (keyof T)[]) {
    const incoming = extracted[key]
    if (blank(incoming)) continue
    const existing = current[key]
    if (Array.isArray(incoming)) {
      next[key] = [...(Array.isArray(existing) ? existing : []), ...incoming] as T[keyof T]
      changed.add(key)
      continue
    }
    if (existing === incoming) continue
    const empty = options.isEmpty ? options.isEmpty(key, existing) : blank(existing)
    if (mode === 'new' && !empty) continue
    next[key] = incoming as T[keyof T]
    changed.add(key)
  }
  if (mode === 'edit' && changed.size > 0 && !window.confirm(`Nadpisać ${changed.size} pól danymi z AI?`)) {
    return { value: current, aiFields: new Set() }
  }
  return { value: changed.size === 0 ? current : next, aiFields: changed }
}
