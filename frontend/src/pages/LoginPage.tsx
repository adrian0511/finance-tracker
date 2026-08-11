import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { TextField } from '@/components/form/TextField'
import { useLogin } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

/**
 * Aqui solo se valida que los campos no esten vacios. Nada de longitud minima: quien ya tiene
 * cuenta tiene la contrasena que tenga, y una regla de politica nueva le dejaria fuera de su
 * propia cuenta sin que el backend tenga nada que objetar. Las reglas duras van en el registro.
 */
const loginSchema = z.object({
  username: z.string().trim().min(1, 'Escribe tu usuario'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

const DEFAULT_ROUTE = '/dashboard'

/**
 * El destino sale del state del historial, que es escribible desde el propio origen. Se exige
 * que sea una ruta interna: sin el filtro, un '//evil.com' o un 'https://…' convertiria el
 * login en un redirector abierto.
 */
function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//')) {
    return DEFAULT_ROUTE
  }
  return target
}

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = useAuthStore((state) => state.token)
  const login = useLogin()

  // ProtectedRoute deja aqui la ruta de la que reboto al usuario, para devolverlo donde estaba
  // en vez de al resumen.
  const from = safeRedirect((location.state as { from?: unknown } | null)?.from)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => navigate(from, { replace: true }),
    })
  })

  if (token !== null) {
    return <Navigate to={from} replace />
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
        <p className="mt-1 text-sm text-slate-600">Accede a tus cuentas y movimientos.</p>

        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <TextField
            id="username"
            label="Usuario"
            autoComplete="username"
            autoFocus
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            id="password"
            type="password"
            label="Contraseña"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          {login.isError && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {getErrorMessage(login.error, 'No se ha podido iniciar sesión.')}
            </p>
          )}

          <button
            type="submit"
            disabled={login.isPending}
            className="mt-2 rounded-md bg-slate-900 px-4 py-2 font-medium text-white outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {login.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          ¿No tienes cuenta?{' '}
          <Link to="/register" className="font-medium text-slate-900 underline underline-offset-4">
            Crear una
          </Link>
        </p>
      </div>
    </main>
  )
}
