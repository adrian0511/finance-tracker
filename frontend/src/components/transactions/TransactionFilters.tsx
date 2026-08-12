import { useId, type ReactNode } from 'react'

import type { TransactionType } from '@/types/common'
import { SIN_CATEGORIA, TYPE_LABELS, type TransactionFilter } from '@/utils/transactionFilter'

/**
 * Los valores del <select> van prefijados a proposito. La categoria es texto libre, asi que sin
 * prefijo una categoria que se llamara «todas» seria indistinguible de la opcion «Todas».
 */
const TODAS = 'todas'
const SIN = 'sin'
const PREFIJO = 'cat:'

const TIPOS: { value: TransactionType | null; label: string }[] = [
  { value: null, label: 'Todos' },
  { value: 'INCOME', label: TYPE_LABELS.INCOME },
  { value: 'EXPENSE', label: TYPE_LABELS.EXPENSE },
]

interface TransactionFiltersProps {
  filter: TransactionFilter
  /** Categorias que existen en los datos. Si viene vacia, el desplegable no se pinta. */
  categories?: string[]
  hasUncategorized?: boolean
  onChange: (patch: Partial<TransactionFilter>) => void
  /** Si viene, se pinta el boton de quitar los filtros. */
  onClear?: () => void
  /**
   * Deja los controles de tipo bloqueados y fijados en un valor. Lo usa el dashboard cuando hay
   * una porcion del donut elegida: esa seleccion ya es «gastos de esta categoria», y dejar pulsar
   * «Ingresos» daria una tabla siempre vacia sin explicar por que.
   */
  lockedType?: TransactionType
  lockedReason?: string
  /** Contexto a la derecha de la fila (el rango que llega desde el dashboard, por ejemplo). */
  note?: ReactNode
}

/**
 * Una sola fila de filtros, y siempre encima de la tabla a la que afecta. No se reparten controles
 * por la pantalla: un filtro que no se ve mientras se mira el resultado es un filtro que se olvida
 * puesto, y la tabla parece decir que no hay datos.
 */
export function TransactionFilters({
  filter,
  categories = [],
  hasUncategorized = false,
  onChange,
  onClear,
  lockedType,
  lockedReason,
  note,
}: TransactionFiltersProps) {
  const categoryId = useId()
  const tipoActivo = lockedType ?? filter.type
  const hayCategorias = categories.length > 0 || hasUncategorized

  return (
    <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
      <fieldset disabled={lockedType !== undefined}>
        <legend className="mb-1 text-xs font-medium text-tinta-tenue">Tipo</legend>
        <div className="flex flex-wrap gap-1 rounded-md bg-superficie-alta p-1">
          {TIPOS.map((tipo) => (
            <button
              key={tipo.label}
              type="button"
              aria-pressed={tipoActivo === tipo.value}
              onClick={() => onChange({ type: tipo.value })}
              className={`foco rounded px-3 py-1.5 text-sm ${
                tipoActivo === tipo.value
                  ? 'bg-superficie font-medium text-tinta shadow-tarjeta'
                  : 'text-tinta-suave hover:text-tinta disabled:hover:text-tinta-suave'
              } disabled:opacity-60`}
            >
              {tipo.label}
            </button>
          ))}
        </div>
      </fieldset>

      {hayCategorias && (
        <div className="flex flex-col gap-1">
          <label htmlFor={categoryId} className="text-xs font-medium text-tinta-tenue">
            Categoría
          </label>
          <select
            id={categoryId}
            value={valorSelect(filter.category)}
            onChange={(event) => onChange({ category: categoriaDeValor(event.target.value) })}
            className="foco max-w-56 rounded-md border border-borde-fuerte bg-superficie px-2 py-1.5 text-sm text-tinta"
          >
            <option value={TODAS}>Todas</option>
            {/* La opcion solo aparece si de verdad hay movimientos sin categoria: ofrecerla
                siempre lleva a una tabla vacia que parece un fallo. */}
            {hasUncategorized && <option value={SIN}>{SIN_CATEGORIA}</option>}
            {categories.map((categoria) => (
              <option key={categoria} value={`${PREFIJO}${categoria}`}>
                {categoria}
              </option>
            ))}
          </select>
        </div>
      )}

      {lockedReason !== undefined && lockedType !== undefined && (
        <p className="text-xs text-tinta-tenue">{lockedReason}</p>
      )}

      {note}

      {onClear !== undefined && (
        <button
          type="button"
          onClick={onClear}
          className="foco rounded text-sm font-medium text-cobalto underline underline-offset-4"
        >
          Quitar los filtros
        </button>
      )}
    </div>
  )
}

function valorSelect(category: string | null): string {
  if (category === null) {
    return TODAS
  }
  return category === '' ? SIN : `${PREFIJO}${category}`
}

function categoriaDeValor(valor: string): string | null {
  if (valor === TODAS) {
    return null
  }
  return valor === SIN ? '' : valor.slice(PREFIJO.length)
}
