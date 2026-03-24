import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { FiGithub, FiLinkedin, FiExternalLink, FiEdit2, FiCamera, FiUploadCloud, FiGlobe } from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import Card from '../ui/Card'
import { supabase } from '../../lib/supabase'
import DynamicBanner, { BannerSelector } from './DynamicBanner'
import AvatarPickerModal from './AvatarPickerModal'

const SOCIAL_ICONS = {
  github:   FiGithub,
  linkedin: FiLinkedin,
  website:  FiGlobe,
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

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export default function ProfileHero({ profile = {}, onEdit, onImageUploaded }) {
  const {
    nombre = '',
    foto_url: avatar_url,
    banner_url,
    titulo,
    area_investigacion: area,
    carrera,
    semestre,
    bio,
    rol,
    es_fundador,
    github_url,
    linkedin_url,
    website_url,
  } = profile

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState(0)
  const [bannerProgress, setBannerProgress] = useState(0)
  const [showBannerSelector, setShowBannerSelector] = useState(false)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)
  const dynamicBannerType = profile?.dynamic_banner || localStorage.getItem(`banner_type_${profile?.id}`) || null

  const validateFile = (file) => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Solo se permiten archivos JPG, PNG o WebP'
    }
    if (file.size > MAX_SIZE) {
      return 'El archivo no debe superar 2MB'
    }
    return null
  }

  const uploadImage = async (file, type) => {
    const isAvatar = type === 'avatar'
    const setUploading = isAvatar ? setAvatarUploading : setBannerUploading
    const setProgress = isAvatar ? setAvatarProgress : setBannerProgress

    const validationError = validateFile(file)
    if (validationError) {
      if (onImageUploaded) onImageUploaded(null, validationError)
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const ext = file.name.split('.').pop()
      const fileName = `${profile.id}/${type}_${Date.now()}.${ext}`

      setProgress(30)

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true })

      if (uploadError) throw uploadError

      setProgress(70)

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setProgress(90)

      const field = isAvatar ? 'foto_url' : 'banner_url'
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ [field]: publicUrl })
        .eq('id', profile.id)

      if (updateError) throw updateError

      setProgress(100)

      if (onImageUploaded) onImageUploaded(field, null, publicUrl)
    } catch (err) {
      console.error(`Error uploading ${type}:`, err)
      if (onImageUploaded) onImageUploaded(null, `Error al subir ${isAvatar ? 'foto' : 'banner'}`)
    } finally {
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)
    }
  }

  const handleAvatarClick = () => avatarInputRef.current?.click()
  const handleBannerClick = () => bannerInputRef.current?.click()

  const handleAvatarPickerSelect = async (url) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ foto_url: url })
      .eq('id', profile.id)
    if (!error) onImageUploaded?.('foto_url', null, url)
  }

  const handleFileChange = (e, type) => {
    const file = e.target.files?.[0]
    if (file) uploadImage(file, type)
    e.target.value = ''
  }

  return (
    <>
    <Card variant="clear" padding={false} className="overflow-hidden">
      {/* Hidden file inputs */}
      <input
        ref={avatarInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'avatar')}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'banner')}
      />

      {/* Banner */}
      <div
        className="relative h-32 sm:h-40 group cursor-pointer"
        onClick={handleBannerClick}
      >
        {banner_url ? (
          <img
            src={banner_url}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        ) : dynamicBannerType ? (
          <DynamicBanner type={dynamicBannerType} height={160} className="w-full h-full" />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary) 50%, var(--c-accent))',
              opacity: 0.85,
            }}
          />
        )}

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/20" />

        {/* Upload overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex flex-col items-center gap-1 text-white/80 text-sm font-medium">
            <div className="flex items-center gap-2">
              <FiCamera size={16} />
              <span>Subir imagen</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setShowBannerSelector(true) }}
              className="text-xs text-white/50 hover:text-white/80 transition-colors underline"
            >
              o elegir banner animado
            </button>
          </div>
        </div>

        {/* Dynamic banner selector */}
        {showBannerSelector && (
          <div className="absolute inset-0 z-20" onClick={(e) => e.stopPropagation()}>
            <BannerSelector
              currentType={dynamicBannerType}
              onSelect={(type) => {
                localStorage.setItem(`banner_type_${profile?.id}`, type)
                setShowBannerSelector(false)
                onImageUploaded?.('dynamic_banner', null, type)
              }}
              onClose={() => setShowBannerSelector(false)}
            />
          </div>
        )}

        {/* Banner upload progress */}
        {bannerUploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex flex-col items-center gap-2">
              <FiUploadCloud size={24} className="text-white/80 animate-pulse" />
              <div className="w-32 h-1.5 rounded-full bg-white/20 overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'var(--c-primary)' }}
                  initial={{ width: '0%' }}
                  animate={{ width: `${bannerProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Edit button */}
        {onEdit && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onEdit() }}
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
          className="-mt-12 sm:-mt-14 mb-3 relative inline-block group/avatar cursor-pointer"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          onClick={handleAvatarClick}
        >
          <Avatar
            name={nombre}
            src={avatar_url}
            area={area}
            size="xl"
            isFounded={!!es_fundador}
            className="ring-4 ring-[#060304]"
          />

          {/* Avatar upload overlay */}
          <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-200 gap-1">
            <FiCamera size={16} className="text-white/80" />
            <button
              onClick={(e) => { e.stopPropagation(); setShowAvatarPicker(true) }}
              className="text-[9px] text-white/50 hover:text-white/80 transition-colors underline leading-tight text-center px-1"
            >
              avatar animado
            </button>
          </div>

          {/* Avatar upload progress */}
          {avatarUploading && (
            <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/60">
              <svg className="w-12 h-12" viewBox="0 0 48 48">
                <circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="3"
                />
                <motion.circle
                  cx="24" cy="24" r="20"
                  fill="none"
                  stroke="var(--c-primary)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={125.6}
                  initial={{ strokeDashoffset: 125.6 }}
                  animate={{ strokeDashoffset: 125.6 * (1 - avatarProgress / 100) }}
                  transition={{ duration: 0.3 }}
                  style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                />
              </svg>
            </div>
          )}
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

          {titulo && (
            <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--c-primary)' }}>
              {titulo}
            </p>
          )}

          {(carrera || semestre) && (
            <p className="text-sm text-white/40 mt-0.5">
              {carrera}{carrera && semestre ? ' · ' : ''}{semestre && `${semestre}\u00B0 semestre`}
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
        {(github_url || linkedin_url || website_url) && (
          <motion.div
            className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.45 }}
          >
            <SocialLink type="github" url={github_url} />
            <SocialLink type="linkedin" url={linkedin_url} />
            <SocialLink type="website" url={website_url} />
          </motion.div>
        )}
      </div>
    </Card>

    <AvatarPickerModal
      open={showAvatarPicker}
      currentUrl={avatar_url}
      onSelect={handleAvatarPickerSelect}
      onClose={() => setShowAvatarPicker(false)}
    />
    </>
  )
}
