import { api } from './client'
import type { AuthResponse, LoginRequest, RegisterRequest } from '@/types/auth'
import type { UserResponse } from '@/types/user'

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/login', request)
  return data
}

/**
 * Devuelve el usuario creado, **no** un token: el backend responde 201 con un UserResponse. Para
 * dejar la sesion iniciada despues de registrarse hay que llamar ademas a {@link login}.
 */
export async function register(request: RegisterRequest): Promise<UserResponse> {
  const { data } = await api.post<UserResponse>('/auth/register', request)
  return data
}
