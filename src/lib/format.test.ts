import { describe, expect, it } from 'vitest'
import { titleCase } from './format'

describe('titleCase', () => {
  it('formats database values for the UI', () => {
    expect(titleCase('bank_transfer')).toBe('Bank Transfer')
    expect(titleCase('upi')).toBe('Upi')
  })
})
