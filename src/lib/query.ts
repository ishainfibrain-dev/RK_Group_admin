import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => !String(error).includes('permission') && count < 2,
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
})

export const queryKeys = {
  dashboard: ['dashboard'] as const,
  users: ['users'] as const,
  roles: ['roles'] as const,
  permissions: ['permissions'] as const,
  projects: ['projects'] as const,
  inventory: ['inventory'] as const,
  customers: ['customers'] as const,
  bookings: ['bookings'] as const,
  payments: ['payments'] as const,
  routing: ['routing'] as const,
  audit: ['audit'] as const,
}
