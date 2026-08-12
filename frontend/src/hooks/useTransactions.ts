import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

import { getErrorMessage } from '@/api/errors'
import * as transactionsApi from '@/api/transactions'
import { useAuthStore } from '@/store/authStore'
import { showToast } from '@/store/toastStore'

const TRANSACTIONS_KEY = ['transactions'] as const
const ACCOUNTS_KEY = ['accounts'] as const
const REPORTS_KEY = ['reports'] as const

/**
 * El id del usuario sale de la sesion porque el endpoint cuelga de el (no hay un
 * GET /api/transactions como si lo hay para cuentas). La clave no lo incluye: solo cambia con un
 * login o un logout, y el logout ya vacia la cache entera.
 */
export function useTransactions() {
  const userId = useAuthStore((state) => state.user?.id) ?? null

  return useQuery({
    queryKey: TRANSACTIONS_KEY,
    enabled: userId !== null,
    queryFn: () => {
      if (userId === null) {
        throw new Error('No hay usuario en la sesión')
      }
      return transactionsApi.listTransactions(userId)
    },
  })
}

export function useCreateTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transactionsApi.createTransaction,
    onSuccess: () => {
      showToast('Movimiento registrado', 'success')
      invalidate(queryClient)
    },
    onError: (error) => showToast(createErrorMessage(error), 'error'),
  })
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: transactionsApi.deleteTransaction,
    onSuccess: () => {
      showToast('Movimiento borrado', 'success')
      invalidate(queryClient)
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'No se ha podido borrar el movimiento.'), 'error'),
  })
}

/**
 * Todo movimiento mueve el saldo de su cuenta, en el alta y en el borrado (el backend revierte el
 * efecto antes de borrar). Si solo se invalidaran los movimientos, las tarjetas de cuentas
 * seguirian mostrando el saldo viejo hasta que a alguien se le ocurriera recargar.
 *
 * Los informes cuelgan de lo mismo: se invalida la rama entera ['reports'] sin mirar el rango,
 * porque un movimiento nuevo entra en cualquier periodo que lo contenga y desde aqui no se sabe
 * cuales hay cacheados.
 */
function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: TRANSACTIONS_KEY })
  void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
  void queryClient.invalidateQueries({ queryKey: REPORTS_KEY })
}

/** El 409 al crear solo puede ser saldo insuficiente, y el mensaje del backend viene en ingles. */
function createErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.status === 409) {
    return 'La cuenta no tiene saldo suficiente para ese gasto.'
  }
  return getErrorMessage(error, 'No se ha podido registrar el movimiento.')
}
