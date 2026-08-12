import { AxiosError } from 'axios'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { getErrorMessage } from '@/api/errors'
import { useChartPalette } from '@/components/charts/palette'
import { ProjectionChart } from '@/components/charts/ProjectionChart'
import { monthlyRate, SCENARIOS, type Scenario } from '@/components/charts/scenarios'
import { useSavingsGoalProjection } from '@/hooks/useSavingsGoals'
import type { SavingsProjectionResponse } from '@/types/goal'
import { formatDate, formatMoney, formatYearMonth } from '@/utils/format'

const ALL_VISIBLE: Record<Scenario, boolean> = {
  optimistic: true,
  realistic: true,
  pessimistic: true,
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: projection, isPending, isError, error } = useSavingsGoalProjection(id)
  const palette = useChartPalette()
  const [visible, setVisible] = useState<Record<Scenario, boolean>>(ALL_VISIBLE)

  const toggle = (scenario: Scenario) =>
    setVisible((current) => ({ ...current, [scenario]: !current[scenario] }))

  if (isPending) {
    return <p className="text-tinta-suave">Cargando la proyección…</p>
  }

  if (isError) {
    return (
      <div>
        <p role="alert" className="rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
          {projectionErrorMessage(error)}
        </p>
        <BackLink />
      </div>
    )
  }

  // Los que no llegan nunca no se dibujan: una linea que no cruza la meta en 24 meses no dice
  // si el problema es el ritmo o el tramo que se esta mirando. Lo explica el aviso de abajo.
  const unreachable = SCENARIOS.filter((scenario) => projection[scenario.etaField] === null)

  return (
    <section>
      <BackLink />

      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-tinta">
        {projection.goalName}
      </h1>
      <p className="mt-1 text-tinta-suave">
        Objetivo de {formatMoney(projection.targetAmount)}
        {projection.targetDate !== null && (
          <>
            {' '}
            antes del{' '}
            <time dateTime={projection.targetDate}>{formatDate(projection.targetDate)}</time>
          </>
        )}
        .
      </p>

      <Deadline projection={projection} />

      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Ahorrado" value={formatMoney(projection.currentBalance)} />
        <Stat label="Falta" value={formatMoney(projection.remainingAmount)} />
        <Stat
          label="Ahorro medio"
          value={`${formatMoney(projection.averageMonthlyNet)}/mes`}
          hint="Media de los 6 meses cerrados anteriores; el mes en curso no cuenta."
        />
        <Stat
          label="Variación"
          value={`± ${formatMoney(projection.monthlyNetStdDeviation)}`}
          hint="Lo que oscila el ahorro de un mes a otro. Es lo que separa los tres escenarios."
        />
      </dl>

      <fieldset className="mt-8">
        <legend className="text-sm font-medium text-tinta-suave">Escenarios</legend>
        {/* La banda hay que explicarla en texto: rayada no significa nada por si misma, y en la
            leyenda del grafico no cabe sin repetir lo que ya dicen las tres lineas. */}
        <p className="mt-1 text-sm text-tinta-tenue">
          La zona rayada entre la pesimista y la optimista es el margen del ritmo de ahorro. Si se
          cierra en una línea es que ahorras siempre lo mismo, no que falte un dato.
        </p>
        <div className="mt-2 flex flex-wrap gap-4">
          {SCENARIOS.map((scenario) => {
            const reachable = projection[scenario.etaField] !== null

            return (
              <label
                key={scenario.key}
                className={`flex items-center gap-2 text-sm ${reachable ? 'text-tinta-suave' : 'text-tinta-tenue'}`}
              >
                <input
                  type="checkbox"
                  checked={reachable && visible[scenario.key]}
                  disabled={!reachable}
                  onChange={() => toggle(scenario.key)}
                  className="size-4 accent-cobalto"
                />
                <span
                  aria-hidden="true"
                  className="inline-block h-0.5 w-6"
                  style={{
                    backgroundColor: reachable
                      ? palette.escenarios[scenario.key]
                      : 'var(--borde-fuerte)',
                  }}
                />
                {scenario.label}
                {!reachable && ' (no llega)'}
              </label>
            )
          })}
        </div>
      </fieldset>

      <div className="mt-4 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
        <ProjectionChart projection={projection} visible={visible} />
      </div>

      {unreachable.length > 0 && (
        <div role="status" className="mt-4 rounded-md bg-laton-tenue px-4 py-3 text-sm text-laton">
          <p className="font-medium">
            {unreachable.length === SCENARIOS.length
              ? 'A este ritmo no alcanzas la meta en ningún escenario.'
              : 'Hay escenarios que no alcanzan la meta, y por eso no se dibujan:'}
          </p>
          <ul className="mt-1 list-disc pl-5">
            {unreachable.map((scenario) => {
              const rate = monthlyRate(projection, scenario)

              return (
                <li key={scenario.key}>
                  {scenario.label}
                  {rate !== null && `: ${formatMoney(rate)}/mes`}
                  {rate !== null && rate <= 0 && ' — a ese ritmo el saldo no sube'}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <Etas projection={projection} />
    </section>
  )
}

/** Los ETA en texto: el grafico da la forma, pero el mes concreto se lee mejor escrito. */
function Etas({ projection }: { projection: SavingsProjectionResponse }) {
  const lastDrawnMonth = projection.monthlyBreakdown.at(-1)?.month

  return (
    <dl className="mt-6 grid gap-4 sm:grid-cols-3">
      {SCENARIOS.map((scenario) => {
        const eta = projection[scenario.etaField]
        const beyondChart = eta !== null && lastDrawnMonth !== undefined && eta > lastDrawnMonth

        return (
          <div
            key={scenario.key}
            className="rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta"
          >
            <dt className="text-sm text-tinta-tenue">{scenario.label}</dt>
            <dd className="mt-1 font-medium text-tinta">
              {eta === null ? 'No se alcanza' : formatYearMonth(eta)}
            </dd>
            {beyondChart && (
              <p className="mt-1 text-xs text-tinta-tenue">Más allá del tramo del gráfico.</p>
            )}
          </div>
        )
      })}
    </dl>
  )
}

/**
 * Los tres estados de onTrackForTargetDate son distintos: true va a tiempo, false no llega, y
 * null es que la meta no tiene fecha limite, asi que no hay plazo contra el que ir bien o mal.
 */
function Deadline({ projection }: { projection: SavingsProjectionResponse }) {
  if (projection.onTrackForTargetDate === null) {
    return null
  }

  if (projection.onTrackForTargetDate) {
    return (
      <p className="mt-4 rounded-md bg-exito-tenue px-4 py-3 text-sm text-exito">
        Vas a tiempo para la fecha límite.
      </p>
    )
  }

  return (
    <p role="status" className="mt-4 rounded-md bg-laton-tenue px-4 py-3 text-sm text-laton">
      No llegas a la fecha límite al ritmo actual.
      {projection.additionalMonthlySavingsNeeded !== null &&
        ` Tendrías que ahorrar ${formatMoney(projection.additionalMonthlySavingsNeeded)} más cada mes.`}
    </p>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
      <dt className="text-sm text-tinta-tenue">{label}</dt>
      <dd className="mt-1 text-xl cifra text-tinta">{value}</dd>
      {hint !== undefined && <p className="mt-1 text-xs text-tinta-tenue">{hint}</p>}
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/goals"
      className="rounded text-sm text-tinta-suave underline underline-offset-4 foco"
    >
      ← Volver a metas
    </Link>
  )
}

/** El 404 del backend llega en ingles y con el UUID dentro; no es para leerlo. */
function projectionErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.status === 404) {
    return 'No hemos encontrado esa meta.'
  }
  return getErrorMessage(error, 'No se ha podido cargar la proyección.')
}
