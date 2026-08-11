import axios, { type AxiosError } from 'axios'

import { useAuthStore } from '@/store/authStore'
import { showToast } from '@/store/toastStore'

/** Endpoints publicos: un 401 aqui es "credenciales malas", no "sesion caducada". */
const AUTH_PATH = '/auth/'

const SESSION_EXPIRED = 'Tu sesión ha caducado. Vuelve a iniciar sesión.'

/**
 * Cliente unico para toda la API.
 *
 * baseURL relativa a proposito: en dev el proxy de Vite manda /api al backend del 8080, y en
 * prod Spring sirve el front desde el mismo origen. Una URL absoluta o una variable de entorno
 * de host romperia uno de los dos casos.
 */
export const api = axios.create({
  baseURL: '/api',
})

// El token se lee del store en cada peticion, no se captura al crear el cliente: si se leyera
// una sola vez, tras un login el cliente seguiria mandando el token viejo (o ninguno).
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (isExpiredSession(error)) {
      showToast(SESSION_EXPIRED, 'error')
      // Solo se limpia la sesion; la redireccion es de ProtectedRoute, que ya esta escuchando
      // el store. Aqui no se puede navegar con el router (esto vive fuera del arbol de React) y
      // un window.location recargaria la pagina entera, llevandose por delante el aviso que
      // se acaba de lanzar.
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

/**
 * 401 es "no hay sesion" (sin token o caducado) y se responde deslogueando. No vale mirar el
 * 403: ese lo devuelve @PreAuthorize cuando el recurso es de otro usuario, y ahi la sesion es
 * perfectamente valida — desloguear seria borrarle el token a quien solo se equivoco de id.
 */
function isExpiredSession(error: AxiosError): boolean {
  if (error.response?.status !== 401) {
    return false
  }
  return !error.config?.url?.includes(AUTH_PATH)
}
