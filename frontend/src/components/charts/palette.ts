/**
 * Colores y cromo comunes de los graficos.
 *
 * No son colores elegidos a ojo: la lista categorica se paso por el validador de contraste y de
 * daltonismo contra el blanco de las tarjetas (peor par adyacente ΔE 9.1 con protanopia, 19.6 con
 * vision normal). Por eso el orden importa y no se puede reordenar ni ampliar a capricho: las
 * porciones vecinas del donut son justamente los pares que el validador comprueba.
 *
 * Tres de estos tonos quedan por debajo de 3:1 contra el blanco, asi que ningun grafico puede
 * apoyarse solo en el color: todos llevan leyenda con el valor escrito o una tabla al lado.
 */
export const CATEGORY_COLORS = [
  '#2a78d6',
  '#eb6834',
  '#1baf7a',
  '#eda100',
  '#e87ba4',
  '#008300',
] as const

/**
 * El resto agrupado. Gris a proposito: no es una categoria mas, es lo que queda fuera del top,
 * y un tono neutro lo dice sin gastar un color de la escala.
 */
export const OTHER_COLOR = '#64748b'

/**
 * Ingreso y gasto. Verde y rojo son la convencion en cualquier app de dinero, pero el par obvio
 * (emerald-700 / rose-700) los deja a ΔE 6.0 con deuteranopia, o sea indistinguibles para quien
 * no separa el rojo del verde. Estos dos pasan a 16.3 porque ademas se separan en claridad, que
 * es el canal que si sobrevive al daltonismo. Aun asi nunca van solos: leyenda y etiqueta.
 */
export const INCOME_COLOR = '#16a34a'
export const EXPENSE_COLOR = '#9f1239'

/** Serie unica (flujo de caja): el primer color de la escala. */
export const SERIES_COLOR = '#2a78d6'

/** Rejilla y ejes: linea fina y continua, un tono por encima del fondo. Nunca punteada. */
export const GRID_COLOR = '#e2e8f0'
export const AXIS_TICK = { fill: '#64748b', fontSize: 12 } as const

/** Estilo comun del tooltip de Recharts, que por defecto trae bordes y sombras de otra epoca. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    boxShadow: '0 1px 2px rgb(0 0 0 / 0.05)',
    fontSize: '0.875rem',
  },
  labelStyle: { color: '#0f172a', fontWeight: 500 },
} as const
