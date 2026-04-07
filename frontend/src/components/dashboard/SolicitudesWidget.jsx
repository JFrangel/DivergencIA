import { useEffect, useState } from 'react'
import { useNodos } from '../../hooks/useNodos'
import Card from '../ui/Card'
import { FiCheckCircle, FiXCircle, FiClock } from 'react-icons/fi'
import { motion } from 'framer-motion'

export default function SolicitudesWidget() {
  const { getMyPendingSolicitudes, getPendingSolicitudes, nodos } = useNodos()
  const [mySolicitudes, setMySolicitudes] = useState([])
  const [receivedSolicitudes, setReceivedSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadSolicitudes = async () => {
      setLoading(true)
      const [myReqs, receivedReqs] = await Promise.all([
        getMyPendingSolicitudes(),
        getPendingSolicitudes(),
      ])
      setMySolicitudes(myReqs || [])
      setReceivedSolicitudes(receivedReqs || [])
      setLoading(false)
    }
    loadSolicitudes()
  }, [getMyPendingSolicitudes, getPendingSolicitudes])

  const allEmpty = mySolicitudes.length === 0 && receivedSolicitudes.length === 0
  if (allEmpty && !loading) return null

  const myPendingCount = mySolicitudes.filter(s => s.estado === 'pendiente').length
  const myApprovedCount = mySolicitudes.filter(s => s.estado === 'aprobada').length
  const myRejectedCount = mySolicitudes.filter(s => s.estado === 'rechazada').length

  return (
    <Card className="!p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiClock size={16} style={{ color: 'var(--c-primary)' }} />
        <h3 className="text-sm font-semibold text-white">Mis Solicitudes</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          <div className="h-8 bg-white/5 rounded animate-pulse" />
          <div className="h-8 bg-white/5 rounded animate-pulse" />
        </div>
      ) : (
        <div className="space-y-2 text-xs">
          {/* My Pending Requests */}
          {myPendingCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 rounded bg-yellow-500/10 border border-yellow-500/20"
            >
              <div className="flex items-center gap-2 text-yellow-300">
                <FiClock size={14} />
                <span>{myPendingCount} solicitud{myPendingCount > 1 ? 'es' : ''} pendiente{myPendingCount > 1 ? 's' : ''}</span>
              </div>
              <p className="text-white/40 mt-0.5">Esperando aprobación del administrador</p>
            </motion.div>
          )}

          {/* My Approved */}
          {myApprovedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 rounded bg-green-500/10 border border-green-500/20"
            >
              <div className="flex items-center gap-2 text-green-300">
                <FiCheckCircle size={14} />
                <span>Te uniste a {myApprovedCount} nodo{myApprovedCount > 1 ? 's' : ''}</span>
              </div>
            </motion.div>
          )}

          {/* My Rejected */}
          {myRejectedCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 rounded bg-red-500/10 border border-red-500/20"
            >
              <div className="flex items-center gap-2 text-red-300">
                <FiXCircle size={14} />
                <span>{myRejectedCount} solicitud{myRejectedCount > 1 ? 'es' : ''} rechazada{myRejectedCount > 1 ? 's' : ''}</span>
              </div>
            </motion.div>
          )}

          {/* Received Requests (if admin) */}
          {receivedSolicitudes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 rounded bg-blue-500/10 border border-blue-500/20 mt-3"
            >
              <div className="flex items-center gap-2 text-blue-300 mb-1">
                <FiClock size={14} />
                <span>Solicitudes por revisar</span>
              </div>
              <p className="text-white/40">
                Tienes {receivedSolicitudes.length} solicitud{receivedSolicitudes.length > 1 ? 'es' : ''} pendiente{receivedSolicitudes.length > 1 ? 's' : ''} en tus nodos
              </p>
            </motion.div>
          )}

          {allEmpty && !loading && (
            <p className="text-white/40 py-2">Sin solicitudes pendientes</p>
          )}
        </div>
      )}
    </Card>
  )
}
