import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Field } from '../../components/ui'
import { authApi } from '../../services/api'
import { friendlyError } from '../../lib/format'

export function RecoveryPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 10) { setError('Use at least 10 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setBusy(true); setError('')
    try { await authApi.updatePassword(password); navigate('/') }
    catch (reason) { setError(friendlyError(reason)) }
    finally { setBusy(false) }
  }
  return <div className="auth-page auth-page--single"><section className="auth-card"><img src="/rk-logo.png" alt="RK Group" /><h1>Set new password</h1><form onSubmit={submit}><Field label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /><Field label="Confirm password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />{error && <div className="alert alert--error">{error}</div>}<Button type="submit" loading={busy}>Save password</Button></form></section></div>
}
