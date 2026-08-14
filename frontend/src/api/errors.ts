import { AxiosError } from 'axios'

import type { ErrorResponse } from '@/types/error'

const NETWORK_ERROR = 'No se ha podido conectar con el servidor.'
const UNEXPECTED_ERROR = 'Ha ocurrido un error inesperado.'

/**
 * El proveedor del modelo caido (503, que es tambien lo que devuelve el backend cuando la
 * peticion ni sale) o la cuota agotada (429, que con un modelo gratuito pasa mas).
 */
const SERVICE_UNAVAILABLE = 503
const TOO_MANY_REQUESTS = 429

/**
 * Respaldo para cuando la IA falla por algo temporal y no hay mensaje del backend que ensenar.
 *
 * Se prefiere el del backend porque en el 429 dice **cuantos segundos** faltan, que es un dato que
 * aqui no se puede saber.
 */
export const AI_RETRY_LATER =
  'El asistente no está disponible en este momento. Inténtalo en unos minutos.'

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

/**
 * Si el fallo de la IA es de los que se arreglan volviendo a pulsar: el proveedor caido, la cuota
 * agotada o la peticion que no llego a salir. Lo demas (un 401, un 500 de verdad) no mejora por
 * reintentarlo y merece el mensaje de error normal.
 */
export function isTemporaryAiError(error: unknown): boolean {
  if (!(error instanceof AxiosError)) {
    return false
  }

  if (error.response === undefined) {
    return true
  }

  return (
    error.response.status === SERVICE_UNAVAILABLE || error.response.status === TOO_MANY_REQUESTS
  )
}
