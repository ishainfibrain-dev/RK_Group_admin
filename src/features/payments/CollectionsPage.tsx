import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Ban, Plus } from 'lucide-react'
import { useAuth } from '../../app/AuthProvider'
import { usePaymentRouting } from '../../app/PaymentRoutingProvider'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchField, SelectField, StatusBadge, TextAreaField } from '../../components/ui'
import { friendlyError, money, shortDate, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { bookingsApi, paymentsApi } from '../../services/api'

export function CollectionsPage() {
  const { has } = useAuth(); const client = useQueryClient(); const [search, setSearch] = useState(''); const [fromDate, setFromDate] = useState(''); const [toDate, setToDate] = useState(''); const [creating, setCreating] = useState(false); const [selectedBookingId, setSelectedBookingId] = useState(''); const [voiding, setVoiding] = useState<string | null>(null)
  const { availablePaymentMethods } = usePaymentRouting()
  const payments = useQuery({ queryKey: queryKeys.payments, queryFn: paymentsApi.list })
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: bookingsApi.list })
  const create = useMutation({ mutationFn: paymentsApi.record, onSuccess: () => { setCreating(false); setSelectedBookingId(''); void client.invalidateQueries({ queryKey: queryKeys.payments }); void client.invalidateQueries({ queryKey: queryKeys.bookings }); void client.invalidateQueries({ queryKey: queryKeys.dashboard }) } })
  const voidMutation = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => paymentsApi.void(id, reason), onSuccess: () => { setVoiding(null); void client.invalidateQueries({ queryKey: queryKeys.payments }); void client.invalidateQueries({ queryKey: queryKeys.bookings }) } })
  const selectedBooking = bookings.data?.find((booking) => booking.id === selectedBookingId)
  const filtered = useMemo(() => (payments.data ?? []).filter((p) => {
    const matchesSearch = [p.booking?.customer?.full_name, p.method, p.status, p.reference_number].some((value) => value?.toLowerCase().includes(search.toLowerCase()))
    const matchesFromDate = !fromDate || p.paid_on >= fromDate
    const matchesToDate = !toDate || p.paid_on <= toDate
    return matchesSearch && matchesFromDate && matchesToDate
  }), [fromDate, payments.data, search, toDate])
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (create.isPending) return
    const data = new FormData(event.currentTarget)
    create.mutate({
      bookingId: String(data.get('booking_id')),
      amount: Number(data.get('amount')),
      paidOn: String(data.get('paid_on')),
      method: String(data.get('method')),
      reference: String(data.get('reference') || '').trim(),
    })
  }
  return <><PageHeader title="Collections" description="Payment records, customer receipts and outstanding balances." actions={has('payments.create') ? <Button onClick={() => { setSelectedBookingId(''); setCreating(true) }}><Plus size={17} /> Add payment</Button> : undefined} /><div className="toolbar collections-toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search customer, method, status or reference" /><div className="collection-date-filters"><Field aria-label="From date" label="From date" type="date" value={fromDate} max={toDate || undefined} onChange={(event) => setFromDate(event.target.value)} /><Field aria-label="To date" label="To date" type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} />{(fromDate || toDate) && <Button type="button" variant="secondary" onClick={() => { setFromDate(''); setToDate('') }}>Clear</Button>}</div></div>{payments.error && payments.data && <ErrorState message="Refresh failed. Showing the last loaded payments." onRetry={() => payments.refetch()} />}{payments.isLoading ? <LoadingState /> : payments.error && !payments.data ? <ErrorState message={friendlyError(payments.error)} onRetry={() => payments.refetch()} /> : filtered.length === 0 ? <EmptyState title="No payments found" detail="Adjust the search or date range, or record a payment against an active booking." /> : <div className="card table-wrap"><table><thead><tr><th>Customer</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>{filtered.map((payment) => <tr key={payment.id}><td><strong>{payment.booking?.customer?.full_name || 'Customer'}</strong></td><td>{shortDate(payment.paid_on)}</td><td>{titleCase(payment.method)}</td><td>{payment.reference_number || '—'}</td><td className="money">{money.format(payment.amount)}</td><td><StatusBadge value={payment.status} /></td><td>{has('payments.void') && payment.status === 'posted' && <Button variant="ghost" onClick={() => setVoiding(payment.id)} aria-label={`Void ${titleCase(payment.method)} payment`}><Ban size={17} /></Button>}</td></tr>)}</tbody></table></div>}{(create.error || voidMutation.error) && <div className="toast toast--error" role="alert">{friendlyError(create.error || voidMutation.error)}</div>}{creating && <Modal title="Add payment record" onClose={() => setCreating(false)}><form className="modal-form" onSubmit={submit}>{bookings.error && !bookings.data && <ErrorState message={friendlyError(bookings.error)} onRetry={() => bookings.refetch()} />}<div className="form-grid"><SelectField name="booking_id" label="Active booking" value={selectedBookingId} onChange={(event) => setSelectedBookingId(event.target.value)} disabled={!bookings.data} required><option value="" disabled>Select booking</option>{bookings.data?.filter((b) => b.status === 'active' && Number(b.outstanding ?? 0) > 0).map((b) => <option key={b.id} value={b.id}>{b.customer?.full_name} · Unit {b.unit?.unit_number} · {money.format(Number(b.outstanding))} due</option>)}</SelectField><Field name="amount" label="Amount" type="number" min={0.01} max={selectedBooking ? Number(selectedBooking.outstanding ?? 0) : undefined} step="0.01" required /><Field name="paid_on" label="Payment date" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={new Date().toISOString().slice(0, 10)} required /><SelectField name="method" label="Payment method" defaultValue="bank" required>{availablePaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</SelectField><Field name="reference" label="Reference number" maxLength={100} /></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => { setCreating(false); setSelectedBookingId('') }}>Cancel</Button><Button type="submit" loading={create.isPending}>Record payment</Button></div></form></Modal>}{voiding && <Modal title="Void payment" onClose={() => setVoiding(null)}><form className="modal-form" onSubmit={(event) => { event.preventDefault(); if (!voidMutation.isPending) voidMutation.mutate({ id: voiding, reason: String(new FormData(event.currentTarget).get('reason') || '').trim() }) }}><TextAreaField name="reason" label="Void reason" minLength={3} maxLength={500} required /><p className="form-note">Posted payment details are immutable. Void this receipt before recording its replacement.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setVoiding(null)}>Keep payment</Button><Button type="submit" variant="danger" loading={voidMutation.isPending}>Void payment</Button></div></form></Modal>}</>
}
