import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import GuestBanner from './GuestBanner'
import { useAuth } from '../../context/AuthContext'

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const { user } = useAuth()
  const sidebarW = collapsed ? 64 : 240

  return (
    <div className="flex h-screen overflow-hidden bg-[#060304]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(p => !p)} />

      <motion.div
        className="flex flex-col flex-1 overflow-hidden min-w-0"
        animate={{ marginLeft: sidebarW }}
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      >
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {!user && <GuestBanner />}
          <Outlet />
        </main>
      </motion.div>
    </div>
  )
}
