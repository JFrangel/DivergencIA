import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const positionStyles = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

const originMap = {
  top: { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 } },
  bottom: { initial: { opacity: 0, y: -4 }, animate: { opacity: 1, y: 0 } },
  left: { initial: { opacity: 0, x: 4 }, animate: { opacity: 1, x: 0 } },
  right: { initial: { opacity: 0, x: -4 }, animate: { opacity: 1, x: 0 } },
}

export default function Tooltip({ content, children, position = 'top' }) {
  const [visible, setVisible] = useState(false)

  if (!content) return children

  const anim = originMap[position] || originMap.top

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-lg bg-[rgba(8,4,4,0.95)] backdrop-blur-xl border border-white/[0.08] px-2.5 py-1.5 text-xs text-white/80 font-body shadow-lg ${
              positionStyles[position] || positionStyles.top
            }`}
            initial={anim.initial}
            animate={anim.animate}
            exit={anim.initial}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
