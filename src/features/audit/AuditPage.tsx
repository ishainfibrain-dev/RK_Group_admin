import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { EmptyState, ErrorState, LoadingState, PageHeader, SearchField, StatusBadge } from '../../components/ui'
import { friendlyError, shortDate, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { auditApi } from '../../services/api'

export function AuditPage() {
  const [search, setSearch] = useState(''); const query = useQuery({ queryKey: queryKeys.audit, queryFn: auditApi.list })
  const filtered = useMemo(() => (query.data ?? []).filter((e) => [e.action, e.entity_type, e.entity_id, e.reason].some((value) => value?.toLowerCase().includes(search.toLowerCase()))), [query.data, search])
  return <><PageHeader title="Audit Log" description="Immutable history of administrative and operational changes." /><div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search action, entity or identifier" /></div>{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={friendlyError(query.error)} /> : filtered.length === 0 ? <EmptyState title="No audit events" detail="Administrative changes will appear here." /> : <div className="card table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Identifier</th><th>Actor</th></tr></thead><tbody>{filtered.map((event) => <tr key={event.id}><td>{shortDate(event.created_at)}</td><td><StatusBadge value={titleCase(event.action)} /></td><td>{titleCase(event.entity_type)}</td><td><code>{event.entity_id || '—'}</code></td><td><code>{event.actor_id?.slice(0, 8) || 'System'}</code></td></tr>)}</tbody></table></div>}</>
}
