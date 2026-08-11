import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { TextField } from '@/components/form/TextField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import type { AccountResponse } from '@/types/account'
import { formatMoney } from '@/utils/format'

/**
 * El backend solo valida @NotBlank. El maximo de 255 no es un capricho: la columna es un
 * varchar(255), y pasarse ahi no da un error de validacion sino un 500.
 */
const accountSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(255, 'Máximo 255 caracteres'),
})

export default function AccountsPage() {
  const { data: accounts, isPending, isError, error } = useAccounts()
  const createAccount = useCreateAccount()
  const deleteAccount = useDeleteAccount()

  // Se guarda la cuenta entera y no solo el id: el dialogo necesita el nombre para que el
  // usuario lea que esta borrando, y al confirmar la fila ya puede no estar en la lista.
  const [pendingDeletion, setPendingDeletion] = useState<AccountResponse | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: '' },
  })

  const onSubmit = handleSubmit((values) => {
    createAccount.mutate(values.name, { onSuccess: () => reset() })
  })

  const confirmDeletion = () => {
    if (pendingDeletion === null) {
      return
    }
    deleteAccount.mutate(pendingDeletion.id, {
      onSettled: () => setPendingDeletion(null),
    })
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold text-slate-900">Cuentas</h1>
      <p className="mt-2 text-slate-600">
        Toda cuenta nueva empieza con saldo cero; el saldo lo mueven los movimientos.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 flex flex-wrap items-start gap-3 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div className="min-w-56 flex-1">
          <TextField
            id="name"
            label="Nueva cuenta"
            placeholder="Corriente, Ahorro…"
            error={errors.name?.message}
            {...register('name')}
          />
        </div>
        <button
          type="submit"
          disabled={createAccount.isPending}
          className="mt-7 rounded-md bg-slate-900 px-4 py-2 font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60"
        >
          {createAccount.isPending ? 'Creando…' : 'Crear'}
        </button>
      </form>

      {isPending && <p className="mt-8 text-slate-600">Cargando cuentas…</p>}

      {isError && (
        <p role="alert" className="mt-8 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {getErrorMessage(error, 'No se han podido cargar las cuentas.')}
        </p>
      )}

      {accounts !== undefined &&
        (accounts.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500">
            Todavía no tienes ninguna cuenta.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4"
              >
                <h2 className="font-medium text-slate-900">{account.name}</h2>
                {/* tabular-nums para que las cifras no bailen de una tarjeta a otra */}
                <p className="text-2xl tabular-nums text-slate-900">
                  {formatMoney(account.balance)}
                </p>
                <button
                  type="button"
                  onClick={() => setPendingDeletion(account)}
                  className="self-start rounded text-sm text-red-700 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                >
                  Borrar
                </button>
              </li>
            ))}
          </ul>
        ))}

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Borrar la cuenta"
        description={`Se borrará «${pendingDeletion?.name ?? ''}». No se puede deshacer, y no funcionará si la cuenta tiene movimientos.`}
        confirmLabel="Borrar"
        pending={deleteAccount.isPending}
        onConfirm={confirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </section>
  )
}
