import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'

import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/components/routing/ProtectedRoute'

/**
 * Cada pantalla es su propio trozo. Antes todo iba en un unico archivo de mas de 1 MB, asi que
 * entrar al login descargaba tambien Recharts (los cuatro graficos del dashboard y la proyeccion)
 * y el parser de Markdown de la IA, que en esa pantalla no se usan para nada.
 *
 * Se cargan las nueve por igual, incluido el login: la mayoria de las visitas son de alguien que
 * ya tiene sesion y va al resumen, asi que dejar el login en el trozo comun seria pagar en la
 * pantalla frecuente por la que no lo es.
 *
 * `lazy` necesita que el modulo exporte por defecto, que es justo como estan escritas las
 * paginas — de ahi que baste con esto y no haya que tocar ninguna.
 */
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const RegisterPage = lazy(() => import('@/pages/RegisterPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const AccountsPage = lazy(() => import('@/pages/AccountsPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const GoalsPage = lazy(() => import('@/pages/GoalsPage'))
const GoalDetailPage = lazy(() => import('@/pages/GoalDetailPage'))
const ChatPage = lazy(() => import('@/pages/ChatPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export default function App() {
  return (
    // Suspense de fuera: cubre el login y el registro, que se pintan sin la cabecera.
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* Publicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Privadas: ProtectedRoute decide si se entra, AppLayout pone la cabecera comun */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/goals/:id" element={<GoalDetailPage />} />
            <Route path="/chat" element={<ChatPage />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}

/**
 * Deliberadamente sobrio y sin animacion: en local el trozo llega en milisegundos y cualquier
 * cosa mas vistosa seria un parpadeo. Ocupa alto para que el pie de la pagina no salte hacia
 * arriba mientras carga.
 */
function PageFallback() {
  return (
    <p role="status" className="px-4 py-16 text-center text-sm text-tinta-tenue">
      Cargando…
    </p>
  )
}
