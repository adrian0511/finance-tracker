import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

import { useChartPalette, type ChartPalette } from './palette'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { CategoryReportResponse } from '@/types/report'
import { formatMoney } from '@/utils/format'

/**
 * Seis porciones como mucho. Un donut solo se lee de un vistazo mientras las porciones se
 * distinguen entre si; a partir de ahi la cola larga es ruido, asi que se agrupa en «Otras».
 */
const MAX_SLICES = 6

const UNCATEGORIZED = 'Sin categoría'

/**
 * Lo que se elige al pinchar una porcion. Lleva la lista de categorias, no solo la etiqueta,
 * porque «Otras» representa varias a la vez y tiene que poder filtrar por todas ellas.
 */
export interface CategorySelection {
  label: string
  categories: (string | null)[]
}

interface Slice extends CategorySelection {
  total: number
  color: string
}

interface CategoryPieChartProps {
  data: CategoryReportResponse[]
  selected: CategorySelection | null
  onSelect: (selection: CategorySelection | null) => void
}

export function CategoryPieChart({ data, selected, onSelect }: CategoryPieChartProps) {
  const reducedMotion = useReducedMotion()
  const palette = useChartPalette()
  const slices = buildSlices(data, palette)
  const total = slices.reduce((sum, slice) => sum + slice.total, 0)

  // Pinchar la porcion ya elegida la deselecciona: es la unica forma de volver atras sin tener
  // que buscar un boton de "quitar filtro" en otra parte de la pagina.
  const toggle = (slice: Slice) => onSelect(selected?.label === slice.label ? null : slice)

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] sm:items-center">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={slices}
            dataKey="total"
            nameKey="label"
            innerRadius="58%"
            outerRadius="88%"
            // 2px de hueco entre porciones, que es lo que las separa sin dibujarles un borde.
            paddingAngle={1}
            stroke={palette.superficie}
            strokeWidth={2}
            onClick={(_, index) => {
              const slice = slices[index]
              if (slice !== undefined) {
                toggle(slice)
              }
            }}
            isAnimationActive={!reducedMotion}
            className="cursor-pointer outline-none"
          >
            {slices.map((slice) => (
              <Cell
                key={slice.label}
                fill={slice.color}
                // Al elegir una porcion las demas se apagan en vez de cambiar de color: quien ya
                // habia asociado un color a una categoria no tiene que volver a aprenderselo.
                fillOpacity={selected === null || selected.label === slice.label ? 1 : 0.25}
              />
            ))}
          </Pie>
          <Tooltip
            {...palette.tooltip}
            formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Leyenda con el importe escrito. No es decorativa: tres de los colores de la escala no
          llegan a 3:1 contra el blanco, asi que el dato tiene que estar tambien en texto. */}
      <ul className="flex flex-col gap-1">
        {slices.map((slice) => {
          const isSelected = selected?.label === slice.label

          return (
            <li key={slice.label}>
              <button
                type="button"
                aria-pressed={isSelected}
                onClick={() => toggle(slice)}
                className={`foco flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm ${
                  isSelected ? 'bg-cobalto-tenue font-medium' : 'hover:bg-superficie-alta'
                }`}
              >
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="flex-1 truncate text-tinta-suave">{slice.label}</span>
                <span className="cifra text-tinta">{formatMoney(slice.total)}</span>
                <span className="cifra w-12 text-right text-tinta-tenue">
                  {total === 0 ? '—' : `${Math.round((slice.total / total) * 100)}%`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/**
 * El backend ya manda las categorias ordenadas de mayor a menor gasto, asi que el corte es
 * quedarse con las primeras: las que sobran se suman en una sola porcion que conserva la lista
 * de categorias que la componen para poder filtrar por ellas.
 */
function buildSlices(data: CategoryReportResponse[], palette: ChartPalette): Slice[] {
  const named = data.map((row) => ({
    label: row.category ?? UNCATEGORIZED,
    categories: [row.category],
    total: row.total,
  }))

  if (named.length <= MAX_SLICES) {
    return named.map((slice, index) => ({ ...slice, color: color(palette, index) }))
  }

  const head = named.slice(0, MAX_SLICES - 1)
  const tail = named.slice(MAX_SLICES - 1)

  return [
    ...head.map((slice, index) => ({ ...slice, color: color(palette, index) })),
    {
      label: `Otras (${tail.length})`,
      categories: tail.flatMap((slice) => slice.categories),
      total: tail.reduce((sum, slice) => sum + slice.total, 0),
      color: palette.otras,
    },
  ]
}

/**
 * El color va por posicion en la escala y nunca se genera uno nuevo: la lista esta validada como
 * conjunto, y un septimo tono inventado se confundiria con alguno de los seis.
 */
function color(palette: ChartPalette, index: number): string {
  return palette.categorias[index] ?? palette.otras
}
