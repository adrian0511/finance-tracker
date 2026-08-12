import { useMutation, useQuery } from '@tanstack/react-query'

import * as aiApi from '@/api/ai'

/**
 * Las llamadas al modelo no son un fetch barato: detras hay un modelo gratuito con limite de
 * peticiones y una respuesta que tarda segundos. Por eso ninguna de las cuatro se dispara sola.
 *
 * El analisis y el informe son consultas (tienen resultado que se queda en pantalla y se puede
 * volver a pedir), pero nacen con `enabled: false` y las lanza `refetch()` desde un boton. Sin
 * eso, montar la pantalla — o volver a ella — gastaria una peticion que nadie pidio.
 *
 * Categorizar y chatear son acciones sueltas: no hay un "estado del servidor" que cachear,
 * cada envio es una respuesta distinta a un texto distinto. Eso es una mutacion.
 */

/**
 * Ojo con el estado al pintar esto. Con `enabled: false` y sin datos, TanStack deja la query en
 * `status: 'pending'` para siempre, asi que **`isPending` no significa "cargando"**: vale true
 * desde el primer render, antes de que nadie pulse nada. Lo que hay que mirar es:
 *
 * - `isFetching` → hay una llamada en vuelo (el spinner del boton).
 * - `data === undefined` → todavia no se ha generado nada (el estado vacio con el boton).
 * - `refetch()` → lo que engancha el boton "Generar analisis".
 *
 * `retry: false` a proposito, pisando el default global de dos reintentos: ese default esta
 * pensado para peticiones que fallan por red y se arreglan repitiendolas. Aqui un 5xx suele ser
 * el proveedor del modelo cayendose o la cuota agotada, y reintentar es gastar dos peticiones
 * mas de las que ya no hay, con el usuario esperando el triple.
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
 * Sin toast de exito en ninguna de las dos: el resultado *es* la respuesta, y se pinta. Un aviso
 * de "listo" encima de un texto que acaba de aparecer no informa de nada.
 *
 * Y sin toast de error, al contrario que el resto de mutaciones del repo: sugerir la categoria
 * es una ayuda opcional dentro de un formulario que funciona igual sin ella. Que falle no es un
 * suceso del que haya que enterarse a nivel de aplicacion, se dice al lado del boton y ya. Quien
 * lo llame se ocupa del `onError`.
 */
export function useCategorize() {
  return useMutation({
    mutationFn: aiApi.categorize,
  })
}

/**
 * Tampoco lleva toast, y por el mismo motivo que categorizar mas uno propio: en una conversacion
 * el fallo tiene un sitio evidente donde ponerse, que es la respuesta que no llego. Un toast se
 * va solo a los pocos segundos y deja el hilo con un mensaje del usuario y nada debajo, sin
 * pista de si se esta esperando o si aquello fallo.
 */
export function useChat() {
  return useMutation({
    mutationFn: aiApi.chat,
  })
}
