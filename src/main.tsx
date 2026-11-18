import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { AuthProvider } from './app/AuthProvider'
import { PaymentRoutingProvider } from './app/PaymentRoutingProvider'
import { queryClient } from './lib/query'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider><PaymentRoutingProvider><App /></PaymentRoutingProvider></AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
)
