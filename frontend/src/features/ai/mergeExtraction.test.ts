import { afterEach, describe, expect, it, vi } from 'vitest'
import { mergeExtraction } from './mergeExtraction'

interface V {
  name: string
  organizer: string
  prize: string
  tasks: { id: string | null; text: string }[]
}

const base: V = { name: '', organizer: 'Własny', prize: '', tasks: [] }

afterEach(() => vi.unstubAllGlobals())

describe('mergeExtraction', () => {
  it('mergeExtraction new fills only empty fields and marks them', () => {
    const r = mergeExtraction(base, { name: 'Konkurs', organizer: 'AI Org', prize: '' }, 'new')
    expect(r.value).toEqual({ name: 'Konkurs', organizer: 'Własny', prize: '', tasks: [] })
    expect([...r.aiFields]).toEqual(['name'])
  })

  it('appends lists in new mode', () => {
    const cur: V = { ...base, tasks: [{ id: 't1', text: 'Mój' }] }
    const r = mergeExtraction(cur, { tasks: [{ id: null, text: 'Z AI' }] }, 'new')
    expect(r.value.tasks).toEqual([{ id: 't1', text: 'Mój' }, { id: null, text: 'Z AI' }])
    expect(r.aiFields.has('tasks')).toBe(true)
  })

  it('mergeExtraction edit asks and overwrites only non-empty extracted', () => {
    const confirm = vi.fn().mockReturnValue(true)
    vi.stubGlobal('confirm', confirm)
    const r = mergeExtraction(base, { name: 'Nowa', organizer: 'AI Org', prize: '' }, 'edit')
    expect(confirm).toHaveBeenCalledWith('Nadpisać 2 pól danymi z AI?')
    expect(r.value).toEqual({ name: 'Nowa', organizer: 'AI Org', prize: '', tasks: [] })
    expect(new Set(r.aiFields)).toEqual(new Set(['name', 'organizer']))
  })

  it('edit declined changes nothing', () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false))
    const r = mergeExtraction(base, { name: 'Nowa' }, 'edit')
    expect(r.value).toBe(base)
    expect(r.aiFields.size).toBe(0)
  })

  it('edit does not ask when nothing would change', () => {
    const confirm = vi.fn()
    vi.stubGlobal('confirm', confirm)
    const r = mergeExtraction(base, { organizer: 'Własny', name: '' }, 'edit')
    expect(confirm).not.toHaveBeenCalled()
    expect(r.aiFields.size).toBe(0)
  })
})
