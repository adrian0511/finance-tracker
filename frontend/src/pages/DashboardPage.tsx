import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { CashFlowChart } from '@/components/charts/CashFlowChart'
import { CategoryPieChart, type CategorySelection } from '@/components/charts/CategoryPieChart'
import { MonthlyBarChart } from '@/components/charts/MonthlyBarChart'
import { BalanceSummary } from '@/components/dashboard/BalanceSummary'
import { GoalsSummary } from '@/components/dashboard/GoalsSummary'
import { Panel } from '@/components/dashboard/Panel'
import { PeriodSelector } from '@/components/dashboard/PeriodSelector'
import { RecentTransactions } from '@/components/dashboard/RecentTransactions'
import { useCashFlowReport, useCategoryReport, useMonthlyReport } from '@/hooks/useReports'
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
 *   └───────────────────────────────────────────────────────────────┘
 *
 * Dos cosas del orden no son estéticas y no se pueden mover sueltas: el periodo va arriba del
 * todo porque manda sobre todo lo que hay debajo, y la tabla va inmediatamente bajo el donut
 * porque es lo que se filtra al pinchar una porcion — separarlos deja el filtro fuera de la
 * vista y la tabla cambia sin que se vea por que.
 */

/** Años que ofrece el selector del grafico mensual, hacia atras desde el actual. */
const YEARS_BACK = 5

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
        >
          <CategoryPieChart
            data={categories.data ?? []}
            selected={selection}
            onSelect={setSelection}
          />
        </Panel>

        <GoalsSummary />
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
      >
        <MonthlyBarChart
          data={monthly.data ?? []}
          onSelectMonth={(month) => {
            const { from, to } = monthPeriod(year, month)
            void navigate(`/transactions?from=${from}&to=${to}`)
          }}
        />
      </Panel>
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
