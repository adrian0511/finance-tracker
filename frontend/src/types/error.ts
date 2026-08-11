import type { IsoDateTime } from './common'

/**
 * Espeja {@code dto/error/ErrorResponse}. Es el cuerpo de **todos** los errores de la API: lo
 * arma el GlobalExceptionHandler, asi que el interceptor de errores puede contar con esta forma
 * en vez de adivinar donde viene el mensaje en cada endpoint.
 */
export interface ErrorResponse {
  message: string
  timestamp: IsoDateTime
  status: number
  path: string
}
