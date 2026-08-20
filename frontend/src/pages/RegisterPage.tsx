import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { getErrorMessage } from '@/api/errors'
import { TextField } from '@/components/form/TextField'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useRegister } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/authStore'

/**
 * Espeja el UserRequest del backend (@NotBlank en username, password, name y lastName; @Email
 * en email) y aprieta en dos sitios a proposito:
 * - el email es obligatorio, porque el @Email de Jakarta acepta null;
 * - la contrasena pide 8 caracteres, que el backend no exige.
 * Apretar de este lado es seguro (nada que pase aqui lo rechaza el servidor); aflojar no lo
 * seria. La confirmacion es solo de la UI y no se manda.
 */
const registerSchema = z
  .object({
    name: z.string().trim().min(1, 'Escribe tu nombre'),
    lastName: z.string().trim().min(1, 'Escribe tus apellidos'),
    username: z.string().trim().min(3, 'El usuario necesita al menos 3 caracteres'),
    email: z.email('Escribe un correo válido'),
    password: z.string().min(8, 'La contraseña necesita al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })

export default function RegisterPage() {
  const navigate = useNavigate()
  const token = useAuthStore((state) => state.token)
  const signUp = useRegister()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      lastName: '',
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = handleSubmit((values) => {
    signUp.mutate(
      {
        name: values.name,
        lastName: values.lastName,
        username: values.username,
        email: values.email,
        password: values.password,
      },
      { onSuccess: () => navigate('/dashboard', { replace: true }) },
    )
  })

  if (token !== null) {
    return <Navigate to="/" replace />
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center bg-lienzo px-4 py-12">
      {/* Estas dos pantallas van fuera de AppLayout, que es quien lleva la cabecera con el
          selector. Se repite aqui para poder elegir tema sin haber entrado. */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-semibold tracking-tight text-tinta">Crear cuenta</h1>
        <p className="mt-1 text-sm text-tinta-suave">
          Empieza a llevar el control de tus finanzas.
        </p>

        <form onSubmit={onSubmit} noValidate className="mt-8 flex flex-col gap-4">
          <TextField
            id="name"
            label="Nombre"
            autoComplete="given-name"
            autoFocus
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            id="lastName"
            label="Apellidos"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <TextField
            id="username"
            label="Usuario"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            id="email"
            type="email"
            label="Correo"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <TextField
            id="password"
            type="password"
            label="Contraseña"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <TextField
            id="confirmPassword"
            type="password"
            label="Repite la contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          {signUp.isError && (
            <p role="alert" className="rounded-md bg-alerta-tenue px-3 py-2 text-sm text-alerta">
              {getErrorMessage(signUp.error, 'No se ha podido crear la cuenta.')}
            </p>
          )}

          <button
            type="submit"
            disabled={signUp.isPending}
            className="mt-2 rounded-md bg-accion px-4 py-2 font-medium text-accion-tinta foco disabled:opacity-60"
          >
            {signUp.isPending ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-6 text-sm text-tinta-suave">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-medium text-tinta underline underline-offset-4">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </main>
  )
}
