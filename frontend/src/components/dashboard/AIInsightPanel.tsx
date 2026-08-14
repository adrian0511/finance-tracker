import { lazy, Suspense } from 'react'

import { AI_RETRY_LATER, getErrorMessage, isTemporaryAiError } from '@/api/errors'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { AIResponse } from '@/types/ai'
import { formatDateTime } from '@/utils/format'

/**
 * 46 kB de react-markdown que el dashboard se bajaba en cada carga aunque las dos tarjetas
 * arrancan vacias. El click en «Generar» dispara la descarga, asi que mientras el modelo tarda sus
 * segundos el trozo ya ha llegado y el `fallback` casi nunca se ve.
 */
const AIMarkdown = lazy(() =>
  import('@/components/ui/AIMarkdown').then((module) => ({ default: module.AIMarkdown })),
)

const warmMarkdown = () => void import('@/components/ui/AIMarkdown')

interface AIInsightPanelProps {
  title: string
  /** Que es esto y por que hay que pedirlo, en la tarjeta vacia. */
  hint: string
  /** El verbo de la espera: "Analizando tus finanzas…". Cada tarjeta dice lo suyo. */
  pendingLabel: string
  data: AIResponse | undefined
  isFetching: boolean
  isError: boolean
  error: unknown
  errorMessage: string
  onGenerate: () => void
  /**
   * Por que no se puede generar todavia. Si viene, el boton se apaga y esto es lo que se lee en
   * su lugar: un boton deshabilitado sin motivo al lado parece la aplicacion rota.
   */
  disabledReason?: string
}

/**
 * Tarjeta de un texto generado por el modelo. No usa `Panel` y no es por no reutilizar: los
 * estados no son los mismos. `Panel` resuelve cargando/error/vacio/datos de una query que se pide
 * sola, y aqui el estado que manda es uno que alli no existe — "todavia no se ha pedido", que no
 * es "vacio" (no es que no haya datos, es que nadie los ha pedido aun) ni "cargando".
 *
 * Ademas `isPending` de TanStack no sirve para decidir nada en estas dos: con `enabled: false`
 * vale true desde el primer render y para siempre mientras no haya datos. Lo que se mira es
 * `data` para saber si hay algo e `isFetching` para saber si hay algo en vuelo.
 */
export function AIInsightPanel({
  title,
  hint,
  pendingLabel,
  data,
  isFetching,
  isError,
  error,
  errorMessage,
  onGenerate,
  disabledReason,
}: AIInsightPanelProps) {
  const reducedMotion = useReducedMotion()
  const retryable = isTemporaryAiError(error)
  const blocked = disabledReason !== undefined

  return (
    <section className="flex flex-col rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <h2 className="font-medium text-tinta">{title}</h2>
          <p className="mt-0.5 text-xs text-tinta-tenue">{hint}</p>
        </div>

        {/* El boton cambia de nombre segun haya contenido o no, pero es el mismo boton y hace lo
            mismo: pedir el texto. Mientras hay una llamada en vuelo se deshabilita, que es la
            unica forma de que no se encadenen dos peticiones a un modelo con cuota. */}
        <button
          type="button"
          onClick={() => {
            warmMarkdown()
            onGenerate()
          }}
          disabled={isFetching || blocked}
          className="h-9 shrink-0 rounded-md bg-accion px-3 text-sm font-medium text-accion-tinta foco disabled:opacity-60"
        >
          {isFetching ? 'Generando…' : data === undefined ? 'Generar' : 'Regenerar'}
        </button>
      </div>

      {isFetching ? (
        // Estado propio y no el "Cargando…" del resto de paneles: esto tarda segundos, y el
        // mismo texto que en un panel que responde al instante haria pensar que se ha colgado.
        // El punto que late da senal de vida durante la espera; con prefers-reduced-motion se
        // queda quieto, que es lo unico que ese ajuste pide.
        <p role="status" className="mt-6 flex items-center gap-2 text-sm text-tinta-suave">
          <span
            aria-hidden="true"
            className={`inline-block size-2 rounded-full bg-cobalto ${reducedMotion ? '' : 'animate-pulse'}`}
          />
          {pendingLabel}
        </p>
      ) : isError ? (
        <div role="alert" className="mt-4">
          <p
            className={`rounded-md px-3 py-2 text-sm ${
              retryable ? 'bg-superficie-alta text-tinta-suave' : 'bg-alerta-tenue text-alerta'
            }`}
          >
            {getErrorMessage(error, retryable ? AI_RETRY_LATER : errorMessage)}
          </p>
        </div>
      ) : data === undefined ? (
        <p className="mt-6 rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
          {disabledReason ?? 'Todavía no lo has pedido. Se genera al pulsar «Generar».'}
        </p>
      ) : (
        <>
          {/* El prompt pide secciones numeradas, no Markdown, pero el modelo lo escribe igual:
              sin renderizarlo, el informe se lee con los `**` a la vista. */}
          <div className="mt-4 text-sm leading-relaxed text-tinta">
            <Suspense fallback={<p className="text-sm text-tinta-tenue">Dando formato…</p>}>
              <AIMarkdown>{data.response}</AIMarkdown>
            </Suspense>
          </div>
          <p className="mt-3 text-xs text-tinta-tenue">
            {/* Cuando se genero, porque el texto no se recalcula solo: si se registran
                movimientos despues, lo que se esta leyendo ya no los tiene en cuenta. */}
            Generado el <span className="cifra">{formatDateTime(data.timestamp)}</span>
          </p>

          {/* Se puede llegar aqui con texto ya generado y el boton apagado: basta con borrar los
              movimientos despues de pedirlo. Sin esta linea, «Regenerar» se veria gris sin
              ninguna explicacion. */}
          {blocked && <p className="mt-1 text-xs text-tinta-tenue">{disabledReason}</p>}
        </>
      )}
    </section>
  )
}
