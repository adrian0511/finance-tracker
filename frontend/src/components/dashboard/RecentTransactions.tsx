import { useState } from 'react'
import { Link } from 'react-router-dom'

import type { CategorySelection } from '@/components/charts/CategoryPieChart'
import { Panel } from '@/components/dashboard/Panel'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { Pagination } from '@/components/ui/Pagination'
import { TypeBadge } from '@/components/ui/TypeBadge'
import { useAccounts } from '@/hooks/useAccounts'
import { usePagination } from '@/hooks/usePagination'
import { useTransactions } from '@/hooks/useTransactions'
import type { TransactionType } from '@/types/common'
import type { TransactionResponse } from '@/types/transaction'
import { formatDateTime, formatMoney } from '@/utils/format'
import type { Period } from '@/utils/period'
import { TYPE_LABELS } from '@/utils/transactionFilter'

/** Pagina corta: es una tarjeta de resumen dentro de una pagina con cuatro graficos mas. */
const PAGE_SIZE = 8

/**
 * Alto reservado para la tabla mientras carga (ver `Panel.contentHeight`). A diferencia de los
 * graficos aqui no hay ningun alto declarado del que salga: se calcula con lo que mide una fila
 * por las de una pagina, mas cabecera, paginador y enlace. Comprobado midiendo el panel.
 */
const ROW_HEIGHT = 37
const TABLE_CHROME = 70
const CONTENT_HEIGHT = ROW_HEIGHT * (PAGE_SIZE + 1) + TABLE_CHROME

interface RecentTransactionsProps {
  period: Period
  selection: CategorySelection | null
  onClearSelection: () => void
}

/**
 * Los ultimos movimientos del periodo, con el filtro que llega del donut y el de tipo que se
 * elige aqui.
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

  // El tipo es estado local y no de la URL, al reves que en la pantalla de Movimientos: aqui es
  // un ajuste de una tarjeta dentro del dashboard, no la vista entera.
  const [type, setType] = useState<TransactionType | null>(null)

  // Una porcion del donut ya significa «gastos de esta categoria», asi que mientras haya una
  // elegida el tipo se queda fijo en gastos. Sin esto, pulsar «Ingresos» daria siempre una tabla
  // vacia y nada explicaria por que.
  const lockedType = selection !== null ? ('EXPENSE' as const) : undefined
  const effectiveType = lockedType ?? type

  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]))
  const matching = (transactions ?? []).filter(
    (transaction) =>
      inPeriod(transaction, period) &&
      inSelection(transaction, selection) &&
      (effectiveType === null || transaction.type === effectiveType),
  )
  // Cambiar de periodo, de categoria o de tipo devuelve a la pagina 1: son listas distintas, y la
  // pagina 3 de la anterior no significa nada en la nueva.
  const pages = usePagination(
    matching,
    PAGE_SIZE,
    `${period.from}|${period.to}|${selection?.label}|${effectiveType}`,
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
            className="foco rounded-full bg-superficie-alta px-3 py-1 text-sm text-tinta-suave"
          >
            {selection.label} <span aria-hidden="true">✕</span>
            <span className="sr-only">Quitar el filtro de categoría</span>
          </button>
        )
      }
      toolbar={
        <TransactionFilters
          filter={{ from: period.from, to: period.to, category: null, type }}
          // Aqui solo se pinta el control de tipo, asi que el parche solo puede traer eso.
          onChange={({ type: next }) => setType(next ?? null)}
          lockedType={lockedType}
          lockedReason="La categoría del donut ya son gastos."
        />
      }
      isPending={isPending}
      isFetching={isFetching}
      isError={isError}
      error={error}
      errorMessage="No se han podido cargar los movimientos."
      isEmpty={matching.length === 0}
      emptyMessage={emptyMessage(selection, effectiveType)}
      contentHeight={CONTENT_HEIGHT}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-borde text-tinta-tenue">
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
            {pages.items.map((transaction) => (
              <tr key={transaction.id} className="border-b border-borde last:border-0">
                <td className="cifra py-2 pr-4 whitespace-nowrap text-tinta-suave">
                  {formatDateTime(transaction.date)}
                </td>
                <td className="py-2 pr-4 text-tinta">{transaction.category ?? '—'}</td>
                <td className="py-2 pr-4">
                  <TypeBadge type={transaction.type} />
                </td>
                <td
                  className={`cifra py-2 pr-4 text-right whitespace-nowrap ${
                    transaction.type === 'INCOME' ? 'text-exito' : 'text-tinta'
                  }`}
                >
                  {transaction.type === 'EXPENSE' && '−'}
                  {formatMoney(transaction.amount)}
                </td>
                <td className="py-2 text-tinta-suave">
                  {accountNames.get(transaction.accountId) ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        page={pages.page}
        pageCount={pages.pageCount}
        first={pages.first}
        last={pages.last}
        total={pages.total}
        noun="movimientos"
        onChange={pages.setPage}
      />

      {/* El enlace se queda aunque ahora se pueda paginar y filtrar aqui: la pantalla de
          movimientos deja ademas borrar y dar de alta, que es a lo que se va cuando la lista es
          larga. Se lleva puesto el filtro que haya, para no tener que rehacerlo alli. */}
      <p className="mt-2 text-sm">
        <Link
          to={transactionsLink(period, selection, effectiveType)}
          className="foco rounded font-medium text-cobalto underline underline-offset-4"
        >
          Abrir en Movimientos
        </Link>
      </p>
    </Panel>
  )
}

function emptyMessage(selection: CategorySelection | null, type: TransactionType | null): string {
  if (selection !== null) {
    return `No hay movimientos de ${selection.label} en este periodo.`
  }
  if (type !== null) {
    return `No hay ${TYPE_LABELS[type].toLowerCase()} en este periodo.`
  }
  return 'No hay movimientos en este periodo.'
}

/**
 * Se compara la parte de fecha como texto: las cadenas ISO se ordenan igual alfabeticamente que
 * cronologicamente, asi que no hace falta construir un Date por movimiento y por render.
 */
function inPeriod(transaction: TransactionResponse, period: Period): boolean {
  const day = transaction.date.slice(0, 10)

  return day >= period.from && day <= period.to
}

/**
 * El filtro del donut no cabe en un `TransactionFilter`: «Otras» son varias categorias a la vez, y
 * aquel solo lleva una. Por eso esta comprobacion se queda aqui y no en `utils/transactionFilter`.
 */
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

function transactionsLink(
  period: Period,
  selection: CategorySelection | null,
  type: TransactionType | null,
): string {
  const params = new URLSearchParams({ from: period.from, to: period.to })

  if (type !== null) {
    params.set('type', type)
  }

  // Una sola categoria se puede pasar por la URL; «Otras» son varias y no tiene equivalente en
  // la pantalla de movimientos, asi que el enlace se queda solo con el rango.
  if (selection !== null && selection.categories.length === 1) {
    const [category] = selection.categories
    // La cadena vacia es «sin categoria», que la otra pantalla tambien entiende.
    if (category !== undefined) {
      params.set('category', category ?? '')
    }
  }

  return `/transactions?${params.toString()}`
}
