import { Link } from 'react-router-dom'

/**
 * El 404 lo decide el cliente: el backend responde index.html a cualquier ruta sin extension que
 * no cuelgue de /api, asi que si no lo pinta React no lo pinta nadie.
 */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-lienzo px-4 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-tinta">Esta página no existe</h1>
      <Link to="/dashboard" className="font-medium text-tinta underline underline-offset-4 foco">
        Volver al resumen
      </Link>
    </main>
  )
}
