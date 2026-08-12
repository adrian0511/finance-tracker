import { getErrorMessage } from '@/api/errors'
import type { ReportRange } from '@/api/reports'
import { EXPENSE_COLOR, INCOME_COLOR } from '@/components/charts/palette'
import { useBalanceReport } from '@/hooks/useReports'
import { formatMoney } from '@/utils/format'

/**
 * Tres numeros, no un grafico: comparar tres magnitudes de las que dos son sumandos de la tercera
 * no gana nada dibujandolas, y el importe exacto es justo lo que se viene a leer aqui.
 */
export function BalanceSummary({ range, enabled }: { range: ReportRange; enabled: boolean }) {
  const { data, isPending, isFetching, isError, error } = useBalanceReport(range, enabled)

  if (isError) {
    return (
      <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
        {getErrorMessage(error, 'No se ha podido cargar el balance del periodo.')}
      </p>
    )
  }

  const net = data?.balance ?? 0

  return (
    <dl
      className={`grid gap-4 sm:grid-cols-3 ${isFetching && !isPending ? 'opacity-60 transition-opacity' : ''}`}
    >
      <Tile label="Ingresos" value={data?.incomes} pending={isPending} color={INCOME_COLOR} />
      <Tile label="Gastos" value={data?.expenses} pending={isPending} color={EXPENSE_COLOR} />
      <Tile
        label="Balance neto"
        value={data?.balance}
        pending={isPending}
        // El neto no es una categoria mas, es el resultado: en negro cuando suma y en el rojo del
        // gasto cuando resta. El signo va escrito ademas del color.
        color={net < 0 ? EXPENSE_COLOR : '#0f172a'}
        emphasis
      />
    </dl>
  )
}

interface TileProps {
  label: string
  value: number | undefined
  pending: boolean
  color: string
  emphasis?: boolean
}

function Tile({ label, value, pending, color, emphasis = false }: TileProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <dt className="flex items-center gap-2 text-sm text-slate-500">
        <span
          aria-hidden="true"
          className="inline-block size-2.5 rounded-full"
          style={{ backgroundColor: color }}
        />
        {label}
      </dt>
      {/* Sin tabular-nums: son numeros sueltos y grandes, no una columna que tenga que cuadrar. */}
      <dd
        className={`mt-1 text-2xl ${emphasis ? 'font-semibold' : ''}`}
        style={{ color: emphasis ? color : '#0f172a' }}
      >
        {pending || value === undefined ? '—' : formatMoney(value)}
      </dd>
    </div>
  )
}
