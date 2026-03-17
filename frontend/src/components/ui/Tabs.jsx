import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Tabs({ tabs = [], defaultTab, onChange, className = '' }) {
  const [active, setActive] = useState(defaultTab || tabs[0]?.id)

  const handleChange = (id) => {
    setActive(id)
    onChange?.(id)
  }

  const activeTab = tabs.find(t => t.id === active)

  return (
    <div className={className}>
      {/* Tab Bar */}
      <div className="flex items-center gap-1 p-1 glass rounded-xl w-fit">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`relative px-4 py-1.5 text-sm font-medium rounded-lg transition-colors duration-200 ${
              active === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {active === tab.id && (
              <motion.span
                className="absolute inset-0 rounded-lg"
                style={{ background: 'color-mix(in srgb, var(--c-primary) 15%, rgba(255,255,255,0.05))' }}
                layoutId="tab-pill"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.icon && <span>{tab.icon}</span>}
              {tab.label}
              {tab.count !== undefined && (
                <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">{tab.count}</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab?.content && (
        <div className="mt-4">{activeTab.content}</div>
      )}
    </div>
  )
}
