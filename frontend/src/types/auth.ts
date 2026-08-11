import type { Uuid } from './common'
import type { Role } from './user'

/** Espeja {@code dto/auth/LoginRequest}. */
export interface LoginRequest {
  username: string
  password: string
}

/**
 * Cuerpo de POST /api/auth/register. Ojo: el controller recibe un {@code dto/user/UserRequest},
 * no el {@code RegisterRequest} que hay en dto/auth (ese esta sin usar en el backend). Los
 * campos son los mismos, pero si algun dia divergen, el que manda es UserRequest.
 */
export interface RegisterRequest {
  username: string
  password: string
  email: string
  name: string
  lastName: string
}

/** Espeja {@code dto/auth/AuthResponse}. El token es lo unico que devuelve el login. */
export interface AuthResponse {
  token: string
}

/**
 * El usuario tal y como lo conoce el cliente.
 *
 * No viene de ningun endpoint: el login solo devuelve el token y no hay un /api/users/me, asi
 * que estos datos salen de los claims del propio JWT ({@code sub}, {@code userId},
 * {@code role}), que es quien los lleva. Sirven para pintar la UI y decidir rutas; **no** son
 * una decision de seguridad — el payload de un JWT se lee sin verificar la firma y quien manda
 * es siempre el backend.
 */
export interface AuthUser {
  id: Uuid
  username: string
  role: Role
  /** Expiracion del token en segundos desde epoch (claim {@code exp}), null si no venia. */
  expiresAt: number | null
}
