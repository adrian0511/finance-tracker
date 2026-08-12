import { useSyncExternalStore } from 'react'

import {
  setTheme,
  subscribeToTheme,
  themeSnapshot,
  type ResolvedTheme,
  type Theme,
} from '@/utils/theme'

interface ThemeControls {
  /** Lo que ha elegido el usuario, con «sistema» incluido. Es lo que marca el selector. */
  theme: Theme
  /** Lo que se esta viendo de verdad. Es lo que necesitan los graficos para elegir paleta. */
  resolved: ResolvedTheme
  setTheme: (theme: Theme) => void
}

/**
 * El tema no es estado de React: lo guarda el DOM (la clase de <html>) porque hay que aplicarlo
 * antes del primer render. Esto solo se suscribe a los cambios para repintar lo que dependa de
 * el — en la practica, el selector y la paleta de los graficos.
 */
export function useTheme(): ThemeControls {
  const snapshot = useSyncExternalStore(subscribeToTheme, themeSnapshot, () => 'system:light')
  const [theme, resolved] = snapshot.split(':') as [Theme, ResolvedTheme]

  return { theme, resolved, setTheme }
}

/**
 * Solo el tema efectivo. Es lo que consumen los graficos: los colores de Recharts son valores de
 * JavaScript, no clases, asi que no se enteran de que ha cambiado una variable CSS.
 */
export function useResolvedTheme(): ResolvedTheme {
  return useTheme().resolved
}
