import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { AXIS_TICK, GRID_COLOR, TOOLTIP_STYLE } from './palette'
import { SCENARIOS, type Scenario } from './scenarios'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { SavingsProjectionResponse } from '@/types/goal'
import { formatMoney, formatMoneyCompact, formatYearMonth, previousYearMonth } from '@/utils/format'

interface ProjectionChartProps {
  projection: SavingsProjectionResponse
  /** Escenarios que el usuario quiere ver. Los que no alcanzan la meta no se dibujan nunca. */
  visible: Record<Scenario, boolean>
}

export function ProjectionChart({ projection, visible }: ProjectionChartProps) {
  const reducedMotion = useReducedMotion()
  const data = buildSeries(projection)

  if (data.length === 0) {
    return null
  }

  const drawn = SCENARIOS.filter(
    (scenario) => visible[scenario.key] && projection[scenario.etaField] !== null,
  )

  return (
    <ResponsiveContainer width="100%" height={360}>
      <LineChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
        {/* Rejilla continua y sin verticales: una linea punteada de fondo compite con las tres
            series, que si son punteadas a proposito. */}
        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatYearMonth}
          minTickGap={28}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={{ stroke: GRID_COLOR }}
        />
        <YAxis
          tickFormatter={formatMoneyCompact}
          width={72}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => formatMoney(Number(value))}
          // El label viene tipado como ReactNode aunque siempre sea el "yyyy-MM" del dataKey.
          labelFormatter={(label) => (typeof label === 'string' ? formatYearMonth(label) : label)}
        />
        <Legend />

        {/* La meta, de referencia: es la linea que las demas tienen que cruzar. */}
        <ReferenceLine
          y={projection.targetAmount}
          stroke="#dc2626"
          strokeDasharray="6 4"
          label={{ value: 'Meta', position: 'insideTopRight', fill: '#dc2626', fontSize: 12 }}
        />

        {drawn.map((scenario) => (
          <Line
            key={scenario.key}
            type="monotone"
            dataKey={scenario.key}
            name={scenario.label}
            stroke={scenario.color}
            strokeDasharray={scenario.dash}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * El breakdown que manda el servidor empieza en el mes SIGUIENTE al actual, asi que la serie
 * arrancaria ya con un mes de ahorro hecho y el saldo de hoy no aparecerian por ningun lado. El
 * mes 0 se reconstruye restando un mes al primer punto, con currentBalance en los tres
 * escenarios: antes de que pase un mes, los tres futuros parten del mismo sitio.
 */
function buildSeries(projection: SavingsProjectionResponse) {
  const [firstMonth] = projection.monthlyBreakdown
  if (firstMonth === undefined) {
    return []
  }

  return [
    {
      month: previousYearMonth(firstMonth.month),
      optimistic: projection.currentBalance,
      realistic: projection.currentBalance,
      pessimistic: projection.currentBalance,
    },
    ...projection.monthlyBreakdown.map((point) => ({
      month: point.month,
      optimistic: point.optimisticBalance,
      realistic: point.realisticBalance,
      pessimistic: point.pessimisticBalance,
    })),
  ]
}
