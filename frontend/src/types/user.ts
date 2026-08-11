import type { Uuid } from './common'

/** Espeja el enum {@code util.Role} del backend. */
export type Role = 'USER' | 'ADMIN'

/** Espeja {@code dto/user/UserResponse}. Es lo que devuelve POST /api/auth/register. */
export interface UserResponse {
  id: Uuid
  username: string
  email: string
  role: Role
  name: string
  lastName: string
}
