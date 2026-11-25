import { describe, expect, it } from 'vitest'
import { friendlyError, titleCase } from './format'

describe('titleCase', () => {
  it('formats database values for the UI', () => {
    expect(titleCase('bank_transfer')).toBe('Bank Transfer')
    expect(titleCase('upi')).toBe('Upi')
  })

  describe('friendlyError', () => {
    it('uses clear messages for common authentication and permission errors', () => {
      expect(friendlyError(new Error('JWT expired'))).toBe('Your session expired. Please sign in again.')
      expect(friendlyError(new Error('row-level security policy violation'))).toBe('You do not have permission to perform this action.')
      expect(friendlyError(new Error('User already registered'))).toBe('An account with this email already exists.')
      expect(friendlyError(new Error('violates foreign key constraint "app_bookings_customer_id_fkey"'))).toBe('Cannot delete this record because it is referenced by existing bookings or data.')
    })

    it('does not expose raw server error details', () => {
      expect(friendlyError(new Error('Postgres relation app_users_internal failed at line 42'))).toBe('Something went wrong. Please try again. If it continues, contact an administrator.')
    })
  })
})
