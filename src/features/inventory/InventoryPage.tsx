import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Boxes, Building, ChevronRight, Layers3, Plus, Warehouse } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { Button, EmptyState, ErrorState, Field, LoadingState, Modal, PageHeader, SelectField, TextAreaField } from '../../components/ui'
import { friendlyError, money } from '../../lib/format'
import { queryKeys } from '../../lib/query'
import { bookingsApi, customersApi, inventoryApi, projectsApi } from '../../services/api'
import type { Block, Customer, Floor, Project, Unit } from '../../types/domain'

type Action = { type: 'block'; project: Project } | { type: 'floor'; block: Block } | { type: 'unit'; floor: Floor } | null

export function InventoryPage() {
  const { has } = useAuth()
  const client = useQueryClient()
  const navigate = useNavigate()
  const { projectId } = useParams()
  const [action, setAction] = useState<Action>(null)
  const [bookingUnit, setBookingUnit] = useState<Unit | null>(null)
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [selectedCustomerId, setSelectedCustomerId] = useState('')
  const projects = useQuery({ queryKey: queryKeys.projects, queryFn: projectsApi.list })
  const inventory = useQuery({ queryKey: queryKeys.inventory, queryFn: inventoryApi.list })
  const bookings = useQuery({ queryKey: queryKeys.bookings, queryFn: bookingsApi.list })
  const customers = useQuery({ queryKey: queryKeys.customers, queryFn: customersApi.list })
  const mutation = useMutation({
    mutationFn: async (form: HTMLFormElement) => {
      const data = new FormData(form)
      if (!action) return
      if (action.type === 'block') await inventoryApi.addBlock(action.project, String(data.get('name')))
      if (action.type === 'floor') await inventoryApi.addFloor(action.block, Number(data.get('floor_number')), String(data.get('label')))
      if (action.type === 'unit') await inventoryApi.addUnit(action.floor, {
        unit_number: String(data.get('unit_number')),
        unit_kind: String(data.get('unit_kind')) as 'flat' | 'office',
        area_sqft: Number(data.get('area_sqft')) || null,
        list_price: Number(data.get('list_price')) || null,
        inventory_status: String(data.get('inventory_status')) as 'available' | 'maintenance',
      })
    },
    onSuccess: () => {
      setAction(null)
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
  const bookingMutation = useMutation({
    mutationFn: bookingsApi.create,
    onSuccess: () => {
      setBookingUnit(null)
      setSelectedCustomerId('')
      void client.invalidateQueries({ queryKey: queryKeys.bookings })
      void client.invalidateQueries({ queryKey: queryKeys.inventory })
      void client.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
  const customerMutation = useMutation({
    mutationFn: (values: Pick<Customer, 'full_name' | 'phone'> & Partial<Pick<Customer, 'email' | 'address'>>) => customersApi.save(values),
    onSuccess: async (customer) => {
      await client.invalidateQueries({ queryKey: queryKeys.customers })
      setSelectedCustomerId(customer.id)
      setAddingCustomer(false)
    },
  })

  const project = useMemo(() => projects.data?.find((item) => item.id === projectId), [projectId, projects.data])
  if (projects.isLoading || inventory.isLoading || bookings.isLoading || customers.isLoading) return <><PageHeader title="Project details" description="Loading blocks, floors and properties." /><LoadingState /></>
  if (projects.error || inventory.error || bookings.error || customers.error || !inventory.data) return <><PageHeader title="Project details" description="Blocks, floors and properties." /><ErrorState message={friendlyError(projects.error || inventory.error || bookings.error || customers.error)} /></>

  const { blocks, floors, units } = inventory.data
  const bookedUnits = new Map((bookings.data ?? []).filter((booking) => booking.status !== 'cancelled').map((booking) => [booking.unit_id, booking]))
  const projectInventory = (item: Project) => {
    const projectBlocks = blocks.filter((block) => block.project_id === item.id)
    const projectFloors = floors.filter((floor) => projectBlocks.some((block) => block.id === floor.block_id))
    const projectUnits = units.filter((unit) => projectFloors.some((floor) => floor.id === unit.floor_id))
    return { projectBlocks, projectFloors, projectUnits }
  }
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); mutation.mutate(event.currentTarget) }

  if (!projectId) {
    return <>
      <PageHeader title="Inventory" description="Select a project to manage its blocks, floors and properties." />
      {(projects.data ?? []).length === 0 ? <EmptyState title="No projects" detail="Create a project before adding inventory." /> : <section className="inventory-project-grid">{projects.data?.map((item) => {
        const { projectBlocks, projectFloors, projectUnits } = projectInventory(item)
        return <button className="inventory-project-card card" key={item.id} onClick={() => navigate(`/projects/${item.id}`)}>
          <div className={`inventory-project-card__visual project-card__visual--${item.category}`}><span>{item.category}</span></div>
          <div className="inventory-project-card__body">
            <div><h2>{item.name}</h2><p>{item.location || 'Location not set'}</p></div>
            <ChevronRight />
            <div className="inventory-project-card__metrics">
              <span><strong>{projectBlocks.length}</strong> Blocks</span>
              <span><strong>{projectFloors.length}</strong> Floors</span>
              <span><strong>{projectUnits.length}</strong> Properties</span>
              <span><strong>{projectUnits.filter((unit) => unit.inventory_status === 'available' && !bookedUnits.has(unit.id)).length}</strong> Available</span>
            </div>
          </div>
        </button>
      })}</section>}
    </>
  }

  if (!project) return <><PageHeader title="Project not found" description="This project may have been archived or removed." actions={<Button variant="secondary" onClick={() => navigate('/projects')}><ArrowLeft size={17} /> Projects</Button>} /><EmptyState title="No project available" detail="Return to Projects and choose another record." /></>

  const { projectBlocks, projectFloors, projectUnits } = projectInventory(project)
  return <>
    <PageHeader
      title={project.name}
      description={`${project.location || 'Location not set'} · ${project.category} inventory`}
      actions={<><Button variant="secondary" onClick={() => navigate('/projects')}><ArrowLeft size={17} /> All projects</Button>{has('inventory.manage') && <Button onClick={() => setAction({ type: 'block', project })}><Plus size={16} /> Add block</Button>}</>}
    />
    <section className="card inventory-project inventory-project--detail">
      <div className="inventory-metrics">
        <div><Building /><strong>{projectBlocks.length}</strong><span>Blocks</span></div>
        <div><Layers3 /><strong>{projectFloors.length}</strong><span>Floors</span></div>
        <div><Boxes /><strong>{projectUnits.length}</strong><span>Properties</span></div>
        <div><Warehouse /><strong>{projectUnits.filter((unit) => unit.inventory_status === 'available' && !bookedUnits.has(unit.id)).length}</strong><span>Available</span></div>
      </div>
      {projectBlocks.length === 0 ? <EmptyState title="No blocks yet" detail="Add the first block to begin building this project's inventory." /> : projectBlocks.map((block) => <details key={block.id} open={projectBlocks.length === 1}>
        <summary><span>Block {block.name}</span><small>{floors.filter((floor) => floor.block_id === block.id).length} floors</small></summary>
        <div className="detail-actions">{has('inventory.manage') && <Button variant="ghost" onClick={() => setAction({ type: 'floor', block })}><Plus size={15} /> Add floor</Button>}</div>
        {floors.filter((floor) => floor.block_id === block.id).map((floor) => <div className="floor-row" key={floor.id}>
          <div><strong>{floor.label}</strong><small>{units.filter((unit) => unit.floor_id === floor.id).length} properties</small></div>
          <div className="unit-chips">{units.filter((unit) => unit.floor_id === floor.id).map((unit) => {
            const booking = bookedUnits.get(unit.id)
            const status = booking ? 'booked' : unit.inventory_status
            const available = status === 'available'
            return <button
              className={`unit-slot unit-slot--${status}`}
              key={unit.id}
              title={booking ? `View ${booking.customer?.full_name || 'customer'} details` : unit.list_price ? money.format(unit.list_price) : ''}
              disabled={status === 'maintenance'}
              onClick={() => {
                if (booking) {
                  navigate(`/bookings/${booking.id}`)
                  return
                }
                if (available) {
                  setSelectedCustomerId('')
                  setBookingUnit(unit)
                }
              }}
            ><strong>{unit.unit_number}</strong><span>{status === 'booked' ? 'Booked' : status === 'available' ? 'Available' : 'Maintenance'}</span></button>
          })}</div>
          {has('inventory.manage') && <Button variant="ghost" onClick={() => setAction({ type: 'unit', floor })}><Plus size={15} /> Property</Button>}
        </div>)}
      </details>)}
    </section>
    {(mutation.error || bookingMutation.error || customerMutation.error) && <div className="toast toast--error">{friendlyError(mutation.error || bookingMutation.error || customerMutation.error)}</div>}
    {action && <Modal title={`Add ${action.type === 'unit' ? 'property' : action.type}`} onClose={() => setAction(null)}><form className="modal-form" onSubmit={submit}>
      {action.type === 'block' && <Field name="name" label="Block name" placeholder="A" required />}
      {action.type === 'floor' && <div className="form-grid"><Field name="floor_number" label="Floor number" type="number" min={-5} max={250} required /><Field name="label" label="Floor label" placeholder="Floor 1" required /></div>}
      {action.type === 'unit' && <div className="form-grid"><Field name="unit_number" label="Property number" required /><SelectField name="unit_kind" label="Property type"><option value="flat">Flat</option><option value="office">Office</option></SelectField><Field name="area_sqft" label="Area (sq ft)" type="number" min={1} step="0.01" /><Field name="list_price" label="List price" type="number" min={0} step="0.01" /><SelectField name="inventory_status" label="Status"><option value="available">Available</option><option value="maintenance">Maintenance</option></SelectField></div>}
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setAction(null)}>Cancel</Button><Button type="submit" loading={mutation.isPending}>Add {action.type === 'unit' ? 'property' : action.type}</Button></div>
    </form></Modal>}
    {bookingUnit && !addingCustomer && <Modal title="Add booking" onClose={() => { setBookingUnit(null); setSelectedCustomerId('') }}><form className="modal-form" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      bookingMutation.mutate({
        unitId: bookingUnit.id,
        customerId: String(data.get('customer_id')),
        agreementValue: Number(data.get('agreement_value')),
        bookedOn: String(data.get('booked_on')),
      })
    }}>
      <div className="booking-slot-summary"><span>Selected property</span><strong>{project.name} · Property {bookingUnit.unit_number}</strong><small>{bookingUnit.list_price ? `${money.format(bookingUnit.list_price)} list price` : 'List price not set'}</small></div>
      <div className="form-grid"><div className="booking-customer-field"><SelectField name="customer_id" label="Customer" required value={selectedCustomerId} onChange={(event) => setSelectedCustomerId(event.target.value)}><option value="" disabled>Select customer</option>{customers.data?.map((customer) => <option key={customer.id} value={customer.id}>{customer.full_name} · {customer.phone}</option>)}</SelectField><Button type="button" variant="secondary" className="booking-customer-add" onClick={() => setAddingCustomer(true)}><Plus size={15} /> Add new customer</Button></div><Field name="agreement_value" label="Agreement value" type="number" min={1} step="0.01" defaultValue={bookingUnit.list_price ?? ''} required /><Field name="booked_on" label="Booking date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /></div>
      <p className="form-note">This slot will change to the booked color immediately after the booking is created.</p>
      <div className="modal-actions"><Button type="button" variant="secondary" onClick={() => { setBookingUnit(null); setSelectedCustomerId('') }}>Cancel</Button><Button type="submit" loading={bookingMutation.isPending}>Create booking</Button></div>
    </form></Modal>}
    {bookingUnit && addingCustomer && <Modal title="Add customer" onClose={() => setAddingCustomer(false)}><form className="modal-form" onSubmit={(event) => {
      event.preventDefault()
      const data = new FormData(event.currentTarget)
      customerMutation.mutate({
        full_name: String(data.get('full_name')).trim(),
        phone: String(data.get('phone')).trim(),
        email: String(data.get('email') || '').trim() || null,
        address: String(data.get('address') || '').trim() || null,
      })
    }}><div className="form-grid"><Field name="full_name" label="Full name" required autoFocus /><Field name="phone" label="Phone" minLength={8} required /><Field name="email" label="Email" type="email" /><TextAreaField name="address" label="Address" /></div><p className="form-note">After saving, this customer will be selected automatically for the booking.</p><div className="modal-actions"><Button type="button" variant="secondary" onClick={() => setAddingCustomer(false)}>Back to booking</Button><Button type="submit" loading={customerMutation.isPending}>Save customer</Button></div></form></Modal>}
  </>
}
