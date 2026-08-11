import { NavLink, Outlet } from 'react-router-dom'

import { useLogout } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Resumen' },
  { to: '/accounts', label: 'Cuentas' },
  { to: '/transactions', label: 'Movimientos' },
  { to: '/goals', label: 'Metas' },
] as const

/** Cabecera comun de la zona privada. Provisional en lo visual, no en la estructura. */
export function AppLayout() {
  const user = useAuthStore((state) => state.user)
  const logout = useLogout()

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-x-4 gap-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `rounded px-1 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    isActive
                      ? 'font-semibold text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <span className="text-sm text-slate-500">{user?.username}</span>
          <button
            type="button"
            onClick={logout}
            className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-900 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
          >
            Salir
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
