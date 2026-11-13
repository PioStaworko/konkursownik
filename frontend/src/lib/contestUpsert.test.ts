import { describe, expect, it } from 'vitest'
import { contestFixture } from '../test/fixtures'
import { toUpsert } from './contestUpsert'

describe('toUpsert', () => {
  it('strips read-only fields and keeps child ids', () => {
    const dto = toUpsert(contestFixture)
    expect(dto).not.toHaveProperty('id')
    expect(dto).not.toHaveProperty('entries')
    expect(dto).not.toHaveProperty('win')
    expect(dto.name).toBe(contestFixture.name)
    expect(dto.tasks).toBe(contestFixture.tasks)
  })
})
