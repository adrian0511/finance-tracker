import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { AuthUser } from '@/types/auth'
import type { Role } from '@/types/user'

const ROLES: readonly string[] = ['USER', 'ADMIN']

/**
 * Lo unico que vive en Zustand: la sesion. El estado de servidor es cosa de TanStack Query.
 *
 * Se persiste en localStorage porque el backend es stateless (no hay cookie de sesion): si el
 * token solo estuviera en memoria, cada F5 desloguearia al usuario.
 *
 * {@link login} recibe el token ya obtenido, no las credenciales: la llamada HTTP es del hook
 * de TanStack Query (`useLogin`), y asi el store no depende del cliente de la API ni tiene
 * estados de carga que ya sabe manejar Query.
 */
interface AuthState {
  token: string | null
  user: AuthUser | null
  login: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token) => set({ token, user: readUser(token) }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: 'finance-tracker-auth',
      // Un token caducado en localStorage arrancaria la app "con sesion": el guard dejaria
      // pasar, la primera llamada daria 401 y el interceptor rebotaria al login. Se descarta
      // aqui para que ese viaje no llegue a empezar.
      onRehydrateStorage: () => (state) => {
        if (state?.user && isExpired(state.user)) {
          state.logout()
        }
      },
    },
  ),
)

/** Atajo para leer el token fuera de React (interceptores de Axios, guards, etc.). */
export const getToken = () => useAuthStore.getState().token

export function isExpired(user: AuthUser): boolean {
  return user.expiresAt !== null && user.expiresAt * 1000 <= Date.now()
}

/**
 * Saca el usuario de los claims del JWT. Devuelve null si el token no tiene la forma esperada,
 * y entonces la sesion se queda sin usuario en vez de con uno a medias.
 */
function readUser(token: string): AuthUser | null {
  const claims = decodePayload(token)
  if (!claims) {
    return null
  }

  const { sub, userId, role, exp } = claims
  if (typeof sub !== 'string' || typeof userId !== 'string' || !isRole(role)) {
    return null
  }

  return { id: userId, username: sub, role, expiresAt: typeof exp === 'number' ? exp : null }
}

function decodePayload(token: string): Record<string, unknown> | null {
  const payload = token.split('.')[1]
  if (!payload) {
    return null
  }

  try {
    // El payload va en base64url: '-' y '_' en vez de '+' y '/'. Y atob devuelve bytes sueltos,
    // asi que hay que reinterpretarlos como UTF-8 o un username con tilde sale roto.
    const bytes = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const utf8 = new TextDecoder().decode(Uint8Array.from(bytes, (char) => char.charCodeAt(0)))

    const claims: unknown = JSON.parse(utf8)
    return typeof claims === 'object' && claims !== null
      ? (claims as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

function isRole(value: unknown): value is Role {
  return typeof value === 'string' && ROLES.includes(value)
}
