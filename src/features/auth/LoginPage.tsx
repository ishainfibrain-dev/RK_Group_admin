import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button, Field } from '../../components/ui'
import { authApi } from '../../services/api'
import { friendlyError } from '../../lib/format'
import { useAuth } from '../../app/AuthProvider'

export function LoginPage() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (session) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setBusy(true); setError(''); setMessage('')
    try { await authApi.signIn(email.trim(), password) }
    catch (reason) { setError(friendlyError(reason)) }
    finally { setBusy(false) }
  }

  async function recover() {
    if (!email.trim()) { setError('Enter your email address first.'); return }
    setBusy(true); setError('')
    try { await authApi.sendRecovery(email.trim()); setMessage('Password recovery instructions have been sent.') }
    catch (reason) { setError(friendlyError(reason)) }
    finally { setBusy(false) }
  }

  return (
    <div className="auth-page">
      <aside className="auth-visual"><div><span>One connected workspace</span><h2>Every project. Every booking. Every collection.</h2><p>Securely managed through the existing RK Group Supabase architecture.</p></div></aside>
      <section className="auth-card">
        <img src="/rk-logo.png" alt="RK Group" />
        <div><p className="eyebrow">THE LANDMARK CREATORS</p><h1>Admin sign in</h1><p>Manage RK Group users, portfolio, bookings and collections.</p></div>
        <form onSubmit={submit}>
          <Field label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          {error && <div className="alert alert--error">{error}</div>}
          {message && <div className="alert alert--success">{message}</div>}
          <Button type="submit" loading={busy}>Sign in</Button>
          <button type="button" className="text-button" onClick={() => void recover()}>Forgot password?</button>
        </form>
      </section>
    </div>
  )
}
