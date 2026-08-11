/**
 * Como llegan por JSON los tipos de Java que no existen en TypeScript. Son alias de string y
 * number: no dan seguridad de tipos por si solos, pero dejan escrito el formato exacto del
 * cable, que es justo lo que se olvida al parsear o formatear.
 */

/** UUID del backend: "3f1a...". Nunca se opera con el, solo se compara y se pasa en la URL. */
export type Uuid = string

/** LocalDate ISO-8601: "2026-08-11". */
export type IsoDate = string

/** LocalDateTime ISO-8601 sin zona ni sufijo Z: "2026-08-11T10:00:00". */
export type IsoDateTime = string

/** YearMonth con @JsonFormat(pattern = "yyyy-MM"): "2026-08". No es una fecha parseable tal cual. */
export type IsoYearMonth = string

/**
 * BigDecimal del backend. Jackson lo serializa como numero JSON, asi que aqui es number y se
 * pierde precision: sirve para mostrar y graficar, no para calcular totales nuevos. Si falta
 * un agregado, se pide al backend, que es quien tiene el BigDecimal de verdad.
 */
export type Money = number

/** Espeja el enum {@code util.Type} del backend. */
export type TransactionType = 'INCOME' | 'EXPENSE'
