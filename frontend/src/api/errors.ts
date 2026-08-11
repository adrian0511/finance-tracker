import { AxiosError } from 'axios'

import type { ErrorResponse } from '@/types/error'

const NETWORK_ERROR = 'No se ha podido conectar con el servidor.'
const UNEXPECTED_ERROR = 'Ha ocurrido un error inesperado.'

/**
 * Saca el texto que se le ensena al usuario. Todos los errores de la API vienen con la forma
 * {@link ErrorResponse} (la arma el GlobalExceptionHandler), asi que basta con leer `message`;
 * el resto de ramas son para cuando la peticion ni siquiera llego a responder.
 */
export function getErrorMessage(error: unknown, fallback: string = UNEXPECTED_ERROR): string {
  if (!(error instanceof AxiosError)) {
    return fallback
  }

  if (!error.response) {
    return NETWORK_ERROR
  }

  const data = error.response.data as Partial<ErrorResponse> | undefined
  return typeof data?.message === 'string' && data.message.length > 0 ? data.message : fallback
}
