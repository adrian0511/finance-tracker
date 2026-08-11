import { useMutation, useQueryClient } from '@tanstack/react-query'

import * as authApi from '@/api/auth'
import { useAuthStore } from '@/store/authStore'
import type { RegisterRequest } from '@/types/auth'

export function useLogin() {
  const startSession = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: ({ token }) => startSession(token),
  })
}

/**
 * Registro y login en una sola operacion de cara a la UI. Son dos llamadas porque
 * /api/auth/register responde con el usuario creado y no con un token: sin el segundo paso el
 * usuario se quedaria registrado pero sin sesion, teniendo que escribir otra vez lo mismo.
 */
export function useRegister() {
  const startSession = useAuthStore((state) => state.login)

  return useMutation({
    mutationFn: async (request: RegisterRequest) => {
      await authApi.register(request)
      return authApi.login({ username: request.username, password: request.password })
    },
    onSuccess: ({ token }) => startSession(token),
  })
}

export function useLogout() {
  const endSession = useAuthStore((state) => state.logout)
  const queryClient = useQueryClient()

  return () => {
    endSession()
    // Sin esto, los datos del usuario que sale se quedan en la cache y el siguiente que entre
    // en el mismo navegador los ve pintados mientras se refrescan las queries.
    queryClient.clear()
  }
}
