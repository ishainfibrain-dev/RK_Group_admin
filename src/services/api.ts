import { supabase } from '../lib/supabase'
import type {
  AppUser,
  AuditEvent,
  Block,
  Booking,
  ConnectionConfig,
  Customer,
  Floor,
  Payment,
  Permission,
  Project,
  Role,
  Unit,
} from '../types/domain'

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message)
  if (data === null) throw new Error('The server returned no data.')
  return data
}

type PaymentFeedRow = {
  transaction_id: string
  owner_id: string
  booking_id: string
  customer_name: string
  payment_mode: Payment['method']
  amount: number
  transaction_date: string
  remark: string | null
  payment_status: Payment['status']
  void_reason: string | null
  voided_at: string | null
  created_at: string
}

async function getConnectionConfig() {
  const { data, error } = await supabase.from('connection_config').select('*').eq('id', 1).single()
  return unwrap(data as ConnectionConfig | null, error)
}

async function listActivePaymentFeed(limit?: number) {
  const config = await getConnectionConfig()
  const table = config.live1_active ? 'live1' : 'live2'
  let query = supabase.from(table).select('*').order('created_at', { ascending: false })
  if (limit) query = query.limit(limit)
  const { data, error } = await query
  const rows = unwrap((data ?? []) as PaymentFeedRow[], error)
  return rows.map<Payment>((row) => ({
    id: row.transaction_id,
    owner_id: row.owner_id,
    booking_id: row.booking_id,
    amount: row.amount,
    paid_on: row.transaction_date,
    method: row.payment_mode,
    reference_number: row.remark,
    status: row.payment_status,
    void_reason: row.void_reason,
    voided_at: row.voided_at,
    created_at: row.created_at,
    updated_at: row.voided_at ?? row.created_at,
    booking: { customer: { full_name: row.customer_name } },
  }))
}

async function assertCashAvailable(method: string) {
  if (method.toLowerCase() !== 'cash') return
  const config = await getConnectionConfig()
  if (!config.live1_active) throw new Error('Cash is unavailable while Live1 is inactive.')
}

