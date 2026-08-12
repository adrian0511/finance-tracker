import type { MonthlyProjectionPoint, SavingsProjectionResponse } from '@/types/goal'

export type Scenario = 'optimistic' | 'realistic' | 'pessimistic'

interface ScenarioMeta {
  key: Scenario
  label: string
  /** Patron de trazo distinto en cada uno: el color no puede ser lo unico que los separe. */
  dash?: string
  balanceField: keyof Pick<
    MonthlyProjectionPoint,
    'optimisticBalance' | 'realisticBalance' | 'pessimisticBalance'
  >
  etaField: keyof Pick<
    SavingsProjectionResponse,
    'optimisticEta' | 'realisticEta' | 'pessimisticEta'
  >
}

/**
 * Los tres escenarios salen de un unico ritmo mensual y su desviacion: optimista es
 * media + desviacion, realista es la media y pesimista media - desviacion. Por eso con un ahorro
 * constante (desviacion 0) las tres lineas se solapan: no es un fallo del grafico.
 *
 * El color no esta aqui: depende del tema y lo pone `useChartPalette().escenarios`.
 */
export const SCENARIOS: readonly ScenarioMeta[] = [
  {
    key: 'optimistic',
    label: 'Optimista',
    dash: '7 4',
    balanceField: 'optimisticBalance',
    etaField: 'optimisticEta',
  },
  {
    key: 'realistic',
    label: 'Realista',
    balanceField: 'realisticBalance',
    etaField: 'realisticEta',
  },
  {
    key: 'pessimistic',
    label: 'Pesimista',
    dash: '2 4',
    balanceField: 'pessimisticBalance',
    etaField: 'pessimisticEta',
  },
]

/**
 * Ritmo mensual de un escenario, sacado del primer punto de la serie en vez de recalculando
 * media +- desviacion: asi el numero que se lee es exactamente el que el servidor uso para
 * dibujar la linea, redondeos incluidos. Se redondea a dos decimales porque restar dos flotantes
 * de dos decimales puede dejar cola.
 */
export function monthlyRate(
  projection: SavingsProjectionResponse,
  scenario: ScenarioMeta,
): number | null {
  const firstMonth = projection.monthlyBreakdown[0]
  if (firstMonth === undefined) {
    return null
  }

  return Math.round((firstMonth[scenario.balanceField] - projection.currentBalance) * 100) / 100
}
