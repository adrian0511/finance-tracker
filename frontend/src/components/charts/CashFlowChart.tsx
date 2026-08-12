import {
  Area,
  AreaChart,
  Brush,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { AXIS_TICK, GRID_COLOR, SERIES_COLOR, TOOLTIP_STYLE } from './palette'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { CashFlowResponse } from '@/types/report'
import { formatDateTime, formatMoney, formatMoneyCompact } from '@/utils/format'

/** A partir de aqui el Brush deja de ser un adorno y empieza a hacer falta para leer el grafico. */
const ZOOM_THRESHOLD = 12

/**
 * Por debajo de esto se marca cada movimiento con un punto. No es decoracion: con un solo
 * movimiento en el rango (el preset «Hoy» de un dia tranquilo) el area no tiene ancho y la linea
 * no tiene a donde ir, asi que sin punto el grafico sale en blanco aunque el dato exista.
 */
const DOT_THRESHOLD = 30

export function CashFlowChart({ data }: { data: CashFlowResponse[] }) {
  const reducedMotion = useReducedMotion()
  const zoomable = data.length > ZOOM_THRESHOLD

  return (
    <ResponsiveContainer width="100%" height={zoomable ? 320 : 280}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <defs>
          {/* Relleno muy claro: la que lleva la informacion es la linea de arriba, el area solo
              ayuda a ver de que lado del cero esta. */}
          <linearGradient id="cashFlowFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIES_COLOR} stopOpacity={0.22} />
            <stop offset="100%" stopColor={SERIES_COLOR} stopOpacity={0.02} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke={GRID_COLOR} vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          minTickGap={32}
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

        {/* El cero es el unico valor con significado propio de la serie: por encima el periodo va
            en positivo, por debajo se ha gastado mas de lo que ha entrado. */}
        <ReferenceLine y={0} stroke="#94a3b8" />

        <Tooltip
          {...TOOLTIP_STYLE}
          formatter={(value) => [formatMoney(Number(value)), 'Acumulado']}
          labelFormatter={(label) => (typeof label === 'string' ? formatDateTime(label) : label)}
        />

        {/* stepAfter y no una curva: el acumulado no sube poco a poco entre dos movimientos, se
            queda quieto y pega el salto cuando entra el siguiente. Interpolar dibujaria un dinero
            que no existio en las fechas de en medio. */}
        <Area
          type="stepAfter"
          dataKey="balance"
          name="Acumulado"
          stroke={SERIES_COLOR}
          strokeWidth={2}
          fill="url(#cashFlowFill)"
          dot={
            data.length <= DOT_THRESHOLD
              ? { r: 3, strokeWidth: 2, stroke: '#ffffff', fill: SERIES_COLOR }
              : false
          }
          activeDot={{ r: 5, strokeWidth: 2, stroke: '#ffffff' }}
          isAnimationActive={!reducedMotion}
        />

        {zoomable && (
          <Brush
            dataKey="date"
            height={26}
            travellerWidth={10}
            stroke={SERIES_COLOR}
            fill="#f8fafc"
            tickFormatter={formatShortDate}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  )
}

const SHORT_DATE = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' })

/** En el eje no cabe la fecha completa; la exacta, con hora, la da el tooltip. */
function formatShortDate(value: string): string {
  return SHORT_DATE.format(new Date(value))
}
