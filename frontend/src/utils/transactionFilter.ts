import type { TransactionType } from '@/types/common'
import type { TransactionResponse } from '@/types/transaction'
import { formatDate } from '@/utils/format'

/**
 * El filtro de la lista de movimientos, compartido por la pantalla de Movimientos y por la tabla
 * del dashboard.
 *
 * Se aplica en el cliente sobre la lista completa porque **la API no ofrece movimientos por rango
 * ni por categoria**: `GET /api/transactions/users/{id}` devuelve el historico entero. El dia que
 * el backend acepte parametros, esto se sustituye por la peticion y las pantallas no se enteran.
 *
 * Los tres campos que pueden faltar significan cosas distintas y conviene no confundirlas:
 *
 * - `type` a null es «ingresos y gastos», no «ninguno».
 * - `category` a null es «todas las categorias».
 * - `category` a **cadena vacia** es «los que no tienen categoria». Es un valor y no un hueco: la
 *   categoria es texto libre y puede venir a null desde el backend, asi que hay que poder pedir
 *   justo esos. Como valor no colisiona con ninguna categoria real — el alta exige nombre no
 *   vacio — y en la URL se distingue solo (`?category=` frente a no llevar el parametro).
 */
export interface TransactionFilter {
  from: string | null
  to: string | null
  category: string | null
  type: TransactionType | null
}

export const FILTRO_VACIO: TransactionFilter = {
  from: null,
  to: null,
  category: null,
  type: null,
}

/** La categoria efectiva de un movimiento: null y cadena vacia son lo mismo, «sin categoria». */
function categoriaDe(transaction: TransactionResponse): string {
  return transaction.category ?? ''
}

export function matches(transaction: TransactionResponse, filter: TransactionFilter): boolean {
  // La parte de fecha se compara como texto: las cadenas ISO se ordenan igual alfabeticamente
  // que cronologicamente, asi que no hace falta construir un Date por fila y por render.
  const day = transaction.date.slice(0, 10)

  if (filter.from !== null && day < filter.from) {
    return false
  }
  if (filter.to !== null && day > filter.to) {
    return false
  }
  if (filter.type !== null && transaction.type !== filter.type) {
    return false
  }
  return filter.category === null || categoriaDe(transaction) === filter.category
}

export function hasFilter(filter: TransactionFilter): boolean {
  return (
    filter.from !== null || filter.to !== null || filter.category !== null || filter.type !== null
  )
}

export const TYPE_LABELS: Record<TransactionType, string> = {
  INCOME: 'Ingresos',
  EXPENSE: 'Gastos',
}

export const SIN_CATEGORIA = 'Sin categoría'

/** Como se lee el filtro en la etiqueta que se enseña encima de la tabla. */
export function describeFilter(filter: TransactionFilter): string {
  const partes: string[] = []

  if (filter.from !== null && filter.to !== null) {
    partes.push(`${formatDate(filter.from)} – ${formatDate(filter.to)}`)
  } else if (filter.from !== null) {
    partes.push(`desde el ${formatDate(filter.from)}`)
  } else if (filter.to !== null) {
    partes.push(`hasta el ${formatDate(filter.to)}`)
  }

  if (filter.type !== null) {
    partes.push(TYPE_LABELS[filter.type])
  }

  if (filter.category !== null) {
    partes.push(filter.category === '' ? SIN_CATEGORIA : filter.category)
  }

  return partes.join(' · ')
}

/**
 * Las categorias que existen de verdad en los movimientos del usuario, en orden alfabetico. Se
 * sacan de los datos y no de una lista fija porque la categoria es texto libre: no hay catalogo
 * que consultar, y ofrecer una categoria sin movimientos solo lleva a una tabla vacia.
 *
 * El indicador de «sin categoria» va aparte y no como una cadena mas de la lista, para que quien
 * pinte el desplegable pueda decidir si esa opcion tiene sentido.
 */
export function availableCategories(transactions: readonly TransactionResponse[]): {
  named: string[]
  hasUncategorized: boolean
} {
  const named = new Set<string>()
  let hasUncategorized = false

  for (const transaction of transactions) {
    const categoria = categoriaDe(transaction)
    if (categoria === '') {
      hasUncategorized = true
    } else {
      named.add(categoria)
    }
  }

  return {
    named: [...named].sort((a, b) => a.localeCompare(b, 'es')),
    hasUncategorized,
  }
}

/**
 * Lee el filtro de la query string. Un `type` que no sea INCOME ni EXPENSE se ignora en vez de
 * dejar la tabla vacia: la URL la puede escribir cualquiera.
 */
export function readFilter(params: URLSearchParams): TransactionFilter {
  const type = params.get('type')

  return {
    from: params.get('from'),
    to: params.get('to'),
    category: params.get('category'),
    type: type === 'INCOME' || type === 'EXPENSE' ? type : null,
  }
}

/** El filtro de vuelta a query string. Lo que esta a null no aparece. */
export function filterToParams(filter: TransactionFilter): URLSearchParams {
  const params = new URLSearchParams()

  if (filter.from !== null) {
    params.set('from', filter.from)
  }
  if (filter.to !== null) {
    params.set('to', filter.to)
  }
  // Ojo: la cadena vacia SI se escribe (`?category=`), que es como viaja «sin categoria».
  if (filter.category !== null) {
    params.set('category', filter.category)
  }
  if (filter.type !== null) {
    params.set('type', filter.type)
  }

  return params
}
