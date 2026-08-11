import type { IsoDate, IsoDateTime, IsoYearMonth, Money, Uuid } from './common'

/** Espeja {@code dto/goal/SavingsGoalResponse}. {@code targetDate} es opcional en la meta. */
export interface SavingsGoalResponse {
  id: Uuid
  name: string
  targetAmount: Money
  targetDate: IsoDate | null
  createdAt: IsoDateTime
  userId: Uuid
}

/**
 * Un punto de la serie mensual de la proyeccion. Espeja {@code dto/goal/ProjectionPoint} (aqui
 * se llama MonthlyProjectionPoint para que se lea que es un punto por mes).
 */
export interface MonthlyProjectionPoint {
  month: IsoYearMonth
  optimisticBalance: Money
  realisticBalance: Money
  pessimisticBalance: Money
}

/**
 * Espeja {@code dto/goal/SavingsProjectionResponse}.
 *
 * Los tres nullables no son un descuido del backend, son estados del dominio y hay que
 * pintarlos como tales:
 * - las ETA vienen a null cuando a ese ritmo la meta no se alcanza (ahorro <= 0 o fuera del
 *   horizonte de proyeccion), que no es lo mismo que "aun no se ha calculado";
 * - {@code onTrackForTargetDate} es null cuando la meta no tiene targetDate: no hay fecha
 *   contra la que ir bien o mal;
 * - {@code additionalMonthlySavingsNeeded} es null si va a tiempo o si no hay targetDate.
 */
export interface SavingsProjectionResponse {
  goalId: Uuid
  goalName: string
  targetAmount: Money
  targetDate: IsoDate | null

  /** Suma de los balances de todas las cuentas del usuario. */
  currentBalance: Money

  /** Lo que falta para la meta. Cero si ya se alcanzo. */
  remainingAmount: Money

  /** Ahorro neto medio de los ultimos meses cerrados (ingresos menos gastos). */
  averageMonthlyNet: Money

  /** Cuanto oscila ese neto de un mes a otro. Lo que separa los tres escenarios. */
  monthlyNetStdDeviation: Money

  optimisticEta: IsoYearMonth | null
  realisticEta: IsoYearMonth | null
  pessimisticEta: IsoYearMonth | null

  onTrackForTargetDate: boolean | null
  additionalMonthlySavingsNeeded: Money | null

  monthlyBreakdown: MonthlyProjectionPoint[]
}
