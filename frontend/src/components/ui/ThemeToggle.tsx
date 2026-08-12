import type { ReactNode } from 'react'

import { useTheme } from '@/hooks/useTheme'
import type { Theme } from '@/utils/theme'

const OPCIONES: { value: Theme; label: string; icon: ReactNode }[] = [
  {
    value: 'system',
    label: 'Sistema',
    icon: (
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>
    ),
  },
  {
    value: 'light',
    label: 'Claro',
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    value: 'dark',
    label: 'Oscuro',
    icon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />,
  },
]

/**
 * Selector de tema. Tres opciones y no un interruptor de dos: «sistema» no es lo mismo que
 * «claro», es seguir al SO, y quien tiene el modo noche automatico lo quiere seguir teniendo.
 *
 * Los tres botones estan siempre a la vista en vez de un boton que cicla entre estados: con un
 * ciclo no hay forma de saber en cual de los tres estas sin pulsarlo, y volver a «sistema»
 * obliga a dar la vuelta entera.
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div
      role="group"
      aria-label="Tema"
      className="flex gap-0.5 rounded-md bg-superficie-alta p-0.5"
    >
      {OPCIONES.map((opcion) => {
        const activa = theme === opcion.value

        return (
          <button
            key={opcion.value}
            type="button"
            aria-pressed={activa}
            title={opcion.label}
            onClick={() => setTheme(opcion.value)}
            className={`foco rounded p-1.5 ${
              activa
                ? 'bg-superficie text-tinta shadow-tarjeta'
                : 'text-tinta-tenue hover:text-tinta'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {opcion.icon}
            </svg>
            {/* El icono no dice el nombre de la opcion, y `title` no lo lee un lector de
                pantalla de forma fiable: el texto va escrito y oculto a la vista. */}
            <span className="sr-only">{opcion.label}</span>
          </button>
        )
      })}
    </div>
  )
}
