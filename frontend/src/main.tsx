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

      /**
       * Por defecto TanStack considera todo obsoleto nada mas llegar, asi que cada vuelta al
       * resumen y cada vez que la ventana recupera el foco relanzaba las cuatro consultas de
       * informes. Con 30 segundos, ir a Movimientos y volver ya no cuesta cuatro peticiones.
       *
       * No introduce datos rancios donde importa: lo que el propio usuario cambia (crear o
       * borrar un movimiento, una cuenta, una meta) lo invalidan las mutaciones a mano, y eso
       * manda sobre el staleTime. Esto solo cubre el caso de volver a mirar lo mismo.
       */
      staleTime: 30_000,
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
