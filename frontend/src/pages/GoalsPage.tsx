import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { TextField } from '@/components/form/TextField'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  useCreateSavingsGoal,
  useDeleteSavingsGoal,
  useSavingsGoals,
} from '@/hooks/useSavingsGoals'
import type { SavingsGoalResponse } from '@/types/goal'
import { formatDate, formatMoney } from '@/utils/format'

/**
 * Espeja el SavingsGoalRequest: nombre @NotBlank y targetAmount @DecimalMin("0.01"). La fecha
 * limite es opcional de verdad — sin ella el backend no evalua el plazo y devuelve
 * onTrackForTargetDate a null, que es un estado distinto de "vas mal".
 */
const goalSchema = z.object({
  name: z.string().trim().min(1, 'Escribe un nombre').max(255, 'Máximo 255 caracteres'),
  targetAmount: z
    .string()
    .trim()
    .min(1, 'Escribe un importe')
    .refine((value) => Number(value) >= 0.01, 'El objetivo tiene que ser de al menos 0,01'),
  targetDate: z.string(),
})

export default function GoalsPage() {
  const { data: goals, isPending, isError, error } = useSavingsGoals()
  const createGoal = useCreateSavingsGoal()
  const deleteGoal = useDeleteSavingsGoal()

  const [pendingDeletion, setPendingDeletion] = useState<SavingsGoalResponse | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: { name: '', targetAmount: '', targetDate: '' },
  })

  const onSubmit = handleSubmit((values) => {
    createGoal.mutate(
      {
        name: values.name,
        targetAmount: Number(values.targetAmount),
        // Un input de fecha vacio da cadena vacia, y el backend espera el campo ausente o una
        // fecha valida: mandar "" seria un 400.
        ...(values.targetDate === '' ? {} : { targetDate: values.targetDate }),
      },
      { onSuccess: () => reset() },
    )
  })

  const confirmDeletion = () => {
    if (pendingDeletion === null) {
      return
    }
    deleteGoal.mutate(pendingDeletion.id, { onSettled: () => setPendingDeletion(null) })
  }

  return (
    <section>
      <h1 className="text-3xl font-semibold tracking-tight text-tinta">Metas de ahorro</h1>
      <p className="mt-2 text-tinta-suave">
        El avance se mide contra el saldo de todas tus cuentas, no contra una hucha aparte.
      </p>

      <form
        onSubmit={onSubmit}
        noValidate
        className="mt-6 grid gap-4 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta sm:grid-cols-2 lg:grid-cols-4"
      >
        <TextField
          id="name"
          label="Nombre"
          placeholder="Fondo de emergencia"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          id="targetAmount"
          type="number"
          step="0.01"
          min="0.01"
          inputMode="decimal"
          label="Objetivo"
          placeholder="0,00"
          error={errors.targetAmount?.message}
          {...register('targetAmount')}
        />
        <TextField
          id="targetDate"
          type="date"
          label="Fecha límite (opcional)"
          error={errors.targetDate?.message}
          {...register('targetDate')}
        />
        <button
          type="submit"
          disabled={createGoal.isPending}
          className="mt-7 h-10 rounded-md bg-accion px-4 font-medium text-accion-tinta foco disabled:opacity-60"
        >
          {createGoal.isPending ? 'Creando…' : 'Crear meta'}
        </button>
      </form>

      {isPending && <p className="mt-8 text-tinta-suave">Cargando metas…</p>}

      {isError && (
        <p role="alert" className="mt-8 rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
          {getErrorMessage(error, 'No se han podido cargar las metas.')}
        </p>
      )}

      {goals !== undefined &&
        (goals.length === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-borde-fuerte px-4 py-8 text-center text-sm text-tinta-tenue">
            Todavía no tienes ninguna meta.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map((goal) => (
              <li
                key={goal.id}
                className="flex flex-col gap-3 rounded-lg border border-borde bg-superficie p-4 shadow-tarjeta"
              >
                <h2 className="font-medium text-tinta">{goal.name}</h2>
                <p className="cifra text-2xl text-tinta">{formatMoney(goal.targetAmount)}</p>
                <p className="text-sm text-tinta-suave">
                  {goal.targetDate === null ? (
                    'Sin fecha límite'
                  ) : (
                    <>
                      Antes del{' '}
                      <time dateTime={goal.targetDate}>{formatDate(goal.targetDate)}</time>
                    </>
                  )}
                </p>

                <div className="mt-auto flex items-center justify-between pt-2">
                  <Link
                    to={`/goals/${goal.id}`}
                    className="rounded text-sm font-medium text-tinta underline underline-offset-4 foco"
                  >
                    Ver proyección
                  </Link>
                  <button
                    type="button"
                    onClick={() => setPendingDeletion(goal)}
                    className="rounded text-sm text-alerta underline underline-offset-4 foco"
                  >
                    Borrar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ))}

      <ConfirmDialog
        open={pendingDeletion !== null}
        title="Borrar la meta"
        description={`Se borrará «${pendingDeletion?.name ?? ''}». No afecta a tus cuentas ni a tus movimientos: solo desaparece el objetivo.`}
        confirmLabel="Borrar"
        pending={deleteGoal.isPending}
        onConfirm={confirmDeletion}
        onCancel={() => setPendingDeletion(null)}
      />
    </section>
  )
}
