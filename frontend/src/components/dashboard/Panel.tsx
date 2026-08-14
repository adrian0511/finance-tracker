import type { ReactNode } from 'react'

import { getErrorMessage } from '@/api/errors'

interface PanelProps {
  title: string
  /** Una linea de contexto bajo el titulo. Los informes no siempre miden lo que parece. */
  hint?: string
  /** Controles propios del panel (un selector de año, por ejemplo), alineados con el titulo. */
  actions?: ReactNode
  /**
   * Fila de controles bajo el titulo. Se pinta **siempre**, tambien con la tarjeta vacia o en
   * error: si un filtro deja la lista sin filas y el filtro se va con ella, no queda forma de
   * deshacerlo y la tarjeta parece decir que no hay datos.
   */
  toolbar?: ReactNode
  isPending: boolean
  isFetching?: boolean
  isError: boolean
  error?: unknown
  errorMessage: string
  isEmpty?: boolean
  emptyMessage?: string
  /**
   * Alto en px del contenido con datos, reservado desde el primer render. Sin esto el panel mide
   * dos lineas mientras carga y varios cientos de px al llegar la respuesta, y empuja a todo lo
   * que tiene debajo: era el CLS de 0,142 del dashboard. Es un minimo, no un alto fijo.
   */
  contentHeight?: number
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
  toolbar,
  isPending,
  isFetching = false,
  isError,
  error,
  errorMessage,
  isEmpty = false,
  emptyMessage = 'No hay datos en este periodo.',
  contentHeight,
  children,
}: PanelProps) {
  return (
    <section className="rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-medium text-tinta">{title}</h2>
          {hint !== undefined && <p className="mt-0.5 text-xs text-tinta-tenue">{hint}</p>}
        </div>
        {actions}
      </div>

      {toolbar !== undefined && <div className="mt-3">{toolbar}</div>}

      {/* El margen y el alto reservado van aqui y no en cada rama: los cuatro estados tienen que
          ocupar lo mismo, que es justo lo que impide el salto. */}
      <div className="mt-4" style={contentHeight === undefined ? undefined : { minHeight: contentHeight }}>
        {isPending ? (
          <p className="text-sm text-tinta-tenue">Cargando…</p>
        ) : isError ? (
          <p role="alert" className="rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
            {getErrorMessage(error, errorMessage)}
          </p>
        ) : isEmpty ? (
          <p className="rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
            {emptyMessage}
          </p>
        ) : (
          <div className={isFetching ? 'opacity-60 transition-opacity' : ''}>{children}</div>
        )}
      </div>
    </section>
  )
}
