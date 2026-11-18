import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, UserCheck, UserX } from 'lucide-react'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchField, SelectField, StatusBadge } from '../../components/ui'
import { queryKeys } from '../../lib/query'
import { friendlyError, shortDate } from '../../lib/format'
import { rolesApi, usersApi } from '../../services/api'
import type { AppUser } from '../../types/domain'
import { useAuth } from '../../app/AuthProvider'

export function UsersPage() {
  const { has } = useAuth()
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const users = useQuery({ queryKey: queryKeys.users, queryFn: () => usersApi.list() })
  const roles = useQuery({ queryKey: queryKeys.roles, queryFn: rolesApi.list })
  const action = useMutation({
    mutationFn: usersApi.action,
    onSuccess: () => { void client.invalidateQueries({ queryKey: queryKeys.users }); setCreating(false); setEditing(null) },
  })
  const filtered = useMemo(() => (users.data ?? []).filter((user) => [user.full_name, user.email, user.phone, user.role?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [users.data, search])

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    action.mutate({
      action: 'create',
      email: form.get('email'), password: form.get('password'), full_name: form.get('full_name'),
      phone: form.get('phone'), designation: form.get('designation'), role_id: form.get('role_id'),
    })
  }

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    action.mutate({
      action: 'update',
      user_id: editing.id,
      email: String(form.get('email') || '').trim().toLowerCase(),
      full_name: String(form.get('full_name') || ''),
      phone: String(form.get('phone') || ''),
      designation: String(form.get('designation') || ''),
      ...(has('users.assign_role') ? { role_id: String(form.get('role_id') || '') } : {}),
    })
  }

  return <>
    <PageHeader title="Users" description="Create and manage application access." actions={has('users.create') ? <Button onClick={() => setCreating(true)}><Plus size={17} /> Add user</Button> : undefined} />
    <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search name, email, phone or role" /></div>
    {users.isLoading ? <LoadingState /> : users.error ? <ErrorState message={friendlyError(users.error)} /> : filtered.length === 0 ? <EmptyState title="No users found" detail="Adjust the search or create an application user." /> :
      <div className="card table-wrap"><table><thead><tr><th>User</th><th>Role</th><th>Designation</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map((user) => <tr key={user.id}><td><div className="identity"><div className="avatar avatar--small">{user.full_name.slice(0, 1)}</div><div><strong>{user.full_name}</strong><span>{user.email ?? user.phone ?? 'No contact'}</span></div></div></td><td>{user.role?.name ?? 'Unassigned'}</td><td>{user.designation}</td><td>{shortDate(user.created_at)}</td><td><StatusBadge value={user.is_active} /></td><td><div className="row-actions">{has('users.update') && <Button variant="ghost" title={`Edit ${user.full_name}`} aria-label={`Edit ${user.full_name}`} onClick={() => setEditing(user)}><Pencil size={17} /></Button>}{has(user.is_active ? 'users.deactivate' : 'users.activate') && <Button variant="ghost" title={user.is_active ? 'Deactivate' : 'Activate'} onClick={() => action.mutate({ action: user.is_active ? 'deactivate' : 'activate', user_id: user.id })}>{user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}</Button>}</div></td></tr>)}
      </tbody></table></div>}
    {action.error && <div className="toast toast--error">{friendlyError(action.error)}</div>}
    {creating && <Modal title="Create application user" onClose={() => setCreating(false)}><form className="modal-form" onSubmit={create}><div className="form-grid"><Field name="full_name" label="Full name" required /><Field name="email" label="Email" type="email" required /><Field name="phone" label="Phone" /><Field name="designation" label="Designation" defaultValue="Property Owner" required /><SelectField name="role_id" label="Role" required defaultValue=""><option value="" disabled>Select role</option>{roles.data?.filter((r) => r.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectField><Field name="password" label="Temporary password" type="password" minLength={10} required /></div><p className="form-note">The user can change this password using the application recovery flow.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={action.isPending}>Create user</Button></div></form></Modal>}
    {editing && <Modal title="Edit application user" onClose={() => setEditing(null)}><form className="modal-form" onSubmit={update}><div className="form-grid"><Field name="full_name" label="Full name" defaultValue={editing.full_name} required /><Field name="email" label="Email" type="email" defaultValue={editing.email ?? ''} required /><Field name="phone" label="Phone" defaultValue={editing.phone ?? ''} /><Field name="designation" label="Designation" defaultValue={editing.designation} required />{has('users.assign_role') && <SelectField name="role_id" label="Role" required defaultValue={editing.role_id}><option value="" disabled>Select role</option>{roles.data?.filter((r) => r.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectField>}</div><p className="form-note">Changing the email updates the user’s Supabase Auth login address.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={action.isPending}>Save changes</Button></div></form></Modal>}
  </>
}
