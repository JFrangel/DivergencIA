import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiUserPlus, FiShield, FiStar } from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

const roleIcon = {
  fundador: <FiStar size={12} className="text-[#F59E0B]" />,
  admin:    <FiShield size={12} className="text-[#FC651F]" />,
}

export default function TeamSection({ members = [], canInvite = false }) {
  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white font-title">
          Equipo
          <span className="ml-2 text-sm font-normal text-white/30">
            {members.length}
          </span>
        </h2>

        {canInvite && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-[#FC651F]/40 hover:text-[#FC651F]"
          >
            <FiUserPlus size={13} />
            Invitar miembro
          </motion.button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {members.map((member, i) => {
          const { usuario, rol } = member
          if (!usuario) return null
          const isFounder = usuario.es_fundador

          return (
            <motion.div
              key={usuario.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={`/app/members/${usuario.id}`}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  className={`group relative flex items-center gap-3 rounded-2xl border bg-white/[0.03] p-3.5 backdrop-blur-xl transition-shadow ${
                    isFounder
                      ? 'border-[#F59E0B]/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                      : 'border-white/[0.06] hover:shadow-[0_0_20px_rgba(252,101,31,0.08)]'
                  }`}
                >
                  {/* Crown for founder */}
                  {isFounder && (
                    <span className="absolute -top-2 -left-1 text-[#F59E0B] drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]">
                      <FiStar size={14} fill="currentColor" />
                    </span>
                  )}

                  <Avatar
                    name={usuario.nombre}
                    src={usuario.foto_url}
                    area={usuario.area_investigacion}
                    size="md"
                    isFounded={isFounder}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-white group-hover:text-[#FC651F] transition-colors">
                        {usuario.nombre}
                      </span>
                      {roleIcon[rol]}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-1.5">
                      <Badge rol={rol} size="xs" />
                      {usuario.area_investigacion && (
                        <Badge area={usuario.area_investigacion} size="xs" />
                      )}
                    </div>
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          )
        })}
      </div>

      {members.length === 0 && (
        <p className="py-8 text-center text-sm text-white/25">
          No hay miembros en este proyecto todavia.
        </p>
      )}
    </section>
  )
}
