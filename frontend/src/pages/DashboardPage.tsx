import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CashFlowChart } from '@/components/charts/CashFlowChart'
import { CategoryPieChart, type CategorySelection } from '@/components/charts/CategoryPieChart'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { AIInsightPanel } from '@/components/dashboard/AIInsightPanel'
import { BalanceSummary } from '@/components/dashboard/BalanceSummary'
import { GoalsSummary } from '@/components/dashboard/GoalsSummary'
import { Panel } from '@/components/dashboard/Panel'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { useAnalysis, useReport } from '@/hooks/useAI'
import { useCashFlowReport, useCategoryReport, useMonthlyReport } from '@/hooks/useReports'
import { useTransactions } from '@/hooks/useTransactions'
import { monthPeriod, presetPeriod, type Period } from '@/utils/period'

/**
 * La pagina, en ancho grande (en movil es todo una columna, en el mismo orden):
 *
 *   ┌───────────────────────────────────────────────────────────────┐
 *   │ PERIODO   [hoy][semana][mes][año]   desde ▢   hasta ▢          │
 *   ├───────────────────┬───────────────────┬───────────────────────┤
 *   │ Ingresos          │ Gastos            │ Balance neto          │
 *   ├───────────────────┴───────────────────┴───────────────────────┤
 *   │ Flujo de caja                                    (ancho total)│
 *   ├───────────────────────────────┬───────────────────────────────┤
 *   │ Gasto por categoria (donut)   │ Metas de ahorro               │
 *   ├───────────────────────────────┴───────────────────────────────┤
 *   │ Movimientos del periodo          ← lo que filtra el donut      │
 *   ├───────────────────────────────────────────────────────────────┤
 *   │ Ingresos y gastos por mes                            [año ▾]  │
 *   ├───────────────────────────────┬───────────────────────────────┤
 *   │ Análisis (IA)     [Generar]   │ Informe del mes (IA) [Generar]│
 *   └───────────────────────────────┴───────────────────────────────┘
 *
 * Dos cosas del orden no son estéticas y no se pueden mover sueltas: el periodo va arriba del
 * todo porque manda sobre todo lo que hay debajo, y la tabla va inmediatamente bajo el donut
 * porque es lo que se filtra al pinchar una porcion — separarlos deja el filtro fuera de la
 * vista y la tabla cambia sin que se vea por que.
 *
 * Las dos de IA cierran la pagina y arrancan vacias: son lo unico que no se pide solo, porque
 * detras hay un modelo con cuota y una espera de segundos. Tampoco dependen del periodo.
 */

/** Años que ofrece el selector del grafico mensual, hacia atras desde el actual. */
const YEARS_BACK = 5

/**
 * Alto que se le reserva al contenido de cada panel mientras carga, para que la pagina no pegue
 * un salto al llegar los datos (ver `Panel.contentHeight`).
 *
 * Los tres primeros son el `height` que ya declara el `ResponsiveContainer` de cada grafico, asi
 * que no son estimaciones: si se cambia el alto de un grafico, hay que cambiarlo aqui tambien.
 * `metas` acompaña al donut porque comparten fila y la fila la marca el mas alto de los dos.
 */
const ALTO = {
  flujo: 280,
  categorias: 240,
  metas: 240,
  mensual: 300,
} as const

