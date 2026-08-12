import { useState } from 'react'

interface Pagination<T> {
  /** Pagina actual, ya recortada al numero real de paginas. */
  page: number
  pageCount: number
  /** Las filas que toca pintar. */
  items: T[]
  total: number
  /** Indices 1-based de la primera y la ultima fila visibles, para el resumen. */
  first: number
  last: number
  setPage: (page: number) => void
}

/**
 * Paginacion en el cliente. Es lo que hay: la API devuelve el historico entero de una vez y no
 * acepta ni pagina ni rango, asi que esto no ahorra red — ahorra tabla. El dia que exista un
 * endpoint paginado, este hook se cambia por los parametros de la peticion y las pantallas que lo
 * usan no se enteran.
 *
 * `resetKey` es lo que hace que cambiar de filtro vuelva a la pagina 1: sin eso, filtrar estando
 * en la pagina 5 deja una tabla vacia que parece "no hay resultados" cuando si los hay.
 */
export function usePagination<T>(items: T[], pageSize: number, resetKey: unknown = null) {
  const [page, setPage] = useState(1)
  const [lastKey, setLastKey] = useState(resetKey)

  // Ajustar el estado durante el render (en vez de en un efecto) evita el parpadeo de pintar una
  // vez con la pagina vieja y volver a pintar corregido.
  if (lastKey !== resetKey) {
    setLastKey(resetKey)
    setPage(1)
  }

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  // Se recorta al leer ademas de al filtrar: borrar la ultima fila de la ultima pagina tambien
  // deja el numero de pagina fuera de rango, y ahi no hay cambio de resetKey que valga.
  const current = Math.min(page, pageCount)
  const start = (current - 1) * pageSize

  return {
    page: current,
    pageCount,
    items: items.slice(start, start + pageSize),
    total: items.length,
    first: items.length === 0 ? 0 : start + 1,
    last: Math.min(start + pageSize, items.length),
    setPage,
  } satisfies Pagination<T>
}
