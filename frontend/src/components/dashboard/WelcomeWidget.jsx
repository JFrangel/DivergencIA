import { motion } from 'framer-motion'
import { FiSun, FiMoon, FiSunrise, FiSunset } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return { text: 'Buenas noches', icon: FiMoon, color: '#8B5CF6' }
  if (h < 12) return { text: 'Buenos días', icon: FiSunrise, color: '#FC651F' }
  if (h < 18) return { text: 'Buenas tardes', icon: FiSun, color: '#F59E0B' }
  return { text: 'Buenas noches', icon: FiSunset, color: '#8B5CF6' }
}

export default function WelcomeWidget() {
  const { profile } = useAuth()
  const greeting = getGreeting()
  const firstName = profile?.nombre?.split(' ')[0] || 'Investigador'
  const date = new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4"
    >
      <div>
        <h1 className="text-2xl font-bold font-title text-white">
          {greeting.text},{' '}
          <span style={{ color: greeting.color }}>{firstName}.</span>
        </h1>
        <p className="text-sm text-white/30 mt-1 capitalize">{date}</p>
      </div>
    </motion.div>
  )
}
