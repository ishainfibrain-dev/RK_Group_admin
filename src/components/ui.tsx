import { X, Search, LoaderCircle, Eye, EyeOff } from 'lucide-react'
import { useEffect, useId, useState, type ButtonHTMLAttributes, type ClipboardEvent, type FormEvent, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

type ValidatedControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement

function validationMessage(control: ValidatedControl, label: string) {
  if (control.required && !control.value.trim()) return `${label} is required.`
  if ('type' in control && control.type === 'tel' && control.value && !/^(?:\+91[ -]?)?\d{10}$/.test(control.value)) {
    return `${label} must be 10 digits, optionally prefixed with +91.`
  }
  const validity = control.validity
  if (validity.valueMissing) return `${label} is required.`
  if ('type' in control && control.type === 'tel' && validity.patternMismatch) return `${label} must be 10 digits, optionally prefixed with +91.`
  if (validity.typeMismatch) return `Enter a valid ${label.toLowerCase()}.`
  if (validity.patternMismatch) return `Enter a valid ${label.toLowerCase()}.`
  if (validity.tooShort && 'minLength' in control) return `${label} must be at least ${control.minLength} characters.`
  if (validity.tooLong && 'maxLength' in control) return `${label} must be no more than ${control.maxLength} characters.`
  if (validity.rangeUnderflow && 'min' in control) return `${label} must be at least ${control.min}.`
  if (validity.rangeOverflow && 'max' in control) return `${label} must be no more than ${control.max}.`
  if (validity.stepMismatch) return `Enter a valid ${label.toLowerCase()}.`
  if (validity.customError) return control.validationMessage
  return ''
}

function validateControl(control: ValidatedControl, label: string) {
  control.setCustomValidity('')
  const message = validationMessage(control, label)
  control.setCustomValidity(message)
  return message
}

function focusFirstInvalid(control: ValidatedControl) {
  control.form?.querySelector<ValidatedControl>(':invalid')?.focus()
}

function sanitizePhone(value: string) {
  const cleaned = value.replace(/[^\d+ -]/g, '')
  if (!cleaned.startsWith('+')) return cleaned.replace(/\D/g, '').slice(0, 10)

  const digits = cleaned.slice(1).replace(/\D/g, '')
  if (digits.length <= 2) return `+${digits}`
  if (!digits.startsWith('91')) return digits.slice(0, 10)

  const separator = cleaned.slice(3).match(/^[ -]/)?.[0] ?? ''
  return `+91${separator}${digits.slice(2, 12)}`
}

function sanitizeNumeric(value: string) {
  const negative = value.trimStart().startsWith('-')
  const cleaned = value.replace(/[^0-9.]/g, '')
  const [whole, ...fraction] = cleaned.split('.')
  return `${negative ? '-' : ''}${whole}${fraction.length ? `.${fraction.join('')}` : ''}`
}

export function Button({ className = '', variant = 'primary', loading, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  loading?: boolean
}) {
  return (
    <button className={`button button--${variant} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? <LoaderCircle size={17} className="spin" aria-label="Loading" /> : children}
    </button>
  )
}

export function Field({ label, error, showPasswordToggle = true, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; showPasswordToggle?: boolean }) {
  const [validationError, setValidationError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const isPassword = props.type === 'password' && showPasswordToggle
  const required = props.required === true
  const numeric = props.type === 'number'
  const phone = props.type === 'tel'
  const message = error || validationError
  const generatedId = useId()
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (numeric && (event.key === 'e' || event.key === 'E')) event.preventDefault()
    props.onKeyDown?.(event)
  }
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (numeric) {
      const pasted = event.clipboardData.getData('text')
      const sanitized = sanitizeNumeric(pasted)
      if (sanitized !== pasted) {
        event.preventDefault()
        const input = event.currentTarget
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, sanitized)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
    props.onPaste?.(event)
  }
  const onInvalid = (event: FormEvent<HTMLInputElement>) => {
    event.preventDefault()
    setValidationError(validateControl(event.currentTarget, label))
    focusFirstInvalid(event.currentTarget)
    props.onInvalid?.(event)
  }
  const onBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    const nextError = validateControl(event.currentTarget, label)
    setValidationError(nextError)
    props.onBlur?.(event)
  }
  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (phone) {
      const sanitized = sanitizePhone(event.currentTarget.value)
      if (sanitized !== event.currentTarget.value) event.currentTarget.value = sanitized
    }
    const nextError = validateControl(event.currentTarget, label)
    if (validationError) setValidationError(nextError)
    props.onChange?.(event)
  }
  const errorId = `${props.id ?? props.name ?? generatedId}-error`
  const inputNode = (
    <input
      {...props}
      type={isPassword ? (showPassword ? 'text' : 'password') : props.type}
      inputMode={phone ? 'tel' : numeric ? 'decimal' : props.inputMode}
      pattern={phone ? '[+]91[ -]?[0-9]{10}|[0-9]{10}' : props.pattern}
      maxLength={phone ? 14 : props.maxLength}
      aria-required={required}
      aria-invalid={Boolean(message) || props['aria-invalid']}
      aria-describedby={message && errorId ? [props['aria-describedby'], errorId].filter(Boolean).join(' ') : props['aria-describedby']}
      onChange={onChange}
      onBlur={onBlur}
      onInvalid={onInvalid}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
    />
  )

  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      {isPassword ? (
        <div className="field__control">
          {inputNode}
          <button
            type="button"
            className="field__password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            disabled={props.disabled}
            tabIndex={props.disabled ? -1 : 0}
            onMouseDown={(event) => event.preventDefault()}
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setShowPassword((prev) => !prev)
            }}
          >
            {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
      ) : (
        inputNode
      )}
      {message && <small id={errorId} className="field__error" role="alert">{message}</small>}
    </label>
  )
}

export function SelectField({ label, children, error, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode; error?: string }) {
  const [validationError, setValidationError] = useState('')
  const required = props.required === true
  const message = error || validationError
  const generatedId = useId()
  const onBlur = (event: React.FocusEvent<HTMLSelectElement>) => {
    const nextError = validateControl(event.currentTarget, label)
    setValidationError(nextError)
    props.onBlur?.(event)
  }
  const onInvalid = (event: FormEvent<HTMLSelectElement>) => {
    event.preventDefault()
    setValidationError(validateControl(event.currentTarget, label))
    focusFirstInvalid(event.currentTarget)
    props.onInvalid?.(event)
  }
  const onChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextError = validateControl(event.currentTarget, label)
    if (validationError) setValidationError(nextError)
    props.onChange?.(event)
  }
  const errorId = `${props.id ?? props.name ?? generatedId}-error`
  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      <select {...props} aria-required={required} aria-invalid={Boolean(message) || props['aria-invalid']} aria-describedby={message && errorId ? [props['aria-describedby'], errorId].filter(Boolean).join(' ') : props['aria-describedby']} onChange={onChange} onBlur={onBlur} onInvalid={onInvalid}>{children}</select>
      {message && <small id={errorId} className="field__error" role="alert">{message}</small>}
    </label>
  )
}

export function TextAreaField({ label, error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; error?: string }) {
  const [validationError, setValidationError] = useState('')
  const required = props.required === true
  const message = error || validationError
  const generatedId = useId()
  const onBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    const nextError = validateControl(event.currentTarget, label)
    setValidationError(nextError)
    props.onBlur?.(event)
  }
  const onInvalid = (event: FormEvent<HTMLTextAreaElement>) => {
    event.preventDefault()
    setValidationError(validateControl(event.currentTarget, label))
    focusFirstInvalid(event.currentTarget)
    props.onInvalid?.(event)
  }
  const onChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextError = validateControl(event.currentTarget, label)
    if (validationError) setValidationError(nextError)
    props.onChange?.(event)
  }
  const errorId = `${props.id ?? props.name ?? generatedId}-error`
  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      <textarea {...props} aria-required={required} aria-invalid={Boolean(message) || props['aria-invalid']} aria-describedby={message && errorId ? [props['aria-describedby'], errorId].filter(Boolean).join(' ') : props['aria-describedby']} onChange={onChange} onBlur={onBlur} onInvalid={onInvalid} />
      {message && <small id={errorId} className="field__error" role="alert">{message}</small>}
    </label>
  )
}

export function SearchField({ value, onChange, placeholder = 'Search' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="search-field">
      <Search size={18} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Modal({ title, children, onClose, width = 620 }: { title: string; children: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const close = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal" style={{ maxWidth: width }} role="dialog" aria-modal="true" aria-label={title}>
        <header><h2>{title}</h2><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></header>
        {children}
      </section>
    </div>
  )
}

export function StatusBadge({ value }: { value: string | boolean }) {
  const text = typeof value === 'boolean' ? (value ? 'Active' : 'Inactive') : value
  const positive = value === true || ['active', 'posted', 'completed', 'available'].includes(String(value).toLowerCase())
  const negative = value === false || ['inactive', 'void', 'cancelled'].includes(String(value).toLowerCase())
  return <span className={`badge ${positive ? 'badge--positive' : negative ? 'badge--negative' : ''}`}>{text}</span>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty"><h3>{title}</h3><p>{detail}</p></div>
}

export function LoadingState() {
  return <div className="loading"><LoaderCircle className="spin" /> Loading…</div>
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => unknown }) {
  return <div className="alert alert--error error-state" role="alert"><span>{message}</span>{onRetry && <Button type="button" variant="secondary" onClick={() => void onRetry()}>Retry</Button>}</div>
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>
}
