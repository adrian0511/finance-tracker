import type { IsoDate, IsoDateTime, IsoYearMonth, Money } from '@/types/common'

/**
 * El backend no guarda divisa en ningun sitio: los importes son BigDecimal a secas. El euro es
 * una decision de presentacion tomada aqui, no un dato que venga del servidor. Si algun dia la
 * cuenta lleva su moneda, este es el unico sitio que hay que tocar.
 */
const MONEY = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
})

export function formatMoney(amount: Money): string {
  return MONEY.format(amount)
}

const DATE_TIME = new Intl.DateTimeFormat('es-ES', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * Los LocalDateTime del backend llegan sin zona ni sufijo Z ("2026-08-11T10:00:00"). El
 * navegador los interpreta como hora local, que es justo lo que se quiere: el servidor los
 * escribio con su reloj local. Si algun dia el backend pasa a UTC, hay que cambiarlo aqui.
 */
export function formatDateTime(value: IsoDateTime): string {
  return DATE_TIME.format(new Date(value))
}

const DATE = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' })
const MONTH = new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' })

export function formatDate(value: IsoDate): string {
  return DATE.format(parseDateParts(value))
}

/** Un YearMonth ("2026-07") como "jul 2026". */
export function formatYearMonth(value: IsoYearMonth): string {
  return MONTH.format(parseDateParts(value))
}

/** El mes anterior a uno dado, en el mismo formato "yyyy-MM". */
export function previousYearMonth(value: IsoYearMonth): IsoYearMonth {
  const date = parseDateParts(value)
  date.setMonth(date.getMonth() - 1)

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Se parte la cadena a mano en vez de pasarsela a Date: las formas de solo fecha ("2026-07-01",
 * "2026-07") las interpreta el estandar como UTC, asi que en cualquier zona al oeste de Greenwich
 * el Date resultante cae en el dia (y a veces en el mes) anterior.
 */
function parseDateParts(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)

  return new Date(year, (month ?? 1) - 1, day ?? 1)
}

const COMPACT_MONEY = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  notation: 'compact',
  maximumFractionDigits: 1,
})

/** Para los ejes de los graficos, donde el importe completo no cabe. */
export function formatMoneyCompact(amount: Money): string {
  return COMPACT_MONEY.format(amount)
}
