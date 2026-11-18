import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Field, SelectField, TextAreaField } from './ui'

afterEach(cleanup)

describe('Field validation', () => {
  it('marks required controls and displays an inline error on blur', () => {
    render(<Field label="Full name" name="name" required />)
    const input = screen.getByRole('textbox', { name: 'Full name' })
    expect(input).toHaveAttribute('aria-required', 'true')

    fireEvent.blur(input)

    expect(screen.getByText('Full name is required.')).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows required errors under the field', () => {
    render(<Field label="Full name" required />)

    fireEvent.invalid(screen.getByRole('textbox', { name: 'Full name' }))

    expect(screen.getByText('Full name is required.')).toBeInTheDocument()
  })

  it('sanitizes pasted numeric values', () => {
    render(<Field label="Amount" name="amount" type="number" />)
    const input = screen.getByRole('spinbutton', { name: 'Amount' })

    fireEvent.paste(input, { clipboardData: { getData: () => '12a.50' } })

    expect(input).toHaveValue(12.5)
  })

  it('shows required errors under select and text area fields', () => {
    render(
      <>
        <SelectField label="Role" required defaultValue="">
          <option value="">Select role</option>
        </SelectField>
        <TextAreaField label="Address" required />
      </>,
    )

    fireEvent.invalid(screen.getByRole('combobox', { name: 'Role' }))
    fireEvent.invalid(screen.getByRole('textbox', { name: 'Address' }))

    expect(screen.getByText('Role is required.')).toBeInTheDocument()
    expect(screen.getByText('Address is required.')).toBeInTheDocument()
  })

  it('accepts ten digits with an optional +91 prefix and shows an inline error', () => {
    render(<Field label="Phone" type="tel" />)
    const phone = screen.getByRole('textbox', { name: 'Phone' })

    fireEvent.change(phone, { target: { value: '123456789' } })
    fireEvent.invalid(phone)

    expect(screen.getByText('Phone must be 10 digits, optionally prefixed with +91.')).toBeInTheDocument()

    fireEvent.change(phone, { target: { value: '+91 9876543210' } })
    expect(phone).toHaveValue('+91 9876543210')
    expect(screen.queryByText('Phone must be 10 digits, optionally prefixed with +91.')).not.toBeInTheDocument()
  })
})
