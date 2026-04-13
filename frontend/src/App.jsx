import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { MotionConfig } from 'framer-motion'
import { AuthProvider } from './context/AuthContext'
import { ZenProvider } from './context/ZenContext'
import { NotifProvider } from './context/NotifContext'
import { ThemeProvider } from './context/ThemeContext'
import { CallProvider } from './context/CallContext'
import { router } from './router'

// reduce_motion defaults ON — user must explicitly set 'false' to disable
const reduceMotion = localStorage.getItem('reduce_motion') !== 'false'

export default function App() {
  return (
    <MotionConfig reducedMotion={reduceMotion ? 'always' : 'never'}>
    <AuthProvider>
      <ThemeProvider>
      <NotifProvider>
      <ZenProvider>
      <CallProvider>
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'rgba(12, 6, 6, 0.95)',
              border: '1px solid rgba(252, 101, 31, 0.3)',
              color: '#e8e8e8',
              backdropFilter: 'blur(16px)',
              fontFamily: "'Inter', sans-serif",
              fontSize: '14px',
            },
          }}
        />
      </CallProvider>
      </ZenProvider>
      </NotifProvider>
      </ThemeProvider>
    </AuthProvider>
    </MotionConfig>
  )
}
