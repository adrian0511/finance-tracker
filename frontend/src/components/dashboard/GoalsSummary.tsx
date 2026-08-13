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
export function GoalsSummary({ contentHeight }: { contentHeight?: number }) {
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
          className="rounded text-sm font-medium text-tinta underline underline-offset-4 foco"
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
      contentHeight={contentHeight}
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
                  className="truncate rounded font-medium text-tinta underline-offset-4 foco hover:underline"
                >
                  {goal.name}
                </Link>
                <span className="whitespace-nowrap cifra text-tinta-suave">
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
                  className="h-2 flex-1 overflow-hidden rounded-full bg-superficie-alta"
                >
                  <div
                    // Cobalto mientras se avanza y laton al llegar: el laton es la meta en
                    // toda la app, asi que alcanzarla es literalmente ponerse de ese color.
                    className={`h-full rounded-full ${reached ? 'bg-laton' : 'bg-cobalto'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-10 text-right text-sm cifra text-tinta-suave">{percent}%</span>
              </div>
            </li>
          )
        })}
      </ul>

      {goals !== undefined && goals.length > MAX_GOALS && (
        <p className="mt-4 text-sm text-tinta-tenue">
          y {goals.length - MAX_GOALS} más.{' '}
          <Link
            to="/goals"
            className="rounded font-medium text-tinta underline underline-offset-4 foco"
          >
            Verlas todas
          </Link>
        </p>
      )}
    </Panel>
  )
}
