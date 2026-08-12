import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
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
import { formatDate, formatDateTime, formatMoney } from '@/utils/format'

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
  // filtrado, el enlace se puede compartir y el boton de atras del navegador lo deshace.
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = readFilter(searchParams)

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
      <h1 className="text-2xl font-semibold text-slate-900">Movimientos</h1>
      <p className="mt-2 text-slate-600">
        La fecha la pone el servidor al registrar el movimiento; no se puede dar de alta con fecha
        pasada.
      </p>

      {hasFilter(filter) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="text-slate-600">Filtrado por:</span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-700">
            {describeFilter(filter)}
          </span>
          <button
            type="button"
            onClick={() => setSearchParams({}, { replace: true })}
            className="rounded font-medium text-slate-900 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
          >
            Quitar el filtro
          </button>
        </div>
      )}

      {!hasAccounts ? (
        <p className="mt-6 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
          Necesitas una cuenta antes de registrar movimientos.{' '}
          <Link to="/accounts" className="font-medium text-slate-900 underline underline-offset-4">
            Crear una cuenta
          </Link>
        </p>
      ) : (
        <form
          onSubmit={onSubmit}
          noValidate
          className="mt-6 grid gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5"
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
            className="mt-7 h-10 rounded-md bg-slate-900 px-4 font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {createTransaction.isPending ? 'Guardando…' : 'Registrar'}
          </button>
        </form>
      )}

      {isPending && <p className="mt-8 text-slate-600">Cargando movimientos…</p>}

      {isError && (
        <p role="alert" className="mt-8 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(error, 'No se han podido cargar los movimientos.')}
        </p>
      )}

      {transactions !== undefined &&
        (visible.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            {hasFilter(filter)
              ? 'No hay movimientos que encajen con el filtro.'
              : 'Todavía no hay movimientos.'}
          </p>
        ) : (
          // La tabla scrollea dentro de su caja: en movil no puede empujar la pagina a lo ancho.
          <div className="mt-8 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
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
                  <tr key={transaction.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-600">
                      {formatDateTime(transaction.date)}
                    </td>
                    <td className="px-4 py-3 text-slate-900">{transaction.category ?? '—'}</td>
                    <td className="px-4 py-3">
                      <TypeBadge type={transaction.type} />
                    </td>
                    <td
                      className={`px-4 py-3 text-right whitespace-nowrap tabular-nums ${
                        transaction.type === 'INCOME' ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {transaction.type === 'EXPENSE' && '−'}
                      {formatMoney(transaction.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {accountNames.get(transaction.accountId) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setPendingDeletion(transaction)}
                        className="rounded text-red-700 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
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

/**
 * Filtro que llega por la query string desde el dashboard: un rango de fechas (el mes que se
 * pincho en el grafico anual) y opcionalmente una categoria.
 *
 * Se aplica en el cliente sobre la lista que ya esta cargada porque la API no ofrece
 * movimientos por rango; el dia que exista ese endpoint, esto se sustituye por parametros de la
 * peticion sin tocar la URL, que es la que manda.
 */
interface TransactionFilter {
  from: string | null
  to: string | null
  category: string | null
}

function readFilter(params: URLSearchParams): TransactionFilter {
  return {
    from: params.get('from'),
    to: params.get('to'),
    category: params.get('category'),
  }
}

function hasFilter(filter: TransactionFilter): boolean {
  return filter.from !== null || filter.to !== null || filter.category !== null
}

function matches(transaction: TransactionResponse, filter: TransactionFilter): boolean {
  // La parte de fecha se compara como texto: las cadenas ISO se ordenan igual alfabeticamente
  // que cronologicamente.
  const day = transaction.date.slice(0, 10)

  if (filter.from !== null && day < filter.from) {
    return false
  }
  if (filter.to !== null && day > filter.to) {
    return false
  }
  return filter.category === null || transaction.category === filter.category
}

function describeFilter(filter: TransactionFilter): string {
  const parts: string[] = []

  if (filter.from !== null && filter.to !== null) {
    parts.push(`${formatDate(filter.from)} – ${formatDate(filter.to)}`)
  } else if (filter.from !== null) {
    parts.push(`desde el ${formatDate(filter.from)}`)
  } else if (filter.to !== null) {
    parts.push(`hasta el ${formatDate(filter.to)}`)
  }

  if (filter.category !== null) {
    parts.push(filter.category)
  }

  return parts.join(' · ')
}
