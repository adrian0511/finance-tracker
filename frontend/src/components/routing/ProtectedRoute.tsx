import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'

/**
 * Guard de las rutas privadas. Es tambien el que reacciona cuando el interceptor limpia la
 * sesion al recibir un 401: el token pasa a null, esto se vuelve a renderizar y navega al login
 * sin recargar, asi que el aviso de "sesion caducada" sigue en pantalla al llegar.
 *
 * Guarda de donde venia el usuario para devolverlo ahi despues de entrar. Ojo: solo protege lo
 * que se ve, no los datos — quien mande la peticion a mano igual, se topa con el 401 del
 * backend, que es la unica barrera real.
 */
export function ProtectedRoute() {
  const token = useAuthStore((state) => state.token)
  const location = useLocation()

  if (token === null) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <Outlet />
}
