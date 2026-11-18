export const money = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const integer = new Intl.NumberFormat('en-IN')

export function shortDate(value: string | null | undefined) {
  if (!value) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function friendlyError(error: unknown) {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message)
      : String(error)
  const normalized = message.replace(/^Error:\s*/, '').toLowerCase()
  if (/jwt|expired token|token has expired|session.*expired/.test(normalized)) return 'Your session expired. Please sign in again.'
  if (/inactive|deactivated|disabled account/.test(normalized)) return 'This account is inactive. Contact an administrator.'
  if (/row-level security|permission denied|unauthorized|forbidden|insufficient permission/.test(normalized)) return 'You do not have permission to perform this action.'
  if (/invalid login credentials|invalid credentials/.test(normalized)) return 'Email or password is incorrect.'
  if (/duplicate|already registered|already exists|user already exists/.test(normalized)) {
    return /email|auth|registered/.test(normalized)
      ? 'An account with this email already exists.'
      : 'A record with the same details already exists.'
  }
  if (/failed to send a request|failed to fetch|network|fetch error/.test(normalized)) return 'Could not connect to the server. Check your connection and try again.'
  if (/cash.*unavailable|unavailable.*cash/.test(normalized)) return 'Cash payments are unavailable while Live1 is inactive.'
  if (/exceed.*outstanding|outstanding.*exceed/.test(normalized)) return 'The payment amount cannot exceed the outstanding balance.'
  return 'Something went wrong. Please try again. If it continues, contact an administrator.'
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const csv = [headers.map(escape).join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
