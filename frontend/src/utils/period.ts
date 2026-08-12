import type { IsoDate } from '@/types/common'

export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'

/** Rango cerrado por los dos extremos, tal y como lo entiende el backend. */
export interface Period {
  preset: PeriodPreset
  from: IsoDate
  to: IsoDate
}

export const PRESET_LABELS: Record<PeriodPreset, string> = {
  today: 'Hoy',
  week: 'Esta semana',
  month: 'Este mes',
  year: 'Este año',
  custom: 'Personalizado',
}

/**
 * Los presets terminan hoy, no al final del periodo natural: el backend le pone la fecha al
 * movimiento cuando se registra, asi que no hay nada despues de hoy que ensenar y un "to" en el
 * futuro solo estiraria el eje con dias vacios.
 */
export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>, today = new Date()): Period {
  const to = toIsoDate(today)

  return { preset, from: toIsoDate(startOf(preset, today)), to }
}

function startOf(preset: Exclude<PeriodPreset, 'custom'>, today: Date): Date {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  switch (preset) {
    case 'today':
      return start
    case 'week':
      // La semana empieza en lunes (getDay() da 0 el domingo, que aqui es el septimo dia).
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
      return start
    case 'month':
      start.setDate(1)
      return start
    case 'year':
      start.setMonth(0, 1)
      return start
  }
}

/**
 * Se compone a mano en vez de con toISOString(): ese convierte a UTC, asi que en cualquier zona
 * al este de Greenwich la fecha de hoy se manda como la de ayer.
 */
export function toIsoDate(date: Date): IsoDate {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

/** El mes completo, para el enlace desde el grafico mensual a la lista de movimientos. */
export function monthPeriod(year: number, month: number): { from: IsoDate; to: IsoDate } {
  return {
    from: toIsoDate(new Date(year, month - 1, 1)),
    // Dia 0 del mes siguiente es el ultimo del mes pedido, sin tener que saber cuantos tiene.
    to: toIsoDate(new Date(year, month, 0)),
  }
}
