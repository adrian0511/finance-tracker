import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useChartPalette } from './palette'
import { SCENARIOS, type Scenario } from './scenarios'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { SavingsProjectionResponse } from '@/types/goal'
import { formatMoney, formatMoneyCompact, formatYearMonth, previousYearMonth } from '@/utils/format'

interface ProjectionChartProps {
  projection: SavingsProjectionResponse
  /** Escenarios que el usuario quiere ver. Los que no alcanzan la meta no se dibujan nunca. */
  visible: Record<Scenario, boolean>
}

/**
 * El grafico de firma de la app, y el unico sitio donde se gasta algo de audacia visual.
 *
 * Tres lineas sueltas cuentan el futuro como si fueran tres predicciones distintas, y no lo son:
 * son un ritmo y su margen de error. Por eso el hueco entre la pesimista y la optimista se pinta
 * como una banda rayada — rayada y no solida para que se lea como «zona posible» y no como un
 * dato mas — y las lineas van encima. Cuando el ahorro es constante la desviacion es cero, la
 * banda se cierra sola y las tres lineas se solapan: eso no es un fallo, es la lectura correcta.
 */
export function ProjectionChart({ projection, visible }: ProjectionChartProps) {
  const reducedMotion = useReducedMotion()
  const palette = useChartPalette()
  const data = buildSeries(projection)

  if (data.length === 0) {
    return null
  }

  const drawn = SCENARIOS.filter(
    (scenario) => visible[scenario.key] && projection[scenario.etaField] !== null,
  )
  // La banda solo tiene sentido con sus dos bordes a la vista: con uno solo dibujaria un margen
  // que va de un escenario que se ve a otro que el usuario ha apagado.
  const showBand =
    drawn.some((s) => s.key === 'optimistic') && drawn.some((s) => s.key === 'pessimistic')

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 16, right: 16, bottom: 0, left: 0 }}>
        <defs>
          <pattern
            id="bandaIncertidumbre"
            width={6}
            height={6}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="6"
              stroke={palette.serie}
              strokeWidth={1.5}
              opacity={0.3}
            />
          </pattern>
        </defs>

        {/* Rejilla continua y sin verticales: una linea punteada de fondo compite con las tres
            series, que si son punteadas a proposito. */}
        <CartesianGrid stroke={palette.rejilla} vertical={false} />
        <XAxis
          dataKey="month"
          tickFormatter={formatYearMonth}
          minTickGap={28}
          tick={palette.tick}
          tickLine={false}
          axisLine={{ stroke: palette.rejilla }}
        />
        <YAxis
          tickFormatter={formatMoneyCompact}
          width={72}
          tick={palette.tick}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          {...palette.tooltip}
          formatter={(value) => formatMoney(Number(value))}
          // El label viene tipado como ReactNode aunque siempre sea el "yyyy-MM" del dataKey.
          labelFormatter={(label) => (typeof label === 'string' ? formatYearMonth(label) : label)}
        />
        <Legend wrapperStyle={{ fontSize: '0.875rem', color: 'var(--tinta-suave)' }} />

        {/* La meta, de referencia: es la linea que las demas tienen que cruzar. En laton, que en
            toda la app significa exactamente eso y nada mas. */}
        <ReferenceLine
          y={projection.targetAmount}
          stroke={palette.meta}
          strokeWidth={1.5}
          strokeDasharray="6 4"
          label={{
            value: 'Meta',
            position: 'insideTopRight',
            fill: palette.meta,
            fontSize: 12,
          }}
        />

        {showBand && (
          <Area
            dataKey="banda"
            fill="url(#bandaIncertidumbre)"
            stroke="none"
            // Ni en la leyenda ni en el tooltip: los dos numeros de la banda son los mismos que
            // ya dan las lineas optimista y pesimista, repetidos como un par.
            legendType="none"
            tooltipType="none"
            isAnimationActive={!reducedMotion}
          />
        )}

        {drawn.map((scenario) => (
          <Line
            key={scenario.key}
            type="monotone"
            dataKey={scenario.key}
            name={scenario.label}
            stroke={palette.escenarios[scenario.key]}
            strokeDasharray={scenario.dash}
            strokeWidth={2}
            dot={false}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </ComposedChart>
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
      // Un par [suelo, techo]: es la forma en la que Recharts dibuja un area entre dos valores
      // en vez de entre un valor y el eje.
      banda: [projection.currentBalance, projection.currentBalance] as [number, number],
    },
    ...projection.monthlyBreakdown.map((point) => ({
      month: point.month,
      optimistic: point.optimisticBalance,
      realistic: point.realisticBalance,
      pessimistic: point.pessimisticBalance,
      banda: [point.pessimisticBalance, point.optimisticBalance] as [number, number],
    })),
  ]
}
