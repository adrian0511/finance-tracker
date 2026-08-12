import { getErrorMessage } from '@/api/errors'
import type { ReportRange } from '@/api/reports'
import { useChartPalette } from '@/components/charts/palette'
import { useBalanceReport } from '@/hooks/useReports'
import { formatMoney } from '@/utils/format'

/**
 * Tres numeros, no un grafico: comparar tres magnitudes de las que dos son sumandos de la tercera
 * no gana nada dibujandolas, y el importe exacto es justo lo que se viene a leer aqui.
 */
export function BalanceSummary({ range, enabled }: { range: ReportRange; enabled: boolean }) {
  const { data, isPending, isFetching, isError, error } = useBalanceReport(range, enabled)
  const palette = useChartPalette()

  if (isError) {
    return (
      <p role="alert" className="rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
        {getErrorMessage(error, 'No se ha podido cargar el balance del periodo.')}
      </p>
    )
  }

  const net = data?.balance ?? 0

  return (
    <dl
      className={`grid gap-4 sm:grid-cols-3 ${isFetching && !isPending ? 'opacity-60 transition-opacity' : ''}`}
    >
      {/* Los puntos de color son los mismos que usan las barras del grafico anual: el ingreso es
          del mismo verde aqui que alli, o el color no significaria nada. */}
      <Tile label="Ingresos" value={data?.incomes} pending={isPending} dot={palette.ingreso} />
      <Tile label="Gastos" value={data?.expenses} pending={isPending} dot={palette.gasto} />
      <Tile
        label="Balance neto"
        value={data?.balance}
        pending={isPending}
        // El neto no es una categoria mas, es el resultado: no lleva punto de color, va en grande
        // y solo se tine cuando el periodo cierra en rojo. El signo va escrito ademas del color.
        negative={net < 0}
        emphasis
      />
    </dl>
  )
}

interface TileProps {
  label: string
  value: number | undefined
  pending: boolean
  dot?: string
  negative?: boolean
  emphasis?: boolean
}

function Tile({ label, value, pending, dot, negative = false, emphasis = false }: TileProps) {
  return (
    <div className="rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
      <dt className="flex items-center gap-2 text-sm text-tinta-tenue">
        {dot !== undefined && (
          <span
            aria-hidden="true"
            className="inline-block size-2.5 rounded-full"
            style={{ backgroundColor: dot }}
          />
        )}
        {label}
      </dt>
      <dd
        className={`mt-1 font-display text-3xl ${emphasis ? 'font-semibold' : ''} ${
          negative ? 'text-alerta' : 'text-tinta'
        }`}
      >
        {pending || value === undefined ? '—' : formatMoney(value)}
      </dd>
    </div>
  )
}
