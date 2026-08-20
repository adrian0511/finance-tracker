import { useMutation, useQuery } from '@tanstack/react-query'

import * as aiApi from '@/api/ai'

/**
 * Detras hay un modelo gratuito con limite de peticiones y esperas de segundos, asi que ninguna
 * de las cuatro se dispara sola: analisis e informe son queries con `enabled: false` que lanza un
 * boton, y categorizar y chatear son mutaciones porque no hay estado de servidor que cachear.
 */

/**
 * Con `enabled: false` y sin datos, TanStack deja `status: 'pending'` para siempre: **`isPending`
 * no significa "cargando"**. Se mira `isFetching` (llamada en vuelo) y `data === undefined`
 * (todavia no se ha generado nada).
 *
 * `retry: false` pisa el default global de dos reintentos: aqui un 5xx suele ser el proveedor
 * caido o la cuota agotada, y reintentar gasta peticiones que ya no hay.
 */
export function useAnalysis() {
  return useQuery({
    queryKey: ['ai', 'analysis'],
    queryFn: aiApi.getAnalysis,
    enabled: false,
    retry: false,
  })
}

/** Mismo trato que el analisis: a peticion, sin reintentos. */
export function useReport() {
  return useQuery({
    queryKey: ['ai', 'report'],
    queryFn: aiApi.getReport,
    enabled: false,
    retry: false,
  })
}

/**
 * Sin toast, al contrario que el resto de mutaciones del repo: el resultado *es* la respuesta y
 * se pinta, y sugerir la categoria es una ayuda opcional que se avisa al lado del boton. Quien lo
 * llame se ocupa del `onError`.
 */
export function useCategorize() {
  return useMutation({
    mutationFn: aiApi.categorize,
  })
}

/**
 * Tampoco lleva toast: en una conversacion el fallo tiene un sitio evidente donde ponerse, que es
 * la respuesta que no llego. Un toast se va solo y deja el hilo sin pista de que paso.
 */
export function useChat() {
  return useMutation({
    mutationFn: aiApi.chat,
  })
}
