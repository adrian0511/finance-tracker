import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { useChartPalette } from './palette'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { MonthlyReportResponse } from '@/types/report'
import { formatMoney, formatMoneyCompact } from '@/utils/format'

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
]

interface MonthlyBarChartProps {
  data: MonthlyReportResponse[]
  /** Numero de mes (1-12) de la columna pinchada. */
  onSelectMonth: (month: number) => void
}

export function MonthlyBarChart({ data, onSelectMonth }: MonthlyBarChartProps) {
  const reducedMotion = useReducedMotion()
  const palette = useChartPalette()
  const months = fillYear(data)

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={months}
        margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        // El click va en el grafico y no en cada barra: asi la zona sensible es la columna
        // entera del mes, en vez de obligar a acertar en una barra de doce pixeles de ancho.
        onClick={(state) => {
          const index = state.activeTooltipIndex
          if (typeof index === 'number' && months[index] !== undefined) {
            onSelectMonth(index + 1)
          }
        }}
        // 2px de separacion entre las dos barras del mismo mes, que es lo que las distingue sin
        // dibujarles un borde.
        barGap={2}
        className="cursor-pointer"
      >
        <CartesianGrid stroke={palette.rejilla} vertical={false} />
        <XAxis
          dataKey="label"
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
          // El resalte de la columna entera, que es la zona en la que se pincha.
          cursor={{ fill: 'var(--superficie-alta)' }}
          formatter={(value, name) => [formatMoney(Number(value)), String(name)]}
        />
        <Legend wrapperStyle={{ fontSize: '0.875rem', color: 'var(--tinta-suave)' }} />

        {/* Las dos series comparten eje a proposito: son la misma magnitud (euros del mes) y es
            justo su diferencia lo que se viene a mirar. */}
        <Bar
          dataKey="incomes"
          name="Ingresos"
          fill={palette.ingreso}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reducedMotion}
        />
        <Bar
          dataKey="expenses"
          name="Gastos"
          fill={palette.gasto}
          radius={[4, 4, 0, 0]}
          isAnimationActive={!reducedMotion}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * El backend solo devuelve los meses con movimientos. Si se pintaran tal cual, un año con datos
 * en enero y en junio dibujaria dos columnas pegadas y el eje mentiria sobre el hueco: los meses
 * vacios se rellenan con ceros para que el año se lea completo.
 */
function fillYear(data: MonthlyReportResponse[]) {
  const byMonth = new Map(data.map((row) => [row.month, row]))

  return MONTH_LABELS.map((label, index) => {
    const row = byMonth.get(index + 1)

    return {
      label,
      incomes: row?.incomes ?? 0,
      expenses: row?.expenses ?? 0,
    }
  })
}
