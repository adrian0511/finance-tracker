import { Suspense } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Resumen' },
  { to: '/accounts', label: 'Cuentas' },
  { to: '/transactions', label: 'Movimientos' },
  { to: '/goals', label: 'Metas' },
  { to: '/chat', label: 'Asistente' },
] as const

/** Cabecera comun de la zona privada. */
export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()

  return (
    <div className="min-h-dvh bg-lienzo">
      {/* La cabecera se queda arriba: el dashboard es largo y el selector de periodo manda sobre
          todo lo que se ve, asi que la navegacion no puede quedarse a tres pantallas de scroll. */}
      <header className="sticky top-0 z-40 border-b border-borde bg-superficie">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <span className="font-display text-lg font-semibold tracking-tight text-tinta">
            FinanceTracker
          </span>

          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  // La ruta activa no se marca solo con negrita: lleva ademas una linea de
                  // cobalto debajo, porque el peso de la fuente solo se nota comparando.
                  `foco rounded px-1 py-1 text-sm ${
                    isActive
                      ? 'border-b-2 border-cobalto font-semibold text-tinta'
                      : 'border-b-2 border-transparent text-tinta-suave hover:text-tinta'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <ThemeToggle />

          <span className="text-sm text-tinta-tenue">{user?.username}</span>
          <button
            type="button"
            onClick={logout}
            className="foco rounded-md border border-borde-fuerte px-3 py-1 text-sm font-medium text-tinta"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Suspense propio, dentro del layout: las paginas se cargan por separado, y con el unico
            de App el fallback sustituiria tambien esta cabecera. Cambiar de pestaña haria
            desaparecer la navegacion justo mientras se navega. */}
        <Suspense
          fallback={
            <p role="status" className="py-16 text-center text-sm text-tinta-tenue">
              Cargando…
            </p>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  )
}
