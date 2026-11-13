import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { aiErrorMessage } from './aiErrors'

describe('aiErrorMessage', () => {
  const failed = new ApiError(422, 'extraction_failed')
  it('names the receipt for receipt extraction', () => {
    expect(aiErrorMessage(failed, 'receipt')).toBe('Nie udało się odczytać paragonu — uzupełnij ręcznie')
  })
  it('keeps the generic wording for contests', () => {
    expect(aiErrorMessage(failed)).toBe('Nie udało się odczytać — uzupełnij ręcznie')
  })
})
