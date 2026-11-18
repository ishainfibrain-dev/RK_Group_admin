export type Json = string | number | boolean | null | Json[] | { [key: string]: Json | undefined }

export type Role = {
  id: string
  code: string
  name: string
  description: string | null
  is_system: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AppUser = {
  id: string
  email?: string | null
  full_name: string
  phone: string | null
  designation: string
  role_id: string
  role?: Role | null
  is_active: boolean
  created_at: string
  updated_at: string
  last_sign_in_at?: string | null
  deactivated_at: string | null
}

export type Project = {
  id: string
  owner_id: string
  code: string
  name: string
  category: 'residential' | 'commercial'
  location: string | null
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Block = {
  id: string
  owner_id: string
  project_id: string
  name: string
  sort_order: number
  created_at: string
  updated_at: string
}

export type Floor = {
  id: string
  owner_id: string
  block_id: string
  floor_number: number
  label: string
  created_at: string
  updated_at: string
}

export type Unit = {
  id: string
  owner_id: string
  floor_id: string
  unit_number: string
  unit_kind: 'flat' | 'office'
  area_sqft: number | null
  list_price: number | null
  inventory_status: 'available' | 'booked' | 'maintenance'
  created_at: string
  updated_at: string
}

export type Customer = {
  id: string
  owner_id: string
  sample_code: string | null
  full_name: string
  phone: string
  email: string | null
  address: string | null
  created_at: string
  updated_at: string
}

export type Booking = {
  id: string
  owner_id: string
  sample_code: string | null
  unit_id: string
  customer_id: string
  agreement_value: number
  booked_on: string
  status: 'active' | 'completed' | 'cancelled'
  cancellation_reason: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
  customer?: Pick<Customer, 'full_name' | 'phone'> | null
  unit?: Pick<Unit, 'unit_number'> | null
  amount_received?: number
  outstanding?: number
}

export type PaymentMethod = 'bank' | 'cheques' | 'upi' | 'cash' | 'rtgs' | 'neft'

export type Payment = {
  id: string
  owner_id: string
  booking_id: string
  amount: number
  paid_on: string
  method: PaymentMethod
  reference_number: string | null
  status: 'posted' | 'void'
  void_reason: string | null
  voided_at: string | null
  created_at: string
  updated_at: string
  booking?: { customer?: Pick<Customer, 'full_name'> | null } | null
}

export type Permission = {
  id: string
  code: string
  name: string
  module: string
  description: string | null
}

export type AuditEvent = {
  id: number
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  before_data: Json | null
  after_data: Json | null
  reason: string | null
  correlation_id: string
  created_at: string
}

export type ConnectionConfig = {
  id: number
  live1_active: boolean
  live2_active: boolean
  live1_is_operation: boolean
  live2_is_operation: boolean
  updated_at: string
}

export const paymentMethods: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'bank', label: 'Bank' },
  { value: 'cheques', label: 'Cheques' },
  { value: 'upi', label: 'UPI' },
  { value: 'cash', label: 'Cash' },
  { value: 'rtgs', label: 'RTGS' },
  { value: 'neft', label: 'NEFT' },
]

export const paymentMethodsFor = (live1Active: boolean) =>
  paymentMethods.filter((method) => live1Active || method.value !== 'cash')
