import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthContext'
import { ZenProvider } from './context/ZenContext'
import { NotifProvider } from './context/NotifContext'
import { ThemeProvider } from './context/ThemeContext'
import { router } from './router'

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <NotifProvider>
      <ZenProvider>
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
      </ZenProvider>
      </NotifProvider>
      </ThemeProvider>
    </AuthProvider>
  )
}
