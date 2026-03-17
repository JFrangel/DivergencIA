import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiClock, FiDownload, FiUser, FiChevronDown, FiChevronUp, FiFileText } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { timeAgo } from '../../lib/utils'

export default function VersionHistory({ fileId, fileName }) {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    if (!fileId) return
    supabase
      .from('versiones_archivo')
      .select('*, autor:usuarios(nombre)')
      .eq('archivo_id', fileId)
      .order('version', { ascending: false })
      .then(({ data }) => {
        setVersions(data || [])
        setLoading(false)
      })
  }, [fileId])

  // If table doesn't exist or no versions, show minimal placeholder
  if (!loading && versions.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-[10px] text-white/20 flex items-center justify-center gap-1">
          <FiClock size={10} /> Sin historial de versiones
        </p>
      </div>
    )
  }

  return (
    <div className="mt-3 border-t border-white/[0.06] pt-3">
      <button
        className="flex items-center gap-2 text-xs text-white/40 hover:text-white/60 transition-colors w-full"
        onClick={() => setExpanded(!expanded)}
      >
        <FiClock size={11} />
        <span>Historial de versiones ({versions.length})</span>
        {expanded ? <FiChevronUp size={11} className="ml-auto" /> : <FiChevronDown size={11} className="ml-auto" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className="mt-2 space-y-1.5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {loading ? (
              <div className="h-8 rounded bg-white/[0.03] animate-pulse" />
            ) : (
              versions.map((v, i) => (
                <motion.div
                  key={v.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="w-7 h-7 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-white/30">v{v.version}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-white/50 truncate">{v.nota || 'Sin nota'}</p>
                    <p className="text-[9px] text-white/20 flex items-center gap-1.5 mt-0.5">
                      <FiUser size={8} /> {v.autor?.nombre || 'Anónimo'}
                      <span>·</span>
                      {timeAgo(v.created_at)}
                    </p>
                  </div>
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded text-white/15 hover:text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all opacity-0 group-hover:opacity-100"
                      title="Descargar esta versión"
                    >
                      <FiDownload size={11} />
                    </a>
                  )}
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
