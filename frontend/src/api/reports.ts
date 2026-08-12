import { api } from './client'
import type { IsoDate } from '@/types/common'
import type {
  BalanceResponse,
  CashFlowResponse,
  CategoryReportResponse,
  MonthlyReportResponse,
} from '@/types/report'

/**
 * Rango del informe. Los dos limites son inclusivos y opcionales: si faltan, el backend aplica
 * los ultimos 6 meses hasta hoy. El dashboard siempre los manda, pero se dejan opcionales para
 * no obligar a inventar un rango a quien solo quiera el defecto.
 */
export interface ReportRange {
  from?: IsoDate
  to?: IsoDate
}

/** Todos los informes salen del usuario autenticado: el id lo saca el backend del principal. */
export async function getBalance(range: ReportRange): Promise<BalanceResponse> {
  const { data } = await api.get<BalanceResponse>('/reports/balance', { params: range })
  return data
}

/**
 * Balance corriente del periodo. Ojo: cada punto es el acumulado <em>dentro del rango</em>,
 * empezando en cero, no el saldo de las cuentas — mide cuanto ha subido o bajado el dinero
 * durante el periodo, no cuanto hay.
 */
export async function getCashFlow(range: ReportRange): Promise<CashFlowResponse[]> {
  const { data } = await api.get<CashFlowResponse[]>('/reports/cashFlow', { params: range })
  return data
}

/** Solo gastos, ya ordenados de mayor a menor por la query. */
export async function getCategoryReport(range: ReportRange): Promise<CategoryReportResponse[]> {
  const { data } = await api.get<CategoryReportResponse[]>('/reports/category', { params: range })
  return data
}

/** Un punto por mes con movimientos: los meses vacios no vienen en la respuesta. */
export async function getMonthlyReport(year: number): Promise<MonthlyReportResponse[]> {
  const { data } = await api.get<MonthlyReportResponse[]>('/reports/monthly', { params: { year } })
  return data
}
