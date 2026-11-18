import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Banknote, Database, ShieldAlert } from 'lucide-react'
import { useAuth } from '../../app/AuthProvider'
import { Button, ErrorState, LoadingState, PageHeader, StatusBadge } from '../../components/ui'
import { friendlyError, shortDate } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { routingApi } from '../../services/api'

export function RoutingPage() {
  const { has } = useAuth(); const client = useQueryClient(); const query = useQuery({ queryKey: queryKeys.routing, queryFn: routingApi.get })
  const mutation = useMutation({ mutationFn: routingApi.setLive1, onSuccess: () => {
    void client.invalidateQueries({ queryKey: queryKeys.routing })
    void client.invalidateQueries({ queryKey: queryKeys.payments })
    void client.invalidateQueries({ queryKey: queryKeys.dashboard })
  } })
  if (query.isLoading) return <><PageHeader title="Payment Routing" description="Monitor the active RK Group collection feed." /><LoadingState /></>
  if (query.error || !query.data) return <><PageHeader title="Payment Routing" description="Monitor the active RK Group collection feed." /><ErrorState message={friendlyError(query.error)} /></>
  const config = query.data
  return <><PageHeader title="Payment Routing" description="Monitor the active RK Group collection feed." /><div className="routing-grid"><article className={`card routing-card ${config.live1_active ? 'routing-card--active' : ''}`}><Database /><div><p className="eyebrow">PRIMARY FEED</p><h2>Live1</h2><p>Contains every posted and void payment, including cash.</p></div><StatusBadge value={config.live1_active} /></article><article className={`card routing-card ${config.live2_active ? 'routing-card--active' : ''}`}><Banknote /><div><p className="eyebrow">NON-CASH FEED</p><h2>Live2</h2><p>Contains Bank, Cheques, UPI, RTGS and NEFT. Cash is excluded.</p></div><StatusBadge value={config.live2_active} /></article></div><section className="card routing-control"><div><ShieldAlert /><div><h2>Routing control</h2><p>Exactly one feed remains active. This operation uses the protected database workflow and never moves payment rows manually.</p><small>Last updated {shortDate(config.updated_at)}</small></div></div>{has('routing.manage') && config.live1_active && <Button variant="danger" loading={mutation.isPending} onClick={() => window.confirm('Deactivate Live1 and activate Live2? This is the supported one-way operation.') && mutation.mutate(false)}>Deactivate Live1</Button>}</section>{mutation.error && <div className="toast toast--error">{friendlyError(mutation.error)}</div>}</>
}
