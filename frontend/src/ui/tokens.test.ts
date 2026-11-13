/// <reference types="node" />
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrastRatio(a: string, b: string) {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}

const tokens = readFileSync('src/ui/tokens.css', 'utf8')
const light = tokens.slice(tokens.lastIndexOf(':root:not(.dark)'))
const color = (name: string) => light.match(new RegExp(`--color-${name}: (#[0-9a-f]{6})`))![1]

describe('light theme contrast', () => {
  const surfaces = ['surface', 'surface-container-low', 'surface-container', 'surface-container-high']
  it.each(['outline', 'on-surface-variant', 'on-surface'])('%s text is >= 4.5:1 on surfaces', (fg) => {
    for (const s of surfaces) expect(contrastRatio(color(fg), color(s))).toBeGreaterThanOrEqual(4.5)
  })
  it.each(['primary', 'secondary', 'tertiary', 'error'])('on-%s over its colour is >= 4.5:1', (n) => {
    expect(contrastRatio(color(`on-${n}`), color(n))).toBeGreaterThanOrEqual(4.5)
  })
})
