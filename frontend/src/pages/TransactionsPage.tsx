import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { TransactionFilters } from '@/components/transactions/TransactionFilters'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Pagination } from '@/components/ui/Pagination'
import { TypeBadge } from '@/components/ui/TypeBadge'
import { useAccounts } from '@/hooks/useAccounts'
import { usePagination } from '@/hooks/usePagination'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/useTransactions'
import type { TransactionResponse } from '@/types/transaction'
import { formatDateTime, formatMoney } from '@/utils/format'
import {
  availableCategories,
  describeFilter,
  filterToParams,
  hasFilter,
  matches,
  readFilter,
  type TransactionFilter,
} from '@/utils/transactionFilter'

/**
 * El importe se valida como texto y se convierte al enviar: un input numerico da siempre string, y
 * con z.coerce el tipo de entrada del formulario y el de salida del esquema dejan de coincidir.
 *
 * Se pide mayor que 0 aunque el backend acepte @Min(0): un movimiento de 0 no significa nada y
 * solo ensucia los informes. Y categoria no vacia, aunque el backend solo exija @NotNull, porque
 * es la clave por la que se agrupa el desglose por categorias.
 */
const PAGE_SIZE = 20

const transactionSchema = z.object({
  accountId: z.string().min(1, 'Elige una cuenta'),
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z
    .string()
    .trim()
    .min(1, 'Escribe un importe')
    .refine((value) => Number(value) > 0, 'El importe tiene que ser mayor que 0'),
  category: z.string().trim().min(1, 'Escribe una categoría').max(255, 'Máximo 255 caracteres'),
})

