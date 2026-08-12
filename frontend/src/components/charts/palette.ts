import { useResolvedTheme } from '@/hooks/useTheme'
import type { ResolvedTheme } from '@/utils/theme'

/**
 * Colores y cromo comunes de los graficos.
 *
 * Hay dos paletas porque hay dos temas, y una sola no sirve para los dos: el verde #008300 que
 * contrasta 4.95:1 sobre la tarjeta blanca se queda en 1.6:1 sobre el acero oscuro, o sea
 * invisible. Los tonos oscuros conservan el tono de los claros y suben de claridad, para que una
 * categoria siga siendo «la naranja» al cambiar de tema.
 *
 * Ninguno esta elegido a ojo. Las dos listas se pasan por `pnpm palette`
 * (`scripts/validate-palette.mjs`), que comprueba, para cada tema:
 *   - contraste WCAG de cada color contra su fondo;
 *   - separacion perceptual (dE OKLab >= 8) de los pares que se tocan en el donut, en visión
 *     normal, protanopia y deuteranopia;
 *   - ingreso contra gasto (dE >= 12), que es el par que mas se confunde;
 *   - los tres escenarios de la proyeccion entre si.
 *
 * De ahi salen dos reglas que hay que respetar al tocar esto:
 *
 * 1. **El orden de `categorias` es el mecanismo de seguridad, no decoracion.** Lo que se valida
 *    son los pares adyacentes, que en el donut son las porciones vecinas — y como el donut es un
 *    circulo, el ultimo tambien es vecino del primero. Reordenar o meter un septimo tono invalida
 *    la comprobacion.
 * 2. **Tres tonos de la escala clara no llegan a 3:1 contra el blanco**, asi que ningun grafico
 *    puede apoyarse solo en el color: leyenda con el importe escrito, o tabla al lado.
 */
export interface ChartPalette {
  /** Escala categorica del donut. Maximo seis, en este orden. */
  categorias: readonly string[]
  /** La cola larga agrupada. Gris a proposito: no es una categoria mas. */
  otras: string
  ingreso: string
  gasto: string
  /** Serie unica (flujo de caja). */
  serie: string
  /** La meta de ahorro: el laton, el acento de firma de la app. */
  meta: string
  escenarios: { optimistic: string; realistic: string; pessimistic: string }
  rejilla: string
  /** Linea del cero y otras referencias neutras. */
  referencia: string
  /** El fondo de la tarjeta, para los huecos entre porciones y el borde de los puntos. */
  superficie: string
  /** El fondo de la pagina, para el carril del Brush. */
  lienzo: string
  tick: { fill: string; fontSize: number; fontFamily: string }
  tooltip: {
    contentStyle: Record<string, string>
    labelStyle: Record<string, string | number>
    itemStyle: Record<string, string>
  }
}

const CIFRA = 'var(--font-cifra)'

function tooltip(fondo: string, borde: string, tinta: string, suave: string) {
  return {
    // Recharts pinta el tooltip con estilos en linea y fondo blanco fijo: en oscuro hay que
    // decirle los tres colores o sale una tarjeta blanca en medio de la pagina.
    contentStyle: {
      backgroundColor: fondo,
      borderRadius: '0.5rem',
      border: `1px solid ${borde}`,
      boxShadow: '0 1px 2px rgb(0 0 0 / 0.08)',
      fontSize: '0.875rem',
      fontFamily: CIFRA,
    },
    labelStyle: { color: tinta, fontWeight: 500 },
    itemStyle: { color: suave },
  }
}

const CLARO: ChartPalette = {
  categorias: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300'],
  otras: '#64748b',
  ingreso: '#16a34a',
  gasto: '#9f1239',
  serie: '#2a78d6',
  meta: '#8a5d0c',
  escenarios: { optimistic: '#0f766e', realistic: '#1e293b', pessimistic: '#b45309' },
  rejilla: '#d7dfea',
  referencia: '#6f8199',
  superficie: '#ffffff',
  lienzo: '#eef1f6',
  tick: { fill: '#586a7c', fontSize: 12, fontFamily: CIFRA },
  tooltip: tooltip('#ffffff', '#d7dfea', '#0d1520', '#4a5c6f'),
}

const OSCURO: ChartPalette = {
  categorias: ['#5fa8f5', '#ff8b57', '#2fc796', '#e8b33c', '#f191bb', '#57c05f'],
  otras: '#7b8b9d',
  ingreso: '#6ee7a5',
  gasto: '#e05572',
  serie: '#5fa8f5',
  meta: '#d9a441',
  escenarios: { optimistic: '#4ec9b8', realistic: '#dbe5f0', pessimistic: '#e6a83c' },
  rejilla: '#28394d',
  referencia: '#566a80',
  superficie: '#131d29',
  lienzo: '#0b121b',
  tick: { fill: '#8496a8', fontSize: 12, fontFamily: CIFRA },
  tooltip: tooltip('#131d29', '#28394d', '#e7edf4', '#a2b3c5'),
}

export const CHART_PALETTES: Record<ResolvedTheme, ChartPalette> = {
  light: CLARO,
  dark: OSCURO,
}

/**
 * La paleta del tema que se esta viendo. Los graficos no pueden usar las variables CSS: los
 * colores de Recharts son valores de JavaScript que acaban en atributos `fill` y `stroke` del
 * SVG, asi que hay que darselos ya resueltos y volver a renderizar cuando cambie el tema.
 */
export function useChartPalette(): ChartPalette {
  return CHART_PALETTES[useResolvedTheme()]
}
