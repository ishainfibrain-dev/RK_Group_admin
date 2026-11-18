import { describe, expect, it } from 'vitest'
import { paymentMethodsFor } from './domain'

describe('paymentMethodsFor', () => {
  it('includes Cash while Live1 is active', () => {
    expect(paymentMethodsFor(true).map((method) => method.value)).toContain('cash')
  })

  it('removes Cash while Live1 is inactive', () => {
    expect(paymentMethodsFor(false).map((method) => method.value)).not.toContain('cash')
  })
})
