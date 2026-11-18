import { X, Search, LoaderCircle } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type ClipboardEvent, type InputHTMLAttributes, type KeyboardEvent as ReactKeyboardEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

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

export function Field({ label, error, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const required = props.required === true
  const numeric = props.type === 'number'
  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (numeric && (event.key === 'e' || event.key === 'E')) event.preventDefault()
    props.onKeyDown?.(event)
  }
  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    if (numeric && !/^-?\d*(\.\d*)?$/.test(event.clipboardData.getData('text'))) event.preventDefault()
    props.onPaste?.(event)
  }
  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      <input {...props} inputMode={numeric ? 'decimal' : props.inputMode} onKeyDown={onKeyDown} onPaste={onPaste} />
      {error && <small className="field__error">{error}</small>}
    </label>
  )
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  const required = props.required === true
  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      <select {...props}>{children}</select>
    </label>
  )
}

export function TextAreaField({ label, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  const required = props.required === true
  return (
    <label className="field">
      <span>{label}{required && <b className="field-required" aria-hidden="true">*</b>}</span>
      <textarea {...props} />
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

export function ErrorState({ message }: { message: string }) {
  return <div className="alert alert--error">{message}</div>
}

export function PageHeader({ title, description, actions }: { title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div><h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>
}
