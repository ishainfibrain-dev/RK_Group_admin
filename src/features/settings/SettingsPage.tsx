import { useState, type FormEvent } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Field, PageHeader } from '../../components/ui'
import { useAuth } from '../../app/AuthProvider'
import { friendlyError } from '../../lib/format'
import { profileApi } from '../../services/api'

export function SettingsPage() {
  const { profile, reload } = useAuth(); const [saved, setSaved] = useState(false)
  const mutation = useMutation({ mutationFn: profileApi.update, onSuccess: async () => { await reload(); setSaved(true) } })
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (mutation.isPending) return; const d = new FormData(event.currentTarget); mutation.mutate({ full_name: String(d.get('full_name') || '').trim(), phone: String(d.get('phone') || '').trim() || null }) }
  return <><PageHeader title="Settings" description="Your RK Group administrator profile." /><section className="card settings-card"><form onSubmit={submit}><div className="form-grid"><Field name="full_name" label="Full name" defaultValue={profile?.full_name} required /><Field name="phone" label="Phone" type="tel" defaultValue={profile?.phone ?? ''} /><Field label="Designation" value={profile?.designation ?? ''} disabled /><Field label="Role" value={profile?.role?.name ?? ''} disabled /></div>{mutation.error && <div className="alert alert--error">{friendlyError(mutation.error)}</div>}{saved && <div className="alert alert--success">Profile saved.</div>}<Button type="submit" loading={mutation.isPending}>Save profile</Button></form></section></>
}
