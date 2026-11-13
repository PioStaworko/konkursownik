import { afterEach, describe, expect, it } from 'vitest'
import indexHtml from '../../index.html?raw'
import { applyTheme, readTheme } from './theme'

const storageWith = (value: string | null): Storage =>
  ({ getItem: () => value }) as unknown as Storage

function inlineScript(): string {
  const m = indexHtml.match(/<script id="theme-init">([\s\S]*?)<\/script>/)
  if (!m) throw new Error('theme-init script missing in index.html')
  return m[1]
}

describe('theme', () => {
  afterEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  it('readTheme defaults to dark', () => expect(readTheme(null)).toBe('dark'))

  it('readTheme reads light', () => expect(readTheme(storageWith('light'))).toBe('light'))

  it('readTheme ignores garbage', () => expect(readTheme(storageWith('purple'))).toBe('dark'))

  it('readTheme survives throwing storage', () => {
    const storage = { getItem: () => { throw new Error('denied') } } as unknown as Storage
    expect(readTheme(storage)).toBe('dark')
  })

  it('applyTheme toggles the dark class', () => {
    applyTheme('dark')
    expect(document.documentElement).toHaveClass('dark')
    applyTheme('light')
    expect(document.documentElement).not.toHaveClass('dark')
  })

  it.each([['light', false], ['dark', true], [null, true]] as const)(
    'inline head script and readTheme agree for %s',
    (stored, dark) => {
      if (stored) localStorage.setItem('konkursownik-theme', stored)
      document.documentElement.classList.remove('dark')
      new Function(inlineScript())()
      expect(document.documentElement.classList.contains('dark')).toBe(dark)
      expect(readTheme(localStorage)).toBe(dark ? 'dark' : 'light')
    },
  )
})
