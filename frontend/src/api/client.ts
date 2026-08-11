import axios from 'axios'

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
