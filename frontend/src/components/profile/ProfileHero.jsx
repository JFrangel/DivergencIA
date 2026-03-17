import { motion } from 'framer-motion'
import { FiGithub, FiLinkedin, FiExternalLink, FiEdit2 } from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Card from '../ui/Card'

const SOCIAL_ICONS = {
  github:   FiGithub,
  linkedin: FiLinkedin,
}

function SocialLink({ type, url }) {
  const Icon = SOCIAL_ICONS[type]
  if (!Icon || !url) return null

  const href = url.startsWith('http') ? url : `https://${url}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
    >
      <Icon size={14} />
      <span className="max-w-[140px] truncate">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
      <FiExternalLink size={10} className="shrink-0 opacity-50" />
    </a>
  )
}

export default function ProfileHero({ profile = {}, onEdit }) {
  const {
    nombre = '',
    foto_url: avatar_url,
    area_investigacion: area,
    carrera,
    semestre,
    bio,
    rol,
    es_fundador,
    github_url,
    linkedin_url,
  } = profile

  return (
    <Card variant="clear" padding={false} className="overflow-hidden">
      {/* Gradient banner */}
      <div
        className="relative h-32 sm:h-40"
        style={{
          background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary) 50%, var(--c-accent))',
          opacity: 0.85,
        }}
      >
        {/* Decorative noise overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Edit button */}
        {onEdit && (
          <motion.button
            onClick={onEdit}
            className="absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md bg-white/[0.08] border border-white/[0.12] hover:bg-white/[0.14] transition-colors"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            <FiEdit2 size={12} />
            Editar perfil
          </motion.button>
        )}
      </div>

      {/* Content */}
      <div className="relative px-5 pb-5">
        {/* Avatar — overlaps the banner */}
        <motion.div
          className="-mt-12 sm:-mt-14 mb-3"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Avatar
            name={nombre}
            src={avatar_url}
            area={area}
            size="xl"
            isFounded={!!es_fundador}
            className="ring-4 ring-[#060304]"
          />
        </motion.div>

        {/* Name & meta */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <h1 className="text-xl sm:text-2xl font-bold font-title text-white/90 leading-tight">
            {nombre}
          </h1>

          {(carrera || semestre) && (
            <p className="text-sm text-white/40 mt-0.5">
              {carrera}{carrera && semestre ? ' · ' : ''}{semestre && `${semestre}° semestre`}
            </p>
          )}
        </motion.div>

        {/* Badges row */}
        <motion.div
          className="flex flex-wrap items-center gap-1.5 mt-3"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {area && <Badge area={area} dot />}
          {es_fundador && <Badge preset="fundador" dot />}
          {rol && rol !== 'fundador' && <Badge rol={rol} dot />}
        </motion.div>

        {/* Bio */}
        {bio && (
          <motion.p
            className="mt-3 text-sm text-white/50 leading-relaxed max-w-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            {bio}
          </motion.p>
        )}

        {/* Social links */}
        {(github_url || linkedin_url) && (
          <motion.div
            className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <SocialLink type="github" url={github_url} />
            <SocialLink type="linkedin" url={linkedin_url} />
          </motion.div>
        )}
      </div>
    </Card>
  )
}
