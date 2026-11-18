import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronRight, CreditCard, Pencil, Plus } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { usePaymentRouting } from '../../app/PaymentRoutingProvider'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SearchField, SelectField, StatusBadge, TextAreaField } from '../../components/ui'
import { friendlyError, money, shortDate } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { bookingsApi, customersApi, inventoryApi, paymentsApi, projectsApi } from '../../services/api'
import type { Booking, Customer } from '../../types/domain'

export function CustomersPage() {
  const { has } = useAuth()
  const { availablePaymentMethods } = usePaymentRouting()
  const client = useQueryClient()
  const navigate = useNavigate()
  const { customerId } = useParams()
  const customers = useQuery({ queryKey: queryKeys.customers, queryFn: customersApi.list })
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: bookingsApi.list, enabled: Boolean(customerId) })
  const inventory = useQuery({ queryKey: queryKeys.inventory, queryFn: inventoryApi.list, enabled: Boolean(customerId) })
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list, enabled: Boolean(customerId) })
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Customer | 'new' | null>(null)
  const [paymentBooking, setPaymentBooking] = useState<Booking | null>(null)

  const saveCustomer = useMutation({
    mutationFn: ({ values, id }: { values: any; id?: string }) => customersApi.save(values, id),
    onSuccess: () => {
      setEditing(null)
      void client.invalidateQueries({ queryKey: queryKeys.customers })
    },
  })
  const recordPayment = useMutation({
    mutationFn: paymentsApi.record,
    onSuccess: () => {
      setPaymentBooking(null)
      void client.invalidateQueries({ queryKey: queryKeys.payments })
      void client.invalidateQueries({ queryKey: queryKeys.bookings })
      void client.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })

  const filtered = useMemo(() => (customers.data ?? []).filter((customer) =>
    [customer.full_name, customer.phone, customer.email, customer.address]
      .some((value) => value?.toLowerCase().includes(search.toLowerCase())),
  ), [customers.data, search])
  const customer = useMemo(() => customers.data?.find((item) => item.id === customerId), [customerId, customers.data])
  const customerBookings = useMemo(() => (bookings.data ?? []).filter((booking) => booking.customer_id === customerId), [bookings.data, customerId])
  const retryDetails = () => Promise.all([
    customers.refetch(),
    bookings.refetch(),
    inventory.refetch(),
    projects.refetch(),
  ])

  function submitCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saveCustomer.isPending) return
    const data = new FormData(event.currentTarget)
    saveCustomer.mutate({
      values: {
        full_name: String(data.get('full_name') || '').trim(),
        phone: String(data.get('phone') || '').trim(),
        email: String(data.get('email') || '').trim().toLowerCase() || null,
        address: String(data.get('address') || '').trim() || null,
      },
      id: editing === 'new' ? undefined : editing?.id,
    })
  }

  function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentBooking || recordPayment.isPending) return
    const data = new FormData(event.currentTarget)
    recordPayment.mutate({
      bookingId: paymentBooking.id,
      amount: Number(data.get('amount')),
      paidOn: String(data.get('paid_on')),
      method: String(data.get('method')),
      reference: String(data.get('reference') || '').trim(),
    })
  }

  const customerModal = editing && <Modal title={editing === 'new' ? 'Add customer' : 'Edit customer'} onClose={() => setEditing(null)}><form className="modal-form" onSubmit={submitCustomer}><div className="form-grid"><Field name="full_name" label="Full name" defaultValue={editing === 'new' ? '' : editing.full_name} maxLength={120} required /><Field name="phone" label="Phone" type="tel" defaultValue={editing === 'new' ? '' : editing.phone} required /><Field name="email" label="Email" type="email" defaultValue={editing === 'new' ? '' : editing.email ?? ''} maxLength={254} /><TextAreaField name="address" label="Address" defaultValue={editing === 'new' ? '' : editing.address ?? ''} maxLength={500} /></div><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button><Button type="submit" loading={saveCustomer.isPending}>Save customer</Button></div></form></Modal>

  if (!customerId) return <>
    <PageHeader title="Customers" description="Bookings, balances and complete customer histories." actions={has('customers.create') ? <Button onClick={() => setEditing('new')}><Plus size={17} /> Add customer</Button> : undefined} />
    <div className="toolbar"><SearchField value={search} onChange={setSearch} placeholder="Search name, phone, email or address" /></div>
    {customers.error && customers.data && <ErrorState message="Refresh failed. Showing the last loaded customers." onRetry={() => customers.refetch()} />}
    {customers.isLoading ? <LoadingState /> : customers.error && !customers.data ? <ErrorState message={friendlyError(customers.error)} onRetry={() => customers.refetch()} /> : filtered.length === 0 ? <EmptyState title="No customers found" detail="Create a customer to begin a booking." /> : <div className="card table-wrap"><table><thead><tr><th>Customer</th><th>Phone</th><th>Address</th><th>Added</th><th></th></tr></thead><tbody>{filtered.map((item) => <tr className="table-row--interactive" key={item.id} onClick={() => navigate(`/customers/${item.id}`)}><td><strong>{item.full_name}</strong><small>{item.email || 'No email'}</small></td><td>{item.phone}</td><td>{item.address || '—'}</td><td>{shortDate(item.created_at)}</td><td><div className="row-actions">{has('customers.update') && <Button variant="ghost" aria-label={`Edit ${item.full_name}`} onClick={(event) => { event.stopPropagation(); setEditing(item) }}><Pencil size={17} /></Button>}<Button variant="ghost" aria-label={`Open ${item.full_name}`} onClick={(event) => { event.stopPropagation(); navigate(`/customers/${item.id}`) }}><ChevronRight size={18} /></Button></div></td></tr>)}</tbody></table></div>}
    {saveCustomer.error && <div className="toast toast--error">{friendlyError(saveCustomer.error)}</div>}
    {customerModal}
  </>

  if (customers.isLoading || bookings.isLoading || inventory.isLoading || projects.isLoading) return <><PageHeader title="Customer details" description="Loading bookings and property balances." /><LoadingState /></>
  const detailError = customers.error || bookings.error || inventory.error || projects.error
  const detailDataMissing = !customers.data || !bookings.data || !inventory.data || !projects.data
  if (detailError && detailDataMissing) return <><PageHeader title="Customer details" description="Bookings and property balances." /><ErrorState message={friendlyError(detailError)} onRetry={retryDetails} /></>
  if (detailDataMissing) return <><PageHeader title="Customer details" description="Bookings and property balances." /><ErrorState message="Customer details could not be loaded." onRetry={retryDetails} /></>
  if (!customer || !inventory.data) return <><PageHeader title="Customer not found" description="This customer may have been removed." actions={<Button variant="secondary" onClick={() => navigate('/customers')}><ArrowLeft size={17} /> Customers</Button>} /><EmptyState title="No customer available" detail="Return to Customers and choose another record." /></>

  const propertyFor = (booking: Booking) => {
    const unit = inventory.data?.units.find((item) => item.id === booking.unit_id)
    const floor = inventory.data?.floors.find((item) => item.id === unit?.floor_id)
    const block = inventory.data?.blocks.find((item) => item.id === floor?.block_id)
    const project = projects.data?.find((item) => item.id === block?.project_id)
    return { unit, floor, block, project }
  }

  return <>
    <PageHeader
      title={customer.full_name}
      description={`${customer.phone}${customer.email ? ` · ${customer.email}` : ''}`}
      actions={<><Button variant="secondary" onClick={() => navigate('/customers')}><ArrowLeft size={17} /> Customers</Button>{has('customers.update') && <Button variant="secondary" onClick={() => setEditing(customer)}><Pencil size={16} /> Edit</Button>}</>}
    />
    {detailError && <ErrorState message="Refresh failed. Showing the last loaded customer details." onRetry={retryDetails} />}
    <section className="customer-summary card">
      <div><span>Address</span><strong>{customer.address || 'Not provided'}</strong></div>
      <div><span>Properties booked</span><strong>{customerBookings.length}</strong></div>
      <div><span>Total agreement value</span><strong>{money.format(customerBookings.reduce((total, booking) => total + Number(booking.agreement_value || 0), 0))}</strong></div>
      <div><span>Balance receivable</span><strong>{money.format(customerBookings.reduce((total, booking) => total + Number(booking.outstanding || 0), 0))}</strong></div>
    </section>
    <div className="section-heading"><div><h2>Booked properties</h2><p>Select a property to record a payment against its booking.</p></div></div>
    {customerBookings.length === 0 ? <EmptyState title="No booked properties" detail="Create a booking for this customer from the Bookings section." /> : <section className="customer-booking-grid">{customerBookings.map((booking) => {
      const { unit, floor, block, project } = propertyFor(booking)
      const canPay = booking.status === 'active' && Number(booking.outstanding || 0) > 0 && has('payments.create')
      return <article className="customer-booking-card customer-booking-card--interactive card" key={booking.id} role="link" tabIndex={0} onClick={() => navigate(`/bookings/${booking.id}`)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(`/bookings/${booking.id}`) } }}>
        <header><div><p className="eyebrow">{project?.category || unit?.unit_kind || 'Property'}</p><h3>{project?.name || 'Project'}</h3><span>{block ? `Block ${block.name}` : 'Block'} · {floor?.label || 'Floor'} · Property {unit?.unit_number || booking.unit?.unit_number || '—'}</span></div><StatusBadge value={booking.status} /></header>
        <div className="booking-financials"><span>Agreement<strong>{money.format(Number(booking.agreement_value))}</strong></span><span>Received<strong>{money.format(Number(booking.amount_received || 0))}</strong></span><span>Outstanding<strong>{money.format(Number(booking.outstanding || 0))}</strong></span></div>
        <footer><small>Booked {shortDate(booking.booked_on)}</small>{canPay && <Button onClick={(event) => { event.stopPropagation(); setPaymentBooking(booking) }}><CreditCard size={17} /> Add payment</Button>}</footer>
      </article>
    })}</section>}
    {(saveCustomer.error || recordPayment.error) && <div className="toast toast--error">{friendlyError(saveCustomer.error || recordPayment.error)}</div>}
    {customerModal}
    {paymentBooking && <Modal title="Add payment for property" onClose={() => setPaymentBooking(null)}><form className="modal-form" onSubmit={submitPayment}>
      {(() => { const { unit, block, project } = propertyFor(paymentBooking); return <div className="payment-property-summary"><span>Selected booking</span><strong>{project?.name || 'Project'} · {block ? `Block ${block.name} · ` : ''}Property {unit?.unit_number || paymentBooking.unit?.unit_number || '—'}</strong><small>{money.format(Number(paymentBooking.outstanding || 0))} outstanding</small></div> })()}
      <div className="form-grid"><Field name="amount" label="Amount" type="number" min={0.01} max={Number(paymentBooking.outstanding || 0)} step="0.01" required /><Field name="paid_on" label="Payment date" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={new Date().toISOString().slice(0, 10)} required /><SelectField name="method" label="Payment method" defaultValue="bank" required>{availablePaymentMethods.map((method) => <option key={method.value} value={method.value}>{method.label}</option>)}</SelectField><Field name="reference" label="Reference number" maxLength={100} /></div>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setPaymentBooking(null)}>Cancel</Button><Button type="submit" loading={recordPayment.isPending}>Record payment</Button></div>
    </form></Modal>}
  </>
}
