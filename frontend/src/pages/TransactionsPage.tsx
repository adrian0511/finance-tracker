import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
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
import { useCategorize } from '@/hooks/useAI'
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
 * El importe se valida como texto y se convierte al enviar: con `z.coerce` el tipo de entrada del
 * formulario y el de salida del esquema dejan de coincidir.
 *
 * Mas estricto que el backend a proposito: importe > 0 (un movimiento de 0 solo ensucia los
 * informes) y categoria no vacia (es la clave por la que agrupa el desglose).
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
  /** No se envia: solo existe para darle al modelo algo que clasificar. */
  description: z.string(),
})

/**
 * Tope de la categoria sugerida: al modelo se le pide una palabra de una lista cerrada, pero puede
 * desobedecer y devolver una frase, que colaria un parrafo en el desglose. Por longitud y no
 * comparando contra la lista, que esa vive en el backend y copiarla aqui seria duplicarla.
 */
const MAX_SUGGESTION_LENGTH = 40

/** Se queda con la primera linea y le quita comillas y punto final, que es lo que suele sobrar. */
function cleanSuggestion(response: string): string | null {
  const suggestion = (response.split('\n')[0] ?? '').trim().replace(/^["'`]|["'`.]$/g, '')
  return suggestion.length > 0 && suggestion.length <= MAX_SUGGESTION_LENGTH ? suggestion : null
}

export default function TransactionsPage() {
  const { data: transactions, isPending, isError, error } = useTransactions()
  const { data: accounts } = useAccounts()
  const createTransaction = useCreateTransaction()
  const deleteTransaction = useDeleteTransaction()

  // En la URL y no en estado local: el enlace desde el dashboard llega filtrado y recargar no
  // lo pierde.
  const [searchParams, setSearchParams] = useSearchParams()
  const filter = readFilter(searchParams)

  // replace y no push: con push, salir obligaria a pulsar «atras» una vez por cada filtro tocado.
  const updateFilter = (patch: Partial<TransactionFilter>) =>
    setSearchParams(filterToParams({ ...filter, ...patch }), { replace: true })

  const [pendingDeletion, setPendingDeletion] = useState<TransactionResponse | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      accountId: '',
      type: 'EXPENSE' as const,
      amount: '',
      category: '',
      description: '',
    },
  })

  const categorize = useCategorize()
  // Aparte de la mutacion: si el modelo contesta algo que no sirve, la peticion fue un exito.
  const [suggestionFailed, setSuggestionFailed] = useState(false)

  // useWatch y no watch(): aquel devuelve una funcion nueva en cada render y el React Compiler,
  // al no poder memoizarla, se salta la pagina entera.
  const description = useWatch({ control, name: 'description' })
  const canSuggest = description.trim().length > 0 && !categorize.isPending

  /**
   * Rellena el campo, no lo envia: la sugerencia es un punto de partida y se puede reescribir.
   * `shouldValidate` para que el error de campo vacio se vaya al llenarse.
   */
  const suggestCategory = () => {
    setSuggestionFailed(false)

    categorize.mutate(description.trim(), {
      onSuccess: (data) => {
        const suggestion = cleanSuggestion(data.response)
        if (suggestion === null) {
          setSuggestionFailed(true)
          return
        }
        setValue('category', suggestion, { shouldValidate: true, shouldDirty: true })
      },
      // Cualquier fallo, no solo el 503: para quien rellena el formulario todos son el mismo.
      onError: () => setSuggestionFailed(true),
    })
  }

  const accountNames = new Map((accounts ?? []).map((account) => [account.id, account.name]))
  const hasAccounts = accounts !== undefined && accounts.length > 0

  // De todos los movimientos y no de los visibles: si no, elegir una categoria dejaria el
  // desplegable con esa sola opcion.
  const { named, hasUncategorized } = availableCategories(transactions ?? [])
  const visible = (transactions ?? []).filter((transaction) => matches(transaction, filter))
  // La query string es la clave de reinicio: al cambiar el filtro hay que volver a la pagina 1.
  const pages = usePagination(visible, PAGE_SIZE, searchParams.toString())

  // Campo a campo y no esparciendo `values`: `description` no tiene por que viajar.
  const onSubmit = handleSubmit((values) => {
    createTransaction.mutate(
      {
        accountId: values.accountId,
        type: values.type,
        category: values.category,
        amount: Number(values.amount),
      },
      {
        onSuccess: () => {
          setSuggestionFailed(false)
          reset({
            accountId: values.accountId,
            type: values.type,
            amount: '',
            category: '',
            description: '',
          })
        },
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
          className="mt-6 grid gap-4 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta sm:grid-cols-2 lg:grid-cols-3"
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

          {/* No se guarda: el backend no tiene este campo. Es lo que se le da al modelo para que
              proponga la categoria, y por eso lo dice la etiqueta — un campo que se escribe y no
              se ve luego en la tabla parece un dato perdido. */}
          <TextField
            id="description"
            label="Descripción (solo para sugerir)"
            placeholder="Cena en el bar de abajo"
            autoComplete="off"
            {...register('description')}
          />

          <div className="flex flex-col gap-1.5">
            <TextField
              id="category"
              label="Categoría"
              placeholder="Comida, Vivienda…"
              error={errors.category?.message}
              {...register('category')}
            />

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={suggestCategory}
                disabled={!canSuggest}
                className="rounded text-sm font-medium text-cobalto underline underline-offset-4 foco disabled:no-underline disabled:opacity-60"
              >
                {categorize.isPending ? 'Pensando…' : 'Sugerir categoría'}
              </button>

              {/* role="status" y no un toast: es un aviso local de una ayuda opcional, y con
                  aria-live se anuncia solo al aparecer sin robarle el foco a nadie. */}
              <p role="status" className="text-sm text-tinta-tenue">
                {categorize.isPending && 'La IA tarda unos segundos.'}
                {suggestionFailed && !categorize.isPending && (
                  <span className="text-alerta">No se pudo sugerir; escríbela a mano.</span>
                )}
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={createTransaction.isPending}
            className="mt-7 h-10 self-start rounded-md bg-accion px-4 font-medium text-accion-tinta foco disabled:opacity-60 sm:col-span-2 sm:w-fit lg:col-span-1"
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
              // Llega del grafico anual del dashboard y aqui no hay control para tocarlo: se
              // dice cual es y se puede quitar.
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
