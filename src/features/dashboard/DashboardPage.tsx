import { useQuery } from '@tanstack/react-query'
import { Building2, CalendarCheck, Users, Warehouse } from 'lucide-react'
import { PageHeader, LoadingState, ErrorState, StatusBadge } from '../../components/ui'
import { dashboardApi } from '../../services/api'
import { money, shortDate, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'

export function DashboardPage() {
  const query = useQuery({ queryKey: queryKeys.dashboard, queryFn: dashboardApi.get })
  if (query.isLoading) return <><PageHeader title="Dashboard" description="Your RK Group portfolio at a glance." /><LoadingState /></>
  if (query.error || !query.data) return <><PageHeader title="Dashboard" description="Your RK Group portfolio at a glance." /><ErrorState message={String(query.error)} /></>
  const d = query.data
  const cards = [
    ['Active users', d.activeUsers, Users, 'Users with application access'],
    ['Our projects', d.activeProjects, Building2, 'Active residential and commercial'],
    ['Total units', d.totalUnits, Warehouse, `${d.availableUnits} currently available`],
    ['Active bookings', d.activeBookings, CalendarCheck, 'Open customer agreements'],
  ] as const
  return (
    <>
      <PageHeader title="Dashboard" description="Your RK Group portfolio at a glance." />
      <section className="metric-grid">
        {cards.map(([label, value, Icon, detail]) => <article className="metric-card" key={label}><div className="metric-icon"><Icon /></div><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>)}
      </section>
      <section className="card panel">
        <div className="panel-heading"><div><p className="eyebrow">COLLECTIONS</p><h2>Recent payments</h2></div></div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Method</th><th>Amount</th><th>Status</th></tr></thead><tbody>
          {d.recentPayments.map((payment: any) => <tr key={payment.id}><td>{shortDate(payment.paid_on)}</td><td>{titleCase(payment.method)}</td><td className="money">{money.format(Number(payment.amount))}</td><td><StatusBadge value={payment.status} /></td></tr>)}
        </tbody></table></div>
      </section>
    </>
  )
}