export const authApi = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return unwrap(data, error)
  },
  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  },
  async sendRecovery(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recover`,
    })
    if (error) throw error
  },
  async updatePassword(password: string) {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
  },
}

export const profileApi = {
  async get(userId: string) {
    const { data, error } = await supabase
      .from('app_users')
      .select('*, role:app_roles(*)')
      .eq('id', userId)
      .single()
    return unwrap(data as AppUser | null, error)
  },
  async permissions() {
    const { data, error } = await supabase.rpc('app_current_permissions')
    return unwrap((data ?? []).map((row: any) => String(row.permission_code)), error)
  },
  async update(values: Pick<AppUser, 'full_name' | 'phone'>) {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Authentication required.')
    const { error } = await supabase.from('app_users').update(values).eq('id', user.id)
    if (error) throw error
  },
}

export const usersApi = {
  async list(search = '') {
    const { data, error } = await supabase.functions.invoke('admin-users', {
      body: { action: 'list', search, page: 1, per_page: 200 },
    })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return (data?.users ?? []) as AppUser[]
  },
  async action(body: Record<string, unknown>) {
    const { data, error } = await supabase.functions.invoke('admin-users', { body })
    if (error) throw error
    if (data?.error) throw new Error(data.error)
    return data
  },
}

export const rolesApi = {
  async list() {
    const { data, error } = await supabase.from('app_roles').select('*').order('name')
    return unwrap((data ?? []) as Role[], error)
  },
  async permissions() {
    const [permissions, mappings] = await Promise.all([
      supabase.from('app_permissions').select('*').order('module').order('name'),
      supabase.from('app_role_permissions').select('role_id, permission_id'),
    ])
    if (permissions.error) throw permissions.error
    if (mappings.error) throw mappings.error
    return {
      permissions: (permissions.data ?? []) as Permission[],
      mappings: (mappings.data ?? []) as Array<{ role_id: string; permission_id: string }>,
    }
  },
  async setPermissions(roleId: string, permissionCodes: string[]) {
    const { error } = await supabase.rpc('app_set_role_permissions', {
      p_role_id: roleId,
      p_permission_codes: permissionCodes,
    })
    if (error) throw error
  },
}

export const projectsApi = {
  async list() {
    const { data, error } = await supabase.from('app_projects').select('*').order('name')
    const rows = unwrap((data ?? []) as Project[], error)
    const currentUserId = (await supabase.auth.getUser()).data.user?.id
    const distinct = new Map<string, Project>()
    for (const project of rows) {
      const code = project.code.trim().toLowerCase()
      const key = code ? `code:${code}` : project.id
      const existing = distinct.get(key)
      if (!existing || (project.owner_id === currentUserId && existing.owner_id !== currentUserId)) distinct.set(key, project)
    }
    return [...distinct.values()]
  },
  async save(values: Partial<Project> & Pick<Project, 'name' | 'code' | 'category'>, id?: string) {
    if (id) {
      const { error } = await supabase.from('app_projects').update(values).eq('id', id)
      if (error) throw error
      return
    }
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Authentication required.')
    const { error } = await supabase.from('app_projects').insert({ ...values, owner_id: user.id })
    if (error) throw error
  },
  async archive(id: string) {
    const { error } = await supabase.from('app_projects').update({ is_active: false }).eq('id', id)
    if (error) throw error
  },
}

export const inventoryApi = {
  async list() {
    const [blocks, floors, units] = await Promise.all([
      supabase.from('app_blocks').select('*').order('sort_order'),
      supabase.from('app_floors').select('*').order('floor_number'),
      supabase.from('app_units').select('*').order('unit_number'),
    ])
    if (blocks.error) throw blocks.error
    if (floors.error) throw floors.error
    if (units.error) throw units.error
    return {
      blocks: (blocks.data ?? []) as Block[],
      floors: (floors.data ?? []) as Floor[],
      units: (units.data ?? []) as Unit[],
    }
  },
  async addBlock(project: Project, name: string) {
    const { error } = await supabase.from('app_blocks').insert({
      project_id: project.id,
      owner_id: project.owner_id,
      name,
      sort_order: 0,
    })
    if (error) throw error
  },
  async addFloor(block: Block, floorNumber: number, label: string) {
    const { error } = await supabase.from('app_floors').insert({
      block_id: block.id,
      owner_id: block.owner_id,
      floor_number: floorNumber,
      label,
    })
    if (error) throw error
  },
  async addUnit(floor: Floor, values: Omit<Unit, 'id' | 'owner_id' | 'floor_id' | 'created_at' | 'updated_at'>) {
    const { error } = await supabase.from('app_units').insert({
      ...values,
      floor_id: floor.id,
      owner_id: floor.owner_id,
    })
    if (error) throw error
  },
}

export const customersApi = {
  async list() {
    const { data, error } = await supabase.from('app_customers').select('*').order('full_name')
    const rows = unwrap((data ?? []) as Customer[], error)
    const currentUserId = (await supabase.auth.getUser()).data.user?.id
    const distinct = new Map<string, Customer>()
    for (const customer of rows) {
      const key = customer.sample_code?.trim().toLowerCase()
        || `${customer.phone.trim().toLowerCase()}|${customer.email?.trim().toLowerCase() || ''}`
      const existing = distinct.get(key)
      if (!existing || (customer.owner_id === currentUserId && existing.owner_id !== currentUserId)) distinct.set(key, customer)
    }
    return [...distinct.values()]
  },
  async save(values: Partial<Customer> & Pick<Customer, 'full_name' | 'phone'>, id?: string) {
    if (id) {
      const { data, error } = await supabase.from('app_customers').update(values).eq('id', id).select().single()
      return unwrap(data as Customer | null, error)
    }
    const user = (await supabase.auth.getUser()).data.user
    if (!user) throw new Error('Authentication required.')
    const { data, error } = await supabase.from('app_customers').insert({ ...values, owner_id: user.id }).select().single()
    return unwrap(data as Customer | null, error)
  },
}

export const bookingsApi = {
  async list() {
    const { data, error } = await supabase
      .from('app_booking_financials')
      .select('*, customer:app_customers(full_name,phone), unit:app_units(unit_number)')
      .order('created_at', { ascending: false })
    return unwrap((data ?? []) as Booking[], error)
  },
  async create(values: { unitId: string; customerId: string; agreementValue: number; bookedOn: string }) {
    const { error } = await supabase.rpc('app_create_booking', {
      p_unit_id: values.unitId,
      p_customer_id: values.customerId,
      p_agreement_value: values.agreementValue,
      p_booked_on: values.bookedOn,
    })
    if (error) throw error
  },
  async cancel(id: string, reason: string) {
    const { error } = await supabase.rpc('app_cancel_booking', { p_booking_id: id, p_reason: reason })
    if (error) throw error
  },
}

export const paymentsApi = {
  async list() {
    return listActivePaymentFeed()
  },
  async record(values: { bookingId: string; amount: number; paidOn: string; method: string; reference: string }) {
    await assertCashAvailable(values.method)
    const { error } = await supabase.rpc('app_record_payment', {
      p_booking_id: values.bookingId,
      p_amount: values.amount,
      p_paid_on: values.paidOn,
      p_method: values.method,
      p_reference_number: values.reference || null,
    })
    if (error) throw error
  },
  async replace(values: { paymentId: string; amount: number; paidOn: string; method: string; reference: string }) {
    await assertCashAvailable(values.method)
    const { error } = await supabase.rpc('app_replace_payment', {
      p_payment_id: values.paymentId,
      p_amount: values.amount,
      p_paid_on: values.paidOn,
      p_method: values.method,
      p_reference_number: values.reference || null,
    })
    if (error) throw error
  },
  async void(id: string, reason: string) {
    const { error } = await supabase.rpc('app_void_payment', { p_payment_id: id, p_reason: reason })
    if (error) throw error
  },
}

export const routingApi = {
  async get() {
    return getConnectionConfig()
  },
  async setLive1(active: boolean) {
    const { error } = await supabase.rpc('set_live1_active', { p_active: active })
    if (error) throw error
  },
}

export const auditApi = {
  async list() {
    const { data, error } = await supabase
      .from('app_admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(250)
    return unwrap((data ?? []) as AuditEvent[], error)
  },
}

export const dashboardApi = {
  async get() {
    const [users, projects, units, bookings, financials, payments] = await Promise.all([
      supabase.from('app_users').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('app_projects').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('app_units').select('id,inventory_status'),
      supabase.from('app_bookings').select('id,status'),
      supabase.from('app_booking_financials').select('agreement_value,amount_received,outstanding,status'),
      listActivePaymentFeed(6),
    ])
    for (const result of [users, projects, units, bookings, financials]) if (result.error) throw result.error
    const unitRows = (units.data ?? []) as Array<{ inventory_status: string }>
    const bookingRows = (bookings.data ?? []) as Array<{ status: string }>
    const financeRows = (financials.data ?? []) as Array<{ agreement_value: number; amount_received: number; outstanding: number; status: string }>
    return {
      activeUsers: users.count ?? 0,
      activeProjects: projects.count ?? 0,
      totalUnits: unitRows.length,
      availableUnits: unitRows.filter((row) => row.inventory_status === 'available').length,
      activeBookings: bookingRows.filter((row) => row.status === 'active').length,
      agreementValue: financeRows.reduce((sum, row) => sum + Number(row.agreement_value ?? 0), 0),
      received: financeRows.reduce((sum, row) => sum + Number(row.amount_received ?? 0), 0),
      outstanding: financeRows.reduce((sum, row) => sum + Number(row.outstanding ?? 0), 0),
      recentPayments: payments,
    }
  },
}
