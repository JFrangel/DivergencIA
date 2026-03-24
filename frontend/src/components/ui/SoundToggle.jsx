import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiVolume2, FiVolumeX } from 'react-icons/fi'
import useSounds from '../../hooks/useSounds'

export default function SoundToggle() {
  const { enabled, volume, setVolume, toggleEnabled, playSound } = useSounds()
  const [showSlider, setShowSlider] = useState(false)

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowSlider(true)}
      onMouseLeave={() => setShowSlider(false)}
    >
      <button
        onClick={() => { toggleEnabled(); playSound('click') }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"
        title={enabled ? 'Silenciar sonidos' : 'Activar sonidos'}
      >
        {enabled ? <FiVolume2 size={16} /> : <FiVolumeX size={16} />}
      </button>

      <AnimatePresence>
        {showSlider && enabled && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 p-3 rounded-xl glass z-50 min-w-[160px]"
          >
            <p className="text-[10px] uppercase tracking-wider text-white/30 mb-2">
              Volumen
            </p>
            <div className="flex items-center gap-2">
              <FiVolumeX size={12} className="text-white/30 shrink-0" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full h-1 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--c-primary) ${volume * 100}%, rgba(255,255,255,0.1) ${volume * 100}%)`,
                  '--tw-ring-color': 'transparent',
                }}
              />
              <FiVolume2 size={12} className="text-white/30 shrink-0" />
            </div>
            <p className="text-[10px] text-white/20 text-center mt-1.5">
              {Math.round(volume * 100)}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
