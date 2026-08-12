/**
 * Tema claro/oscuro.
 *
 * Vive aqui y no en un store de Zustand a proposito: en `store/` solo estan la sesion y los
 * avisos, y esto no es ninguna de las dos cosas. Es una preferencia del navegador que ademas
 * tiene que aplicarse antes de que React monte nada (si no, la primera pintura sale en claro y
 * pega un fogonazo blanco al entrar en oscuro), asi que el que manda es el DOM y React se
 * suscribe con `useSyncExternalStore`.
 *
 * Tres estados, no dos: «sistema» no es un alias de claro, es «lo que diga el SO ahora mismo»,
 * y tiene que seguir cambiando si el usuario cambia su preferencia con la pagina abierta.
 */
export type Theme = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const STORAGE_KEY = 'financetracker.theme'

const QUERY = '(prefers-color-scheme: dark)'

const listeners = new Set<() => void>()

function isTheme(value: unknown): value is Theme {
  return value === 'system' || value === 'light' || value === 'dark'
}

/**
 * La preferencia guardada. Nunca lanza: en un navegador con el almacenamiento bloqueado
 * (modo privado estricto, cookies de terceros capadas) `localStorage` tira excepcion al leer, y
 * quedarse sin tema es peor que quedarse sin recordarlo.
 */
export function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isTheme(stored) ? stored : 'system'
  } catch {
    return 'system'
  }
}

export function systemTheme(): ResolvedTheme {
  return window.matchMedia(QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? systemTheme() : theme
}

/**
 * Aplica el tema al documento. La clase la leen los tokens de `index.css`, y `color-scheme` es
 * lo que hace que el calendario de un <input type="date">, el desplegable de un <select> y las
 * barras de scroll salgan tambien oscuros: eso lo pinta el navegador, no nuestro CSS.
 */
export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme)
  const root = document.documentElement

  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved
}

export function setTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // Sin almacenamiento el tema vale para esta pestaña y ya; no es motivo para no aplicarlo.
  }
  applyTheme(theme)
  listeners.forEach((listener) => listener())
}

/**
 * La instantanea que compara React. Lleva los dos datos, elegido y efectivo, porque con el tema
 * en «sistema» lo elegido no cambia nunca: si la instantanea fuera solo `readTheme()`, pasar el
 * SO a modo noche no repintaria los graficos, que son los unicos que leen el color en JS.
 */
export function themeSnapshot(): string {
  const theme = readTheme()

  return `${theme}:${resolveTheme(theme)}`
}

/** Suscripcion para `useSyncExternalStore`. */
export function subscribeToTheme(listener: () => void): () => void {
  listeners.add(listener)

  // La preferencia del sistema puede cambiar con la pagina abierta (el modo noche automatico de
  // Windows y macOS lo hace solo), y con el tema en «sistema» eso tiene que repintar.
  const media = window.matchMedia(QUERY)
  const onSystemChange = () => {
    applyTheme(readTheme())
    listener()
  }
  media.addEventListener('change', onSystemChange)

  // Y puede cambiar en otra pestaña de la misma app: el evento `storage` solo llega a las demas.
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(readTheme())
      listener()
    }
  }
  window.addEventListener('storage', onStorage)

  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}
