import { Link } from 'react-router-dom'

import type { CategorySelection } from '@/components/charts/CategoryPieChart'
import { Panel } from '@/components/dashboard/Panel'
import { TypeBadge } from '@/components/ui/TypeBadge'
import { useAccounts } from '@/hooks/useAccounts'
import { useTransactions } from '@/hooks/useTransactions'
import type { TransactionResponse } from '@/types/transaction'
import { formatDateTime, formatMoney } from '@/utils/format'
import type { Period } from '@/utils/period'

const MAX_ROWS = 8

interface RecentTransactionsProps {
  period: Period
  selection: CategorySelection | null
  onClearSelection: () => void
}

/**
 * Los ultimos movimientos del periodo, con el filtro que llega del donut.
 *
 * Se recorta en el cliente sobre la lista completa del usuario, que es la unica que expone la
 * API (no hay un endpoint de movimientos por rango). Funciona y es instantaneo al cambiar de
 * filtro porque la lista ya esta en cache, pero crece con el historico: el dia que un usuario
 * acumule miles de movimientos, esto pide un endpoint paginado con from/to.
 */
export function RecentTransactions({
  period,
  selection,
  onClearSelection,
}: RecentTransactionsProps) {
  const { data: transactions, isPending, isFetching, isError, error } = useTransactions()
  const { data: accounts } = useAccounts()

  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]))
  const matching = (transactions ?? []).filter(
    (transaction) => inPeriod(transaction, period) && inSelection(transaction, selection),
  )

  return (
    <Panel
      title="Movimientos del periodo"
      hint={
        selection === null
          ? 'Los más recientes primero. Pincha una categoría del donut para filtrar.'
          : undefined
      }
      actions={
        selection !== null && (
          <button
            type="button"
            onClick={onClearSelection}
            className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            {selection.label} <span aria-hidden="true">✕</span>
            <span className="sr-only">Quitar el filtro de categoría</span>
          </button>
        )
      }
      isPending={isPending}
      isFetching={isFetching}
      isError={isError}
      error={error}
      errorMessage="No se han podido cargar los movimientos."
      isEmpty={matching.length === 0}
      emptyMessage={
        selection === null
          ? 'No hay movimientos en este periodo.'
          : `No hay movimientos de ${selection.label} en este periodo.`
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4 font-medium">
                Fecha
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Categoría
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Tipo
              </th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">
                Importe
              </th>
              <th scope="col" className="py-2 font-medium">
                Cuenta
              </th>
            </tr>
          </thead>
          <tbody>
            {matching.slice(0, MAX_ROWS).map((transaction) => (
              <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 whitespace-nowrap tabular-nums text-slate-600">
                  {formatDateTime(transaction.date)}
                </td>
                <td className="py-2 pr-4 text-slate-900">{transaction.category ?? '—'}</td>
                <td className="py-2 pr-4">
                  <TypeBadge type={transaction.type} />
                </td>
                <td
                  className={`py-2 pr-4 text-right whitespace-nowrap tabular-nums ${
                    transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'
                  }`}
                >
                  {transaction.type === 'EXPENSE' && '−'}
                  {formatMoney(transaction.amount)}
                </td>
                <td className="py-2 text-slate-600">
                  {accountNames.get(transaction.accountId) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {matching.length > MAX_ROWS && (
        <p className="mt-3 text-sm text-slate-500">
          {matching.length - MAX_ROWS} más en el periodo.{' '}
          <Link
            to={transactionsLink(period, selection)}
            className="rounded font-medium text-slate-900 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Verlos todos
          </Link>
        </p>
      )}
    </Panel>
  )
}

/**
 * Se compara la parte de fecha como texto: las cadenas ISO se ordenan igual alfabeticamente que
 * cronologicamente, asi que no hace falta construir un Date por movimiento y por render.
 */
function inPeriod(transaction: TransactionResponse, period: Period): boolean {
  const day = transaction.date.slice(0, 10)

  return day >= period.from && day <= period.to
}

function inSelection(
  transaction: TransactionResponse,
  selection: CategorySelection | null,
): boolean {
  if (selection === null) {
    return true
  }
  // El donut es de gastos: filtrar por su categoria tiene que dejar fuera los ingresos, o una
  // categoria usada en ambos sentidos ensenaria filas que no estan en la porcion pinchada.
  return transaction.type === 'EXPENSE' && selection.categories.includes(transaction.category)
}

function transactionsLink(period: Period, selection: CategorySelection | null): string {
  const params = new URLSearchParams({ from: period.from, to: period.to })

  // Una sola categoria se puede pasar por la URL; «Otras» son varias y no tiene equivalente en
  // la pantalla de movimientos, asi que el enlace se queda solo con el rango.
  if (selection !== null && selection.categories.length === 1) {
    const [category] = selection.categories
    if (category !== null && category !== undefined) {
      params.set('category', category)
    }
  }

  return `/transactions?${params.toString()}`
}
