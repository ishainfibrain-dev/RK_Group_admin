import { useQuery } from '@tanstack/react-query'
import { Download, IndianRupee, ReceiptText, WalletCards } from 'lucide-react'
import { useAuth } from '../../app/AuthProvider'
import { Button, ErrorState, LoadingState, PageHeader } from '../../components/ui'
import { downloadCsv, friendlyError, money, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { paymentsApi } from '../../services/api'

export function ReportsPage() {
  const { has } = useAuth(); const query = useQuery({ queryKey: queryKeys.payments, queryFn: paymentsApi.list })
  if (query.isLoading) return <><PageHeader title="Reports" description="Operational collection summaries." /><LoadingState /></>
  if (query.error) return <><PageHeader title="Reports" description="Operational collection summaries." /><ErrorState message={friendlyError(query.error)} /></>
  const posted = (query.data ?? []).filter((p) => p.status === 'posted'); const total = posted.reduce((s, p) => s + Number(p.amount), 0); const grouped = posted.reduce<Record<string, typeof posted>>((result, payment) => { (result[payment.method] ??= []).push(payment); return result }, {}); const methods = Object.entries(grouped).map(([method, rows]) => ({ method, count: rows.length, total: rows.reduce((s, p) => s + Number(p.amount), 0) }))
  return <><PageHeader title="Reports" description="Operational collection summaries." actions={has('reports.export') ? <Button onClick={() => downloadCsv('rk-group-collection-report.csv', posted as any)}><Download size={17} /> Export CSV</Button> : undefined} /><section className="metric-grid metric-grid--three"><article className="metric-card"><div className="metric-icon"><IndianRupee /></div><span>Posted collections</span><strong>{money.format(total)}</strong><small>Void payments excluded</small></article><article className="metric-card"><div className="metric-icon"><ReceiptText /></div><span>Receipts</span><strong>{posted.length}</strong><small>Posted payment records</small></article><article className="metric-card"><div className="metric-icon"><WalletCards /></div><span>Payment methods</span><strong>{methods.length}</strong><small>Methods currently represented</small></article></section><div className="card table-wrap"><table><thead><tr><th>Method</th><th>Receipts</th><th>Total received</th><th>Share</th></tr></thead><tbody>{methods.map((row) => <tr key={row.method}><td>{titleCase(row.method)}</td><td>{row.count}</td><td className="money">{money.format(row.total)}</td><td>{total ? `${((row.total / total) * 100).toFixed(1)}%` : '0%'}</td></tr>)}</tbody></table></div></>
}