export default function TransactionsPage() {
  const { data: transactions, isPending, isError, error } = useTransactions()
  const { data: accounts } = useAccounts()
  const createTransaction = useCreateTransaction()
  const deleteTransaction = useDeleteTransaction()

  // El filtro vive en la URL y no en un estado local: asi el enlace desde el dashboard llega
  // filtrado, se puede compartir tal cual y recargar no lo pierde.
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = readFilter(searchParams)

  // replace y no push: son controles discretos y se toquetean varias veces seguidas. Con push,
  // salir de la pantalla obligaria a pulsar «atras» una vez por cada vez que se movio un filtro.
  const updateFilter = (patch: Partial<TransactionFilter>) =>
    setSearchParams(filterToParams({ ...filter, ...patch }), { replace: true })

  const [pendingDeletion, setPendingDeletion] = useState<TransactionResponse | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: { accountId: '', type: 'EXPENSE' as const, amount: '', category: '' },
  })

  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]))
  const hasAccounts = accounts !== undefined && accounts.length > 0

  // Las categorias del desplegable salen de todos los movimientos, no de los que quedan tras
  // filtrar: si salieran de los visibles, elegir una categoria dejaria el desplegable con esa
  // sola opcion y no habria forma de cambiar a otra.
  const { named, hasUncategorized } = availableCategories(transactions ?? [])
  const visible = (transactions ?? []).filter((transaction) => matches(transaction, filter))
  // La query string es la clave de reinicio: al cambiar el filtro hay que volver a la pagina 1.
  const pages = usePagination(visible, PAGE_SIZE, searchParams.toString())

  const onSubmit = handleSubmit((values) => {
    createTransaction.mutate(
      { ...values, amount: Number(values.amount) },
      {
        onSuccess: () =>
          reset({ accountId: values.accountId, type: values.type, amount: '', category: '' }),
      },
    )
  })

  const confirmDeletion = () => {
    if (pendingDeletion === null) {
      return
    }
    deleteTransaction.mutate(pendingDeletion.id, { onSettled: () => setPendingDeletion(null) })
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight text-tinta">Movimientos</h1>
      <p className="mt-2 text-tinta-suave">
        La fecha la pone el servidor al registrar el movimiento; no se puede dar de alta con fecha
        pasada.
      </p>

      {!hasAccounts ? (
        <p className="mt-6 rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
          Necesitas una cuenta antes de registrar movimientos.{' '}
          <Link to="/accounts" className="font-medium text-tinta underline underline-offset-4">
            Crear una cuenta
          </Link>
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-6 grid gap-4 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta sm:grid-cols-2 lg:grid-cols-5"
        >
          <SelectField
            id="accountId"
            label="Cuenta"
            error={errors.accountId?.message}
            {...register('accountId')}
          >
            <option value="">Elige una cuenta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </SelectField>

          <SelectField id="type" label="Tipo" error={errors.type?.message} {...register('type')}>
            <option value="EXPENSE">Gasto</option>
            <option value="INCOME">Ingreso</option>
          </SelectField>

          <TextField
            id="amount"
            type="number"
            step="0.01"
            min="0"
            inputMode="decimal"
            label="Importe"
            placeholder="0,00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <TextField
            id="category"
            label="Categoría"
            placeholder="Comida, Vivienda…"
            error={errors.category?.message}
            {...register('category')}
          />

          <button
            type="submit"
            disabled={createTransaction.isPending}
            className="mt-7 h-10 rounded-md bg-accion px-4 font-medium text-accion-tinta foco disabled:opacity-60"
          >
            {createTransaction.isPending ? 'Guardando…' : 'Registrar'}
          </button>
        </form>
      )}

      {/* Los filtros van pegados a la tabla y no arriba del todo: entre medias esta el formulario
          de alta, y una fila de filtros por encima de un formulario parece filtrarlo a el. Afectan
          tambien a la paginacion, porque el numero de paginas es el de las filas que pasan. */}
      <div className="mt-8 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta">
        <TransactionFilters
          filter={filter}
          categories={named}
          hasUncategorized={hasUncategorized}
          onChange={updateFilter}
          onClear={hasFilter(filter) ? () => setSearchParams({}, { replace: true }) : undefined}
          note={
            filter.from !== null || filter.to !== null ? (
              // El rango llega desde el grafico anual del dashboard y aqui no hay control para
              // tocarlo: se dice cual es y se puede quitar, que es lo unico que hace falta.
              <p className="flex items-center gap-2 text-sm text-tinta-suave">
                Fechas:
                <span className="rounded-full bg-superficie-alta px-3 py-1">
                  {describeFilter({ ...filter, type: null, category: null })}
                </span>
              </p>
            ) : undefined
          }
        />
      </div>

      {isPending && <p className="mt-4 text-tinta-suave">Cargando movimientos…</p>}

      {isError && (
        <p role="alert" className="mt-4 rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
          {getErrorMessage(error, 'No se han podido cargar los movimientos.')}
        </p>
      )}

      {transactions !== undefined &&
        (visible.length === 0 ? (
          <p className="mt-4 rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
            {hasFilter(filter)
              ? `No hay movimientos que encajen con el filtro (${describeFilter(filter)}).`
              : 'Todavía no hay movimientos.'}
          </p>
        ) : (
          // La tabla scrollea dentro de su caja: en movil no puede empujar la pagina a lo ancho.
          <div className="mt-4 overflow-x-auto rounded-lg border border-borde bg-superficie shadow-tarjeta">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-borde text-tinta-tenue">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Fecha
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Categoría
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Tipo
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">
                    Importe
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Cuenta
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pages.items.map((transaction) => (
                  <tr key={transaction.id} className="border-b border-borde last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap cifra text-tinta-suave">
                      {formatDateTime(transaction.date)}
                    </td>
                    <td className="px-4 py-3 text-tinta">{transaction.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <TypeBadge type={transaction.type} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right whitespace-nowrap cifra ${
                        transaction.type === 'INCOME' ? 'text-exito' : 'text-tinta'
                      }`}
                    >
                      {transaction.type === 'EXPENSE' && '−'}
                      {formatMoney(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 text-tinta-suave">
                      {accountNames.get(transaction.accountId) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDeletion(transaction)}
                        className="rounded text-alerta underline underline-offset-4 foco"
                      >
                        Borrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {visible.length > 0 && (
        <Pagination
          page={pages.page}
          pageCount={pages.pageCount}
          first={pages.first}
          last={pages.last}
          total={pages.total}
          noun="movimientos"
          onChange={pages.setPage}
        />
      )}

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Borrar el movimiento"
        description={
          pendingDeletion === null
            ? ''
            : `Se borrará el ${pendingDeletion.type === 'INCOME' ? 'ingreso' : 'gasto'} de ${formatMoney(pendingDeletion.amount)} y el saldo de la cuenta volverá a como estaba.`
        }
        confirmLabel="Borrar"
        pending={deleteTransaction.isPending}
        onConfirm={confirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </section>
  )
}
