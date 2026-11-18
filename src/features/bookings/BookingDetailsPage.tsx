import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Banknote, CreditCard, Pencil } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { usePaymentRouting } from '../../app/PaymentRoutingProvider'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SelectField, StatusBadge } from '../../components/ui'
import { friendlyError, money, shortDate, titleCase } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { bookingsApi, customersApi, inventoryApi, paymentsApi, projectsApi } from '../../services/api'
import type { Payment } from '../../types/domain'

export function BookingDetailsPage() {
  const { has, profile } = useAuth()
  const { availablePaymentMethods, live1Active } = usePaymentRouting()
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const client = useQueryClient()
  const [recordingPayment, setRecordingPayment] = useState(false)
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null)
  const visibleEditingPayment = !live1Active && editingPayment?.method === 'cash' ? null : editingPayment
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: bookingsApi.list })
  const payments = useQuery({ queryKey: queryKeys.payments, queryFn: paymentsApi.list })
  const customers = useQuery({ queryKey: queryKeys.customers, queryFn: customersApi.list })
  const inventory = useQuery({ queryKey: queryKeys.inventory, queryFn: inventoryApi.list })
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list })
  const recordPayment = useMutation({
    mutationFn: paymentsApi.record,
    onSuccess: () => {
      setRecordingPayment(false)
      void client.invalidateQueries({ queryKey: queryKeys.payments })
      void client.invalidateQueries({ queryKey: queryKeys.bookings })
      void client.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
  const replacePayment = useMutation({
    mutationFn: paymentsApi.replace,
    onSuccess: () => {
      setEditingPayment(null)
      void client.invalidateQueries({ queryKey: queryKeys.payments })
      void client.invalidateQueries({ queryKey: queryKeys.bookings })
      void client.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })

  const booking = useMemo(() => bookings.data?.find((item) => item.id === bookingId), [bookingId, bookings.data])
  if (bookings.isLoading || payments.isLoading || customers.isLoading || inventory.isLoading || projects.isLoading) return <><PageHeader title="Booking details" description="Loading property and payment history." /><LoadingState /></>
  const error = bookings.error || payments.error || customers.error || inventory.error || projects.error
  if (error || !inventory.data) return <><PageHeader title="Booking details" description="Property, financials and payment history." /><ErrorState message={friendlyError(error)} /></>
  if (!booking) return <><PageHeader title="Booking not found" description="This booking may have been cancelled or removed." actions={<Button variant="secondary" onClick={() => navigate('/projects')}><ArrowLeft size={17} /> Projects</Button>} /><EmptyState title="No booking available" detail="Return to Projects and select another booked property." /></>

  const customer = customers.data?.find((item) => item.id === booking.customer_id)
  const unit = inventory.data.units.find((item) => item.id === booking.unit_id)
  const floor = inventory.data.floors.find((item) => item.id === unit?.floor_id)
  const block = inventory.data.blocks.find((item) => item.id === floor?.block_id)
  const project = projects.data?.find((item) => item.id === block?.project_id)
  const bookingPayments = (payments.data ?? []).filter((payment) => payment.booking_id === booking.id && payment.status === 'posted')
  const outstanding = Number(booking.outstanding ?? 0)
  const canRecordPayment = booking.status === 'active' && outstanding > 0

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    recordPayment.mutate({
      bookingId: booking!.id,
      amount: Number(data.get('amount')),
      paidOn: String(data.get('paid_on')),
      method: String(data.get('method')),
      reference: String(data.get('reference') || ''),
    })
  }

  function submitPaymentEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!visibleEditingPayment) return
    const data = new FormData(event.currentTarget)
    replacePayment.mutate({
      paymentId: visibleEditingPayment.id,
      amount: Number(data.get('amount')),
      paidOn: String(data.get('paid_on')),
      method: String(data.get('method')),
      reference: String(data.get('reference') || ''),
    })
  }

  return <>
    <PageHeader title="Booking details" description={`${project?.name || 'Project'} · Property ${unit?.unit_number || booking.unit?.unit_number || '—'}`} actions={<Button variant="secondary" onClick={() => project ? navigate(`/projects/${project.id}`) : navigate(-1)}><ArrowLeft size={17} /> Back to project</Button>} />
    <section className="booking-detail-shell">
      <div className="booking-detail-identity">
        <div><p className="eyebrow">{project?.category || unit?.unit_kind || 'Property'}</p><h2>{customer?.full_name || booking.customer?.full_name || 'Customer'}</h2><p>{unit?.unit_kind || 'property'} {unit?.unit_number || booking.unit?.unit_number || '—'}{block ? ` · Block ${block.name}` : ''}{floor ? ` · ${floor.label}` : ''}</p></div>
        <StatusBadge value={booking.status} />
      </div>
      <div className="booking-detail-financials card">
        <div><span>Agreement value</span><strong>{money.format(Number(booking.agreement_value))}</strong></div>
        <div><span>Amount received</span><strong>{money.format(Number(booking.amount_received ?? 0))}</strong></div>
        <div><span>Outstanding</span><strong>{money.format(outstanding)}</strong></div>
        <div><span>Booking date</span><strong>{shortDate(booking.booked_on)}</strong></div>
      </div>
      {canRecordPayment && <Button className="booking-record-payment" onClick={() => setRecordingPayment(true)}><CreditCard size={19} /> Record payment</Button>}
      <div className="booking-history-heading"><div><h2>Payment history</h2><p>Posted receipts for this booking.</p></div><span>{bookingPayments.length} {bookingPayments.length === 1 ? 'receipt' : 'receipts'}</span></div>
      {bookingPayments.length === 0 ? <EmptyState title="No payment history" detail="No payments have been recorded against this booking." /> : <div className="booking-payment-list">{bookingPayments.map((payment) => <article key={payment.id} className="booking-payment-row">
        <div className="booking-payment-icon"><Banknote /></div>
        <div><strong>{titleCase(payment.method)}</strong><span>{shortDate(payment.paid_on)}{payment.reference_number ? ` · ${payment.reference_number}` : ''}</span></div>
        <div className="booking-payment-row__actions"><strong>{money.format(Number(payment.amount))}</strong>{(payment.owner_id === profile?.id || has('payments.void')) && <Button variant="ghost" aria-label={`Edit ${titleCase(payment.method)} payment from ${shortDate(payment.paid_on)}`} onClick={() => setEditingPayment(payment)}><Pencil size={16} /></Button>}</div>
      </article>)}</div>}
      <p className="booking-history-note">Payment entries are bookkeeping records only. No funds are transferred.</p>
    </section>
    {(recordPayment.error || replacePayment.error) && <div className="toast toast--error">{friendlyError(recordPayment.error || replacePayment.error)}</div>}
    {recordingPayment && <Modal title="Record payment" onClose={() => setRecordingPayment(false)}><form className="modal-form" onSubmit={submitPayment}>
      <div className="payment-property-summary"><span>Selected booking</span><strong>{project?.name || 'Project'} · Property {unit?.unit_number || booking.unit?.unit_number || '—'}</strong><small>{money.format(outstanding)} outstanding</small></div>
      <div className="form-grid"><Field name="amount" label="Amount" type="number" min={1} max={outstanding} step="0.01" required /><Field name="paid_on" label="Payment date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><SelectField name="method" label="Payment method" defaultValue="bank">{availablePaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</SelectField><Field name="reference" label="Reference number" /></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setRecordingPayment(false)}>Cancel</Button><Button type="submit" loading={recordPayment.isPending}>Record payment</Button></div>
    </form></Modal>}
    {visibleEditingPayment && <Modal title="Edit payment entry" onClose={() => setEditingPayment(null)}><form className="modal-form" onSubmit={submitPaymentEdit}>
      <div className="payment-property-summary"><span>Selected receipt</span><strong>{titleCase(visibleEditingPayment.method)} · {shortDate(visibleEditingPayment.paid_on)}</strong><small>{project?.name || 'Project'} · Property {unit?.unit_number || booking.unit?.unit_number || '—'}</small></div>
      <div className="form-grid"><Field name="amount" label="Amount" type="number" min={1} max={outstanding + Number(visibleEditingPayment.amount)} step="0.01" defaultValue={visibleEditingPayment.amount} required /><Field name="paid_on" label="Payment date" type="date" defaultValue={visibleEditingPayment.paid_on} required /><SelectField name="method" label="Payment method" defaultValue={visibleEditingPayment.method}>{availablePaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</SelectField><Field name="reference" label="Reference number" defaultValue={visibleEditingPayment.reference_number ?? ''} /></div>
      <p className="form-note">Saving preserves the original receipt in the audit history and creates a corrected replacement.</p>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditingPayment(null)}>Cancel</Button><Button type="submit" loading={replacePayment.isPending}>Save changes</Button></div>
    </form></Modal>}
  </>
}
