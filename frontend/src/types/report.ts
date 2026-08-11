import type { IsoDateTime, Money } from './common'

/** Espeja {@code dto/report/BalanceResponse}. Totales del rango consultado, no historicos. */
export interface BalanceResponse {
  incomes: Money
  expenses: Money
  balance: Money
}

/**
 * Espeja {@code dto/report/CashFlowResponse}. {@code balance} ya es el acumulado hasta ese
 * movimiento, calculado en SQL con una funcion de ventana: la serie se pinta tal cual, sin
 * acumular nada en el cliente.
 */
export interface CashFlowResponse {
  date: IsoDateTime
  balance: Money
}

/**
 * Espeja {@code dto/report/CategoryReportResponse}. Viene ordenado de mayor a menor gasto desde
 * la query, y {@code category} puede ser null (transacciones sin categoria).
 */
export interface CategoryReportResponse {
  category: string | null
  total: Money
}

/** Espeja {@code dto/report/MonthlyReportResponse}. {@code month} es 1-12. */
export interface MonthlyReportResponse {
  month: number
  incomes: Money
  expenses: Money
  balance: Money
}
