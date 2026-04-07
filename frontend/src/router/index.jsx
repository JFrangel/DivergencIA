import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import ProtectedRoute from './ProtectedRoute'
import AdminRoute from './AdminRoute'
import PublicLayout from '../components/layout/PublicLayout'
import AppLayout from '../components/layout/AppLayout'
import Spinner from '../components/ui/Spinner'

// Lazy imports — páginas públicas
const Landing      = lazy(() => import('../pages/public/Landing'))
const Login        = lazy(() => import('../pages/public/Login'))
const Register     = lazy(() => import('../pages/public/Register'))
const JoinRequest  = lazy(() => import('../pages/public/JoinRequest'))
const AuthCallback = lazy(() => import('../pages/public/AuthCallback'))

// Lazy imports — app privada
const Dashboard     = lazy(() => import('../pages/app/Dashboard'))
const Projects      = lazy(() => import('../pages/app/Projects'))
const ProjectDetail = lazy(() => import('../pages/app/ProjectDetail'))
const Ideas         = lazy(() => import('../pages/app/Ideas'))
const Library       = lazy(() => import('../pages/app/Library'))
const Members       = lazy(() => import('../pages/app/Members'))
const MemberProfile = lazy(() => import('../pages/app/MemberProfile'))
const MyProfile     = lazy(() => import('../pages/app/MyProfile'))
const Universo      = lazy(() => import('../pages/app/Universo'))
const Athenia       = lazy(() => import('../pages/app/Athenia'))
const Roadmap       = lazy(() => import('../pages/app/Roadmap'))
const ZenMode       = lazy(() => import('../pages/app/ZenMode'))
const Settings      = lazy(() => import('../pages/app/Settings'))
const Calendar      = lazy(() => import('../pages/app/Calendar'))
const Learning      = lazy(() => import('../pages/app/Learning'))
const Diagrams      = lazy(() => import('../pages/app/Diagrams'))
const Arcade        = lazy(() => import('../pages/app/Arcade'))
const Mural         = lazy(() => import('../pages/app/Mural'))
const Workspace     = lazy(() => import('../pages/app/Workspace'))
const NotificationCenter = lazy(() => import('../components/notifications/NotificationCenter'))
const Chat               = lazy(() => import('../pages/app/Chat'))
const Nodos              = lazy(() => import('../pages/app/Nodos'))

// Lazy imports — admin
const AdminPanel = lazy(() => import('../pages/admin/AdminPanel'))

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--c-bg)' }}>
    <Spinner size="lg" />
  </div>
)

const withSuspense = (Component) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
)

export const router = createBrowserRouter([
  // ─── Rutas Públicas ──────────────────────────────────────────────────────
  {
    element: <PublicLayout />,
    children: [
      { path: '/',         element: withSuspense(Landing) },
      { path: '/login',    element: withSuspense(Login) },
      { path: '/register', element: withSuspense(Register) },
      { path: '/join',          element: withSuspense(JoinRequest) },
      { path: '/auth/callback', element: withSuspense(AuthCallback) },
    ],
  },

  // ─── Rutas Semi-públicas (AppLayout sin auth) ────────────────────────────
  // Visitantes pueden ver en modo lectura; acciones se gestionan en cada página
  {
    element: <AppLayout />,
    children: [
      { path: '/members',     element: withSuspense(Members) },
      { path: '/members/:id', element: withSuspense(MemberProfile) },
      { path: '/nodos',       element: withSuspense(Nodos) },
      { path: '/universo',    element: withSuspense(Universo) },
      { path: '/ideas',       element: withSuspense(Ideas) },
      { path: '/ideas/:id',   element: withSuspense(Ideas) },
      { path: '/projects',    element: withSuspense(Projects) },
      { path: '/roadmap',     element: withSuspense(Roadmap) },
      { path: '/calendar',    element: withSuspense(Calendar) },
      { path: '/learning',    element: withSuspense(Learning) },
      { path: '/diagrams',    element: withSuspense(Diagrams) },
      { path: '/library',     element: withSuspense(Library) },
      { path: '/mural',       element: withSuspense(Mural) },
    ],
  },

  // ─── Rutas Privadas (requieren auth) ─────────────────────────────────────
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/dashboard',    element: withSuspense(Dashboard) },
      { path: '/projects/:id', element: withSuspense(ProjectDetail) },
      { path: '/profile',      element: withSuspense(MyProfile) },
      { path: '/athenia',      element: withSuspense(Athenia) },
      { path: '/settings',     element: withSuspense(Settings) },
      { path: '/arcade',       element: withSuspense(Arcade) },
      { path: '/workspace',      element: withSuspense(Workspace) },
      { path: '/notificaciones', element: withSuspense(NotificationCenter) },
      { path: '/chat',           element: withSuspense(Chat) },
    ],
  },

  // ─── Zen Mode (fullscreen, sin layout) ──────────────────────────────────
  {
    path: '/zen',
    element: (
      <ProtectedRoute>
        <Suspense fallback={<PageLoader />}>
          <ZenMode />
        </Suspense>
      </ProtectedRoute>
    ),
  },

  // ─── Admin ───────────────────────────────────────────────────────────────
  {
    path: '/admin',
    element: (
      <AdminRoute>
        <ProtectedRoute>
          <AppLayout />
        </ProtectedRoute>
      </AdminRoute>
    ),
    children: [
      { index: true, element: withSuspense(AdminPanel) },
    ],
  },
])
