import { keepPreviousData, useQuery } from '@tanstack/react-query'

import * as reportsApi from '@/api/reports'
import type { ReportRange } from '@/api/reports'

/**
 * El rango entra en la clave de cada informe, asi que cambiar de periodo es una consulta nueva:
 * TanStack la lanza sola, sin que nadie tenga que acordarse de invalidar nada.
 *
 * Y con keepPreviousData el dashboard no parpadea al cambiar de periodo: mientras llega la
 * respuesta nueva se sigue viendo la anterior (atenuada por quien la pinta), en vez de vaciarse
 * y volver a montar los graficos, que ademas daria un salto de altura.
 */
const SHARED = {
  placeholderData: keepPreviousData,
} as const

function rangeKey(range: ReportRange) {
  return [range.from ?? null, range.to ?? null] as const
}

/**
 * `enabled` es para el rango invertido, que el backend rechaza con un 400. Mientras esta mal no
 * se pide nada y, gracias a keepPreviousData, la pagina sigue ensenando el ultimo periodo valido
 * en vez de cuatro errores rojos mientras se escribe una fecha a mano.
 */
export function useBalanceReport(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'balance', ...rangeKey(range)],
    queryFn: () => reportsApi.getBalance(range),
    enabled,
    ...SHARED,
  })
}

export function useCashFlowReport(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'cashFlow', ...rangeKey(range)],
    queryFn: () => reportsApi.getCashFlow(range),
    enabled,
    ...SHARED,
  })
}

export function useCategoryReport(range: ReportRange, enabled = true) {
  return useQuery({
    queryKey: ['reports', 'category', ...rangeKey(range)],
    queryFn: () => reportsApi.getCategoryReport(range),
    enabled,
    ...SHARED,
  })
}

/** El informe mensual no depende del periodo del dashboard: tiene su propio selector de año. */
export function useMonthlyReport(year: number) {
  return useQuery({
    queryKey: ['reports', 'monthly', year],
    queryFn: () => reportsApi.getMonthlyReport(year),
    ...SHARED,
  })
}
