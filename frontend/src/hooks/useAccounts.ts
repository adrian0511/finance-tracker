import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AxiosError } from 'axios'

import * as accountsApi from '@/api/accounts'
import { getErrorMessage } from '@/api/errors'
import { showToast } from '@/store/toastStore'

const ACCOUNTS_KEY = ['accounts'] as const

export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: accountsApi.listAccounts,
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsApi.createAccount,
    onSuccess: () => {
      showToast('Cuenta creada', 'success')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
    onError: (error) =>
      showToast(getErrorMessage(error, 'No se ha podido crear la cuenta.'), 'error'),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: accountsApi.deleteAccount,
    onSuccess: () => {
      showToast('Cuenta eliminada', 'success')
      void queryClient.invalidateQueries({ queryKey: ACCOUNTS_KEY })
    },
    onError: (error) => showToast(deleteErrorMessage(error), 'error'),
  })
}

/**
 * El 409 de borrado tiene un unico motivo posible (la cuenta tiene movimientos) y el mensaje del
 * backend viene en ingles y con el UUID dentro, que no le dice nada a nadie. Para el resto se
 * usa el mensaje del servidor, que si es informativo.
 */
function deleteErrorMessage(error: unknown): string {
  if (error instanceof AxiosError && error.response?.status === 409) {
    return 'No puedes borrar una cuenta que tiene movimientos.'
  }
  return getErrorMessage(error, 'No se ha podido borrar la cuenta.')
}
