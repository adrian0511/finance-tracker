import { Link } from 'react-router-dom'

/**
 * El 404 lo decide el cliente: el backend responde index.html a cualquier ruta sin extension que
 * no cuelgue de /api, asi que si no lo pinta React no lo pinta nadie.
 */
export default function NotFoundPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Esta página no existe</h1>
      <Link
        to="/dashboard"
        className="font-medium text-slate-900 underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2"
      >
        Volver al resumen
      </Link>
    </main>
  )
}
