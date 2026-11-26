import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, UserCheck, UserX } from 'lucide-react'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchField, SelectField, StatusBadge } from '../../components/ui'
import { queryKeys } from '../../lib/query'
import { friendlyError, shortDate } from '../../lib/format'
import { rolesApi, usersApi } from '../../services/api'
import type { AppUser } from '../../types/domain'
import { useAuth } from '../../app/AuthProvider'

export function UsersPage() {
  const { has, profile } = useAuth()
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const users = useQuery({ queryKey: queryKeys.users, queryFn: () => usersApi.list() })
  const roles = useQuery({ queryKey: queryKeys.roles, queryFn: rolesApi.list })
  const action = useMutation({
    mutationFn: usersApi.action,
    onSuccess: () => { void client.invalidateQueries({ queryKey: queryKeys.users }); setCreating(false); setEditing(null); setSelected(new Set()) },
  })
  const filtered = useMemo(() => (users.data ?? []).filter((user) => [user.full_name, user.email, user.phone, user.role?.name].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [users.data, search])
  const selectableUsers = useMemo(() => filtered.filter((user) => user.id !== profile?.id), [filtered, profile?.id])

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (action.isPending) return
    const form = new FormData(event.currentTarget)
    action.mutate({
      action: 'create',
      email: String(form.get('email') || '').trim().toLowerCase(),
      password: form.get('password'),
      full_name: String(form.get('full_name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      designation: String(form.get('designation') || '').trim(),
      role_id: form.get('role_id'),
    })
  }

  function update(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') || '').trim()
    action.mutate({
      action: 'update',
      user_id: editing.id,
      email: String(form.get('email') || '').trim().toLowerCase(),
      full_name: String(form.get('full_name') || '').trim(),
      phone: String(form.get('phone') || '').trim(),
      designation: String(form.get('designation') || '').trim(),
      ...(has('users.assign_role') ? { role_id: String(form.get('role_id') || '') } : {}),
      ...(password ? { password } : {}),
    })
  }

  return <>
    <PageHeader title="Users" description="Create and manage application access." actions={has('users.create') ? <Button onClick={() => setCreating(true)}><Plus size={17} /> Add user</Button> : undefined} />
    <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search name, email, phone or role" /></div>
    {selected.size > 0 && (
      <div className="bulk-toolbar card">
        <div className="bulk-toolbar__info">
          <span><strong>{selected.size}</strong> user{selected.size > 1 ? 's' : ''} selected</span>
          <button type="button" className="text-button" onClick={() => setSelected(new Set())}>Clear selection</button>
        </div>
        <div className="bulk-toolbar__actions">
          {has('users.update') && (
            <Button
              variant="danger"
              disabled={action.isPending}
              loading={action.isPending}
              onClick={() => {
                const count = selected.size
                if (window.confirm(`Are you sure you want to delete ${count} selected user${count > 1 ? 's' : ''}? This action cannot be undone.`)) {
                  action.mutate({ action: 'delete', user_ids: [...selected] })
                }
              }}
            >
              <Trash2 size={16} /> Delete selected ({selected.size})
            </Button>
          )}
        </div>
      </div>
    )}
    {users.error && users.data && <ErrorState message="Refresh failed. Showing the last loaded users." onRetry={() => users.refetch()} />}
    {users.isLoading ? <LoadingState /> : users.error && !users.data ? <ErrorState message={friendlyError(users.error)} onRetry={() => users.refetch()} /> : filtered.length === 0 ? <EmptyState title="No users found" detail="Adjust the search or create an application user." /> :
      <div className="card table-wrap"><table><thead><tr><th className="table-checkbox-cell"><input type="checkbox" className="table-checkbox" aria-label="Select all users" checked={selectableUsers.length > 0 && selectableUsers.every((user) => selected.has(user.id))} ref={(el) => { if (el) { const some = selectableUsers.some((user) => selected.has(user.id)); const all = selectableUsers.length > 0 && selectableUsers.every((user) => selected.has(user.id)); el.indeterminate = some && !all } }} onChange={(e) => { if (e.target.checked) { setSelected(new Set([...selected, ...selectableUsers.map((u) => u.id)])) } else { const next = new Set(selected); selectableUsers.forEach((u) => next.delete(u.id)); setSelected(next) } }} /></th><th>User</th><th>Role</th><th>Designation</th><th>Created</th><th>Status</th><th></th></tr></thead><tbody>
        {filtered.map((user) => <tr className={selected.has(user.id) ? 'table-row--selected' : ''} key={user.id}><td className="table-checkbox-cell" onClick={(e) => e.stopPropagation()}>{user.id !== profile?.id && <input type="checkbox" className="table-checkbox" aria-label={`Select ${user.full_name}`} checked={selected.has(user.id)} onChange={(e) => { const next = new Set(selected); if (e.target.checked) next.add(user.id); else next.delete(user.id); setSelected(next) }} />}</td><td><div className="identity"><div className="avatar avatar--small">{user.full_name.slice(0, 1)}</div><div><strong>{user.full_name}</strong><span>{user.email ?? user.phone ?? 'No contact'}</span></div></div></td><td>{user.role?.name ?? 'Unassigned'}</td><td>{user.designation}</td><td>{shortDate(user.created_at)}</td><td><StatusBadge value={user.is_active} /></td><td><div className="row-actions">{has('users.update') && <Button variant="ghost" title={`Edit ${user.full_name}`} aria-label={`Edit ${user.full_name}`} onClick={() => setEditing(user)}><Pencil size={17} /></Button>}{has(user.is_active ? 'users.deactivate' : 'users.activate') && <Button variant="ghost" title={user.is_active ? 'Deactivate' : 'Activate'} onClick={() => action.mutate({ action: user.is_active ? 'deactivate' : 'activate', user_id: user.id })}>{user.is_active ? <UserX size={18} /> : <UserCheck size={18} />}</Button>}{has('users.update') && user.id !== profile?.id && <Button variant="ghost" className="button--ghost-danger" title={`Delete ${user.full_name}`} aria-label={`Delete ${user.full_name}`} onClick={() => { if (window.confirm(`Are you sure you want to delete user "${user.full_name}"? This action cannot be undone.`)) { action.mutate({ action: 'delete', user_id: user.id }) } }}><Trash2 size={17} /></Button>}</div></td></tr>)}
      </tbody></table></div>}
    {action.error && <div className="toast toast--error" role="alert">{friendlyError(action.error)}</div>}
    {creating && <Modal title="Create application user" onClose={() => setCreating(false)}><form className="modal-form" autoComplete="off" onSubmit={create}><div className="form-grid"><Field name="full_name" label="Full name" required autoComplete="off" maxLength={120} /><Field name="email" label="Email" type="email" autoComplete="off" required maxLength={254} /><Field name="phone" label="Phone" type="tel" /><Field name="designation" label="Designation" defaultValue="Property Owner" autoComplete="off" maxLength={100} required /><SelectField name="role_id" label="Role" required defaultValue=""><option value="" disabled>Select role</option>{roles.data?.filter((r) => r.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectField><Field name="password" label="Temporary password" type="password" autoComplete="new-password" minLength={10} maxLength={128} required /></div><p className="form-note">The user can change this password using the application recovery flow.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" loading={action.isPending}>Create user</Button></div></form></Modal>}
    {editing && <Modal title="Edit application user" onClose={() => setEditing(null)}><form className="modal-form" autoComplete="off" onSubmit={update}><div className="form-grid"><Field name="full_name" label="Full name" defaultValue={editing.full_name} required maxLength={120} /><Field name="email" label="Email" type="email" autoComplete="off" defaultValue={editing.email ?? ''} required maxLength={254} /><Field name="phone" label="Phone" type="tel" defaultValue={editing.phone ?? ''} /><Field name="designation" label="Designation" defaultValue={editing.designation} maxLength={100} required />{has('users.assign_role') && <SelectField name="role_id" label="Role" required defaultValue={editing.role_id}><option value="" disabled>Select role</option>{roles.data?.filter((r) => r.is_active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</SelectField>}<Field name="password" label="Reset password" type="password" autoComplete="new-password" minLength={10} maxLength={128} placeholder="Enter a new password" /></div><p className="form-note">Changing the email updates the user’s Supabase Auth login address. For security, existing passwords are encrypted and cannot be viewed — enter a new password only if you wish to reset it.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={action.isPending}>Save changes</Button></div></form></Modal>}
  </>
}
