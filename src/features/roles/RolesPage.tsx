import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save, ShieldCheck } from 'lucide-react'
import { useAuth } from '../../app/AuthProvider'
import { Button, ErrorState, LoadingState, PageHeader } from '../../components/ui'
import { friendlyError, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { rolesApi } from '../../services/api'
import type { Permission } from '../../types/domain'

export function RolesPage() {
  const { has } = useAuth(); const client = useQueryClient(); const roles = useQuery({ queryKey: queryKeys.roles, queryFn: rolesApi.list }); const matrix = useQuery({ queryKey: queryKeys.permissions, queryFn: rolesApi.permissions })
  const [selected, setSelected] = useState<string | null>(null); const [draft, setDraft] = useState<Set<string> | null>(null)
  const role = roles.data?.find((item) => item.id === selected) ?? roles.data?.[0]
  const mapped = useMemo(() => new Set((matrix.data?.mappings ?? []).filter((item) => item.role_id === role?.id).map((item) => item.permission_id)), [matrix.data, role])
  const current = draft ?? mapped
  const save = useMutation({ mutationFn: () => rolesApi.setPermissions(role!.id, (matrix.data?.permissions ?? []).filter((p) => current.has(p.id)).map((p) => p.code)), onSuccess: () => { setDraft(null); void client.invalidateQueries({ queryKey: queryKeys.permissions }) } })
  if (roles.isLoading || matrix.isLoading) return <><PageHeader title="Roles & Permissions" description="Control administrative capabilities by role." /><LoadingState /></>
  const dataError = roles.error || matrix.error
  const retryData = () => Promise.all([roles.refetch(), matrix.refetch()])
  if (dataError && (!roles.data || !matrix.data)) return <><PageHeader title="Roles & Permissions" description="Control administrative capabilities by role." /><ErrorState message={friendlyError(dataError)} onRetry={retryData} /></>
  if (!roles.data || !matrix.data || !role) return <><PageHeader title="Roles & Permissions" description="Control administrative capabilities by role." /><ErrorState message="Role permissions could not be loaded." onRetry={retryData} /></>
  const grouped = (matrix.data?.permissions ?? []).reduce<Record<string, Permission[]>>((result, permission) => {
    (result[permission.module] ??= []).push(permission)
    return result
  }, {})
  const immutable = role.code === 'builder_admin' || !has('roles.manage')
  return <><PageHeader title="Roles & Permissions" description="Control administrative capabilities by role." actions={!immutable ? <Button onClick={() => { if (!save.isPending) save.mutate() }} loading={save.isPending} disabled={!draft}><Save size={17} /> Save permissions</Button> : undefined} />{dataError && <ErrorState message="Refresh failed. Showing the last loaded roles and permissions." onRetry={retryData} />}<div className="role-layout"><aside className="card role-list">{roles.data.map((item) => <button type="button" className={item.id === role.id ? 'active' : ''} key={item.id} onClick={() => { setSelected(item.id); setDraft(null) }}><ShieldCheck /><div><strong>{item.name}</strong><span>{item.description}</span></div></button>)}</aside><section className="card permission-panel"><header><div><p className="eyebrow">{role.code}</p><h2>{role.name}</h2></div>{immutable && <span className="badge">Protected</span>}</header>{Object.entries(grouped).map(([module, permissions]) => <fieldset key={module}><legend>{titleCase(module)}</legend><div className="permission-grid">{permissions?.map((permission) => <label key={permission.id}><input type="checkbox" checked={current.has(permission.id)} disabled={immutable} onChange={(event) => { const next = new Set(current); if (event.target.checked) next.add(permission.id); else next.delete(permission.id); setDraft(next) }} /><span><strong>{permission.name}</strong><small>{permission.description}</small></span></label>)}</div></fieldset>)}</section></div>{save.error && <div className="toast toast--error" role="alert">{friendlyError(save.error)}</div>}</>
}
