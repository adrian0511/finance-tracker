import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { SelectField } from '@/components/form/SelectField'
import { TextField } from '@/components/form/TextField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TypeBadge } from '@/components/ui/TypeBadge'
import { useAccounts } from '@/hooks/useAccounts'
import {
  useCreateTransaction,
  useDeleteTransaction,
  useTransactions,
} from '@/hooks/useTransactions'
import type { TransactionResponse } from '@/types/transaction'
import { formatDateTime, formatMoney } from '@/utils/format'

/**
 * El importe se valida como texto y se convierte al enviar: un input numerico da siempre string, y
 * con z.coerce el tipo de entrada del formulario y el de salida del esquema dejan de coincidir.
 *
 * Se pide mayor que 0 aunque el backend acepte @Min(0): un movimiento de 0 no significa nada y
 * solo ensucia los informes. Y categoria no vacia, aunque el backend solo exija @NotNull, porque
 * es la clave por la que se agrupa el desglose por categorias.
 */
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
        (transactions.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Todavía no hay movimientos.
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
                {transactions.map((transaction) => (
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
