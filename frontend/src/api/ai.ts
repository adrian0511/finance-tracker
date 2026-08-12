import { api } from './client'
import type { AIResponse, CategorizeRequest, ChatRequest } from '@/types/ai'

/**
 * Los cuatro endpoints de /api/ai. Como las cuentas y las metas, el usuario sale del principal
 * en el backend: analysis y report no reciben ningun id.
 *
 * Detras hay un modelo gratuito con limite de peticiones, no una consulta a la base de datos.
 * Ninguna de estas funciones se llama sola al montar una pantalla — quien las dispara es el
 * usuario. La politica de cuando se piden vive en useAI.ts.
 */
export async function getAnalysis(): Promise<AIResponse> {
  const { data } = await api.get<AIResponse>('/ai/analysis')
  return data
}

export async function getReport(): Promise<AIResponse> {
  const { data } = await api.get<AIResponse>('/ai/report')
  return data
}

/**
 * El cuerpo se arma aqui y no lo pasa quien llama: la firma pide el texto suelto para que no
 * haya dos formas de escribir el mismo JSON. El `satisfies` es lo que ata la clave al DTO —
 * escribir `descripcion` en vez de `description` seria un 400 en tiempo de ejecucion, y asi
 * no compila.
 */
export async function categorize(description: string): Promise<AIResponse> {
  const { data } = await api.post<AIResponse>('/ai/categorize', {
    description,
  } satisfies CategorizeRequest)
  return data
}

export async function chat(message: string): Promise<AIResponse> {
  const { data } = await api.post<AIResponse>('/ai/chat', { message } satisfies ChatRequest)
  return data
}
