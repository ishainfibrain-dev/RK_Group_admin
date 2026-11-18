/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { queryKeys } from '../lib/query'
import { routingApi } from '../services/api'
import { paymentMethodsFor, type ConnectionConfig } from '../types/domain'
import { useAuth } from './AuthProvider'

type PaymentRoutingState = {
  config: ConnectionConfig | null
  live1Active: boolean
  loading: boolean
  error: Error | null
  availablePaymentMethods: ReturnType<typeof paymentMethodsFor>
}

const PaymentRoutingContext = createContext<PaymentRoutingState | null>(null)

export function PaymentRoutingProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const client = useQueryClient()
  const query = useQuery({
    queryKey: queryKeys.routing,
    queryFn: routingApi.get,
    enabled: Boolean(session),
  })

  useEffect(() => {
    if (!session) return

    const channel = supabase
      .channel(`rk-admin-connection-config-${session.user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'connection_config',
        filter: 'id=eq.1',
      }, (payload) => {
        client.setQueryData(queryKeys.routing, payload.new as ConnectionConfig)
        void client.invalidateQueries({ queryKey: queryKeys.payments })
        void client.invalidateQueries({ queryKey: queryKeys.dashboard })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [client, session])

  const activePaymentTable = query.data
    ? (query.data.live1_active ? 'live1' : 'live2')
    : null

  useEffect(() => {
    if (!session || !activePaymentTable) return

    const channel = supabase
      .channel(`rk-admin-${activePaymentTable}-${session.user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: activePaymentTable,
      }, () => {
        void client.invalidateQueries({ queryKey: queryKeys.payments })
        void client.invalidateQueries({ queryKey: queryKeys.dashboard })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [activePaymentTable, client, session])

  const value = useMemo<PaymentRoutingState>(() => {
    const live1Active = query.data?.live1_active === true
    return {
      config: query.data ?? null,
      live1Active,
      loading: query.isLoading,
      error: query.error instanceof Error ? query.error : null,
      availablePaymentMethods: paymentMethodsFor(live1Active),
    }
  }, [query.data, query.error, query.isLoading])

  return <PaymentRoutingContext.Provider value={value}>{children}</PaymentRoutingContext.Provider>
}

export function usePaymentRouting() {
  const value = useContext(PaymentRoutingContext)
  if (!value) throw new Error('usePaymentRouting must be used within PaymentRoutingProvider.')
  return value
}