export default function DashboardPage() {
  const navigate = useNavigate()

  // El periodo vive aqui, no en el selector: es lo que comparten todos los informes de la
  // pagina, y al entrar en la clave de cada query, cambiarlo ya dispara solo el refetch.
  const [period, setPeriod] = useState<Period>(() => presetPeriod('month'))
  const [selection, setSelection] = useState<CategorySelection | null>(null)
  const [year, setYear] = useState(() => new Date().getFullYear())

  // Un rango invertido lo rechaza el backend con un 400: no se pide hasta que vuelva a tener
  // sentido, para no llenar la pantalla de errores mientras se escribe una fecha a mano. El
  // rango se manda igual aunque no valga, para que la clave no colapse en la del rango por
  // defecto y la pagina acabe ensenando seis meses cualesquiera como si fueran los pedidos.
  const valid = period.from <= period.to
  const range = { from: period.from, to: period.to }

  const cashFlow = useCashFlowReport(range, valid)
  const categories = useCategoryReport(range, valid)
  const monthly = useMonthlyReport(year)

  // Las dos de IA no reciben el periodo: el backend mira el historico reciente y el mes en curso
  // por su cuenta. Y no se piden solas — las dispara el boton de cada tarjeta.
  const analysis = useAnalysis()
  const report = useReport()

  /**
   * Sin un solo movimiento, los dos endpoints contestan su mensaje de guardia sin llamar al
   * modelo. Es decir, no se gasta cuota — pero el viaje si se gasta, y aqui ya se sabe la
   * respuesta: la lista esta en cache, la pide `RecentTransactions` en esta misma pagina.
   *
   * Solo se bloquea cuando consta que hay cero. Mientras la lista no ha llegado (`undefined`)
   * el boton se queda activo: apagarlo por no saber todavia seria decirle al usuario que le
   * falta algo cuando a lo mejor tiene cien movimientos.
   */
  const { data: transactions } = useTransactions()
  const noTransactions = transactions !== undefined && transactions.length === 0
  const needsTransactions = noTransactions
    ? 'Necesitas al menos un movimiento registrado para que la IA tenga algo que leer.'
    : undefined

  const changePeriod = (next: Period) => {
    setPeriod(next)
    // El filtro del donut se suelta al cambiar de periodo: una categoria que existia en marzo
    // puede no tener ni un movimiento en abril, y la tabla se quedaria vacia sin decir por que.
    setSelection(null)
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-tinta">Resumen</h1>
        <p className="mt-2 text-tinta-suave">
          Todo lo de esta página se mide sobre el mismo periodo, menos el gráfico anual, que tiene
          su propio selector.
        </p>
      </div>

      <PeriodSelector value={period} onChange={changePeriod} />

      <BalanceSummary range={range} enabled={valid} />

      <Panel
        title="Flujo de caja"
        hint="Cuánto ha subido o bajado el dinero durante el periodo. Arranca en cero: no es el saldo de tus cuentas."
        isPending={cashFlow.isPending}
        isFetching={cashFlow.isFetching}
        isError={cashFlow.isError}
        error={cashFlow.error}
        errorMessage="No se ha podido cargar el flujo de caja."
        isEmpty={cashFlow.data?.length === 0}
        emptyMessage="No hay movimientos en este periodo."
        contentHeight={ALTO.flujo}
      >
        <CashFlowChart data={cashFlow.data ?? []} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Gasto por categoría"
          hint="Solo gastos. Pincha una porción para filtrar los movimientos de abajo."
          isPending={categories.isPending}
          isFetching={categories.isFetching}
          isError={categories.isError}
          error={categories.error}
          errorMessage="No se ha podido cargar el desglose por categoría."
          isEmpty={categories.data?.length === 0}
          emptyMessage="No hay gastos en este periodo."
          contentHeight={ALTO.categorias}
        >
          <CategoryPieChart
            data={categories.data ?? []}
            selected={selection}
            onSelect={setSelection}
          />
        </Panel>

        <GoalsSummary contentHeight={ALTO.metas} />
      </div>

      <RecentTransactions
        period={period}
        selection={selection}
        onClearSelection={() => setSelection(null)}
      />

      <Panel
        title="Ingresos y gastos por mes"
        hint="El año completo, al margen del periodo de arriba. Pincha un mes para ver sus movimientos."
        actions={<YearSelect value={year} onChange={setYear} />}
        isPending={monthly.isPending}
        isFetching={monthly.isFetching}
        isError={monthly.isError}
        error={monthly.error}
        errorMessage="No se ha podido cargar el resumen mensual."
        isEmpty={monthly.data?.length === 0}
        emptyMessage={`No hay movimientos en ${year}.`}
        contentHeight={ALTO.mensual}
      >
        <MonthlyBarChart
          data={monthly.data ?? []}
          onSelectMonth={(month) => {
            const { from, to } = monthPeriod(year, month)
            void navigate(`/transactions?from=${from}&to=${to}`)
          }}
        />
      </Panel>

      {/* Dos tarjetas y no una con pestañas: son dos textos distintos que se leen a la vez, y uno
          puede estar generado y el otro no. Van al final porque son lo unico de la pagina que hay
          que pedir a mano — arriba interrumpirian la lectura con dos huecos vacios. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AIInsightPanel
          title="Análisis de tus movimientos"
          hint="Lo que ve la IA en tus últimos movimientos. Tarda unos segundos y se pide a mano."
          pendingLabel="Analizando tus finanzas…"
          data={analysis.data}
          isFetching={analysis.isFetching}
          isError={analysis.isError}
          error={analysis.error}
          errorMessage="No se ha podido generar el análisis."
          onGenerate={() => void analysis.refetch()}
          disabledReason={needsTransactions}
        />

        <AIInsightPanel
          title="Informe del mes"
          hint="Resumen del mes en curso, con recomendaciones para el siguiente."
          pendingLabel="Redactando el informe del mes…"
          data={report.data}
          isFetching={report.isFetching}
          isError={report.isError}
          error={report.error}
          errorMessage="No se ha podido generar el informe."
          onGenerate={() => void report.refetch()}
          // Mismo bloqueo que el analisis, y solo ese. El informe ademas se queda vacio si no hay
          // movimientos *de este mes*, pero eso no se decide aqui: el backend corta por
          // YearMonth.now() del servidor, y replicar el corte con la fecha del navegador apagaria
          // el boton a destiempo en el cambio de mes o con otro huso horario.
          disabledReason={needsTransactions}
        />
      </div>
    </section>
  )
}

function YearSelect({ value, onChange }: { value: number; onChange: (year: number) => void }) {
  const current = new Date().getFullYear()
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => current - index)

  return (
    <label className="flex items-center gap-2 text-sm text-tinta-suave">
      Año
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="cifra foco rounded-md border border-borde-fuerte bg-superficie px-2 py-1 text-tinta"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  )
}
