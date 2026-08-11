import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import './index.css'
import App from './App.tsx'
import { Toaster } from '@/components/feedback/Toaster'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Un 401 ya lo resuelve el interceptor deslogueando, y un 403 no se arregla repitiendo
      // la peticion: reintentar solo tiene sentido para fallos de red o 5xx.
      retry: (failureCount, error) => failureCount < 2 && !isClientError(error),
    },
  },
})

function isClientError(error: unknown): boolean {
  if (!(error instanceof AxiosError) || error.response === undefined) {
    return false
  }
  return error.response.status >= 400 && error.response.status < 500
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        {/* Fuera del Routes: un aviso lanzado justo antes de redirigir tiene que sobrevivir al
            cambio de ruta. */}
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
