import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import StatsWidget from '../../components/dashboard/StatsWidget'
import ActivityFeed from '../../components/dashboard/ActivityFeed'
import ProjectWidget from '../../components/dashboard/ProjectWidget'
import QuickActions from '../../components/dashboard/QuickActions'
import SystemStatus from '../../components/dashboard/SystemStatus'
import TasksWidget from '../../components/dashboard/TasksWidget'
import IdeasWidget from '../../components/dashboard/IdeasWidget'
import TimelinePulse from '../../components/dashboard/TimelinePulse'
import TimelineWidget from '../../components/dashboard/TimelineWidget'
import EventsWidget from '../../components/dashboard/EventsWidget'
import SolicitudesWidget from '../../components/dashboard/SolicitudesWidget'
import Card from '../../components/ui/Card'
import { greetingByHour } from '../../lib/utils'

const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

export default function Dashboard() {
  const { profile } = useAuth()
  const greeting = greetingByHour()

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Welcome header */}
      <motion.div {...FU(0)}>
        <h1 className="text-2xl font-bold font-title text-white">
          {greeting},{' '}
          <span style={{ color: 'var(--c-primary)' }}>
            {profile?.nombre?.split(' ')[0] || 'Investigador'}
          </span>
        </h1>
        <p className="text-white/40 text-sm mt-1">
          {new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </motion.div>

      {/* Timeline pulse animation */}
      <motion.div {...FU(0.05)}>
        <Card className="!p-3">
          <TimelinePulse />
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div {...FU(0.08)}>
        <StatsWidget />
      </motion.div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left col — Activity feed + Projects (2/3) */}
        <motion.div className="lg:col-span-2 space-y-4" {...FU(0.14)}>
          <TimelineWidget />
          <ActivityFeed />
          <ProjectWidget />
          <IdeasWidget />
        </motion.div>

        {/* Right col — Tasks + Quick actions + status (1/3) */}
        <motion.div className="space-y-4" {...FU(0.2)}>
          <SolicitudesWidget />
          <TasksWidget />
          <EventsWidget />
          <QuickActions />
          <SystemStatus />
        </motion.div>
      </div>
    </div>
  )
}
