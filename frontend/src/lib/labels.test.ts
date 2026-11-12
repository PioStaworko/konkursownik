import { describe, expect, it } from 'vitest'
import { statusLabel, typeLabel } from './labels'

describe('labels', () => {
  it('every status has a label', () => expect(Object.keys(statusLabel)).toHaveLength(7))
  it('status labels', () => {
    expect(statusLabel.AwaitingResults).toBe('Czekam na wyniki')
    expect(statusLabel.Archived).toBe('Archiwum')
  })
  it('type labels', () => expect(typeLabel).toEqual({ Lottery: 'Loteria', Creative: 'Zadanie konkursowe' }))
})
