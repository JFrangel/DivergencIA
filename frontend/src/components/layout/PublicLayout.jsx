import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function PublicLayout() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
      <Navbar />
      <Outlet />
    </div>
  )
}
