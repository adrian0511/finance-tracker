import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getErrorMessage } from '@/api/errors'
import * as goalsApi from '@/api/goals'
import { showToast } from '@/store/toastStore'
import type { Uuid } from '@/types/common'

const GOALS_KEY = ['goals'] as const

export function useSavingsGoals() {
  return useQuery({
    queryKey: GOALS_KEY,
    queryFn: goalsApi.listGoals,
  })
}

/**
 * La proyeccion se recalcula entera en el servidor a partir del saldo de las cuentas y del
 * historico de movimientos, asi que no se cachea junto a la meta: es un recurso aparte que
 * cambia cada vez que se registra un movimiento.
 */
export function useSavingsGoalProjection(goalId: Uuid | undefined) {
  return useQuery({
    queryKey: ['goals', goalId, 'projection'],
    enabled: goalId !== undefined,
    queryFn: () => {
      if (goalId === undefined) {
        throw new Error('Falta el id de la meta')
      }
      return goalsApi.getProjection(goalId)
    },
  })
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: goalsApi.createGoal,
    onSuccess: () => {
      showToast('Meta creada', 'success')
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY })
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'No se ha podido crear la meta.'), 'error'),
  })
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: goalsApi.deleteGoal,
    onSuccess: () => {
      showToast('Meta borrada', 'success')
      void queryClient.invalidateQueries({ queryKey: GOALS_KEY })
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'No se ha podido borrar la meta.'), 'error'),
  })
}
