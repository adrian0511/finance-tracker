import type { IsoDateTime, Money } from '@/types/common'

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
