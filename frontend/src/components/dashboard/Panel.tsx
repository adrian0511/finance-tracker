import type { ReactNode } from 'react'

import { getErrorMessage } from '@/api/errors'

interface PanelProps {
  title: string
  /** Una linea de contexto bajo el titulo. Los informes no siempre miden lo que parece. */
  hint?: string
  /** Controles propios del panel (un selector de año, por ejemplo), alineados con el titulo. */
  actions?: ReactNode
  isPending: boolean
  isFetching?: boolean
  isError: boolean
  error?: unknown
  errorMessage: string
  isEmpty?: boolean
  emptyMessage?: string
  children: ReactNode
}

/**
 * Tarjeta comun de los bloques del dashboard: mismo marco, y sobre todo los mismos cuatro
 * estados (cargando, error, vacio, con datos) resueltos en un solo sitio.
 *
 * Al recargar por un cambio de periodo el contenido no se desmonta, se atenua: mantener el
 * render anterior evita que la pagina pegue un salto de altura cada vez que se toca el selector.
 */
export function Panel({
  title,
  hint,
  actions,
  isPending,
  isFetching = false,
  isError,
  error,
  errorMessage,
  isEmpty = false,
  emptyMessage = 'No hay datos en este periodo.',
  children,
}: PanelProps) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-medium text-slate-900">{title}</h2>
          {hint !== undefined && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
        </div>
        {actions}
      </div>

      {isPending ? (
        <p className="mt-6 text-sm text-slate-500">Cargando…</p>
      ) : isError ? (
        <p role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(error, errorMessage)}
        </p>
      ) : isEmpty ? (
        <p className="mt-6 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className={`mt-4 ${isFetching ? 'opacity-60 transition-opacity' : ''}`}>
          {children}
        </div>
      )}
    </section>
  )
}
