import { Link } from 'react-router-dom'

import { Panel } from '@/components/dashboard/Panel'
import { useAccounts } from '@/hooks/useAccounts'
import { useSavingsGoals } from '@/hooks/useSavingsGoals'
import { formatMoney } from '@/utils/format'

const MAX_GOALS = 4

/**
 * Avance de las metas, calculado aqui y no pidiendo la proyeccion de cada una: la proyeccion es
 * una peticion por meta y trae 24 puntos de serie que en el dashboard no se pintan. El avance en
 * si es una division, y el ahorro acumulado que usa el backend es exactamente la suma de los
 * saldos de las cuentas, que ya esta en cache.
 *
 * Consecuencia que conviene tener presente: ese ahorro es comun a todas las metas, no hay una
 * hucha por meta. Dos metas de 1.000 € con 1.000 € en las cuentas salen las dos al 100 %, y es
 * correcto segun el modelo — por eso el saldo se dice una vez arriba, en vez de repetirlo dentro
 * de cada barra como si fuera de esa meta.
 */
export function GoalsSummary() {
  const { data: goals, isPending, isFetching, isError, error } = useSavingsGoals()
  const { data: accounts, isPending: accountsPending } = useAccounts()

  const savings = (accounts ?? []).reduce((sum, account) => sum + account.balance, 0)

  return (
    <Panel
      title="Metas de ahorro"
      hint={
        accountsPending
          ? undefined
          : `Ahorro disponible: ${formatMoney(savings)} — el saldo de todas tus cuentas, común a todas las metas.`
      }
      actions={
        <Link
          to="/goals"
          className="rounded text-sm font-medium text-slate-900 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
        >
          Ver metas
        </Link>
      }
      isPending={isPending || accountsPending}
      isFetching={isFetching}
      isError={isError}
      error={error}
      errorMessage="No se han podido cargar las metas."
      isEmpty={goals !== undefined && goals.length === 0}
      emptyMessage="Todavía no tienes ninguna meta."
    >
      <ul className="flex flex-col gap-4">
        {(goals ?? []).slice(0, MAX_GOALS).map((goal) => {
          // Una meta de 0 no la deja crear el backend (@DecimalMin("0.01")), pero dividir por el
          // objetivo sin mirar convertiria cualquier dato raro en un NaN pintado en pantalla.
          const ratio = goal.targetAmount > 0 ? savings / goal.targetAmount : 0
          const percent = Math.min(100, Math.max(0, Math.round(ratio * 100)))
          const reached = savings >= goal.targetAmount

          return (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between gap-4 text-sm">
                <Link
                  to={`/goals/${goal.id}`}
                  className="truncate rounded font-medium text-slate-900 underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-slate-900"
                >
                  {goal.name}
                </Link>
                <span className="whitespace-nowrap tabular-nums text-slate-600">
                  {formatMoney(goal.targetAmount)}
                </span>
              </div>

              {/* El porcentaje va escrito al lado de la barra: la longitud sola no es un dato que
                  se pueda leer, y un lector de pantalla no ve la barra en absoluto. */}
              <div className="mt-1.5 flex items-center gap-3">
                <div
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Avance de ${goal.name}`}
                  className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                >
                  <div
                    className={`h-full rounded-full ${reached ? 'bg-emerald-600' : 'bg-slate-900'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm tabular-nums text-slate-600">
                  {percent}%
                </span>
              </div>
            </li>
          )
        })}
      </ul>

      {goals !== undefined && goals.length > MAX_GOALS && (
        <p className="mt-4 text-sm text-slate-500">
          y {goals.length - MAX_GOALS} más.{' '}
          <Link
            to="/goals"
            className="rounded font-medium text-slate-900 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Verlas todas
          </Link>
        </p>
      )}
    </Panel>
  )
}
