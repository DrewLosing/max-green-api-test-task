import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['89991234567', '79991234567'],
    ['9991234567', '79991234567'],
    ['+375 29 123 45 67', '375291234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })

  it.each(['', 'abc', '12345', '1234567890123456'])('rejects %j', (input) => {
    expect(normalizePhone(input)).toBeNull()
  })
})

describe('formatPhone', () => {
  it('formats Russian numbers', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('falls back to a plain international number', () => {
    expect(formatPhone('375291234567')).toBe('+375291234567')
  })
})
