import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCheck, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi'
import DynamicAvatar, { AVATAR_ANIM_TYPES } from './DynamicAvatar'

// ─── Special animated tab sentinel ─────────────────────────────────────────
const ANIMATED_STYLE_ID = '__animated__'

// ─── DiceBear 9.x styles grouped by mood ───────────────────────────────────
const STYLES = [
  {
    id: ANIMATED_STYLE_ID,
    label: '🌀 Animado',
    desc: 'Canvas animado',
    color: '#00D1FF',
    variants: [],
  },
  {
    id: 'futurista',
    label: '🤖 Futurista',
    desc: 'Robots y androides',
    color: '#00D1FF',
    variants: [
      {
        style: 'bottts',
        seeds: ['Flux','Neo','Orion','Zeta','Vega','Nexus','Apex','Core','Grid','Nova'],
        extra: ['Alpha','Sigma','Omega','Titan','Cyber','Matrix','Pixel','Binary','Quantum','Vector','Echo','Delta','Gamma','Kappa','Lambda'],
      },
      {
        style: 'bottts-neutral',
        seeds: ['Cyber','Bit','Droid','Unit','Mech','Bot','Synth','Echo','Pulse','Wave'],
        extra: ['Nano','Micro','Proto','Meta','Ultra','Hyper','Turbo','Volt','Flux','Ion','Photon','Laser','Prism','Byte','Ram'],
      },
    ],
  },
  {
    id: 'oscuro',
    label: '🌑 Oscuro',
    desc: 'Sobrio y misterioso',
    color: '#8B5CF6',
    variants: [
      {
        style: 'notionists',
        seeds: ['Shadow','Raven','Onyx','Abyss','Void','Noir','Dusk','Ash','Grim','Tide'],
        extra: ['Crow','Obsidian','Phantom','Wraith','Specter','Shade','Mist','Gloom','Murk','Dread','Bane','Dark','Null','Zero','Edge'],
      },
      {
        style: 'notionists-neutral',
        seeds: ['Eclipse','Storm','Night','Mist','Fog','Ember','Coal','Ink','Steel','Slate'],
        extra: ['Iron','Stone','Flint','Gravel','Dust','Soot','Sable','Jet','Pitch','Carbon','Basalt','Shale','Cinder','Char','Smoke'],
      },
    ],
  },
  {
    id: 'angelical',
    label: '👼 Angélico',
    desc: 'Suave y luminoso',
    color: '#F59E0B',
    variants: [
      {
        style: 'lorelei',
        seeds: ['Aurora','Luna','Celeste','Seraph','Lyra','Sol','Iris','Stella','Alba','Deva'],
        extra: ['Aria','Nova','Elara','Zara','Naia','Sera','Lumi','Elia','Mira','Calla','Dove','Pearl','Opal','Ivory','Blanche'],
      },
      {
        style: 'lorelei-neutral',
        seeds: ['Halo','Glow','Lumi','Aura','Bliss','Cloud','Dawn','Ray','Serene','Veil'],
        extra: ['Beam','Gleam','Shine','Radiance','Nimbus','Cirrus','Wisp','Gossamer','Diaphanous','Filament','Mote','Spark','Flare','Flicker','Twinkle'],
      },
    ],
  },
  {
    id: 'abstracto',
    label: '🎨 Abstracto',
    desc: 'Geométrico y único',
    color: '#22c55e',
    variants: [
      {
        style: 'shapes',
        seeds: ['Alpha','Beta','Gamma','Delta','Sigma','Omega','Kappa','Theta','Phi','Psi'],
        extra: ['Rho','Tau','Eta','Zeta','Xi','Lambda','Mu','Nu','Upsilon','Chi','Pi','Iota','Epsilon','Omicron','Digamma'],
      },
      {
        style: 'identicon',
        seeds: ['Hex','Vec','Geo','Poly','Tri','Arc','Dot','Net','Mesh','Grid'],
        extra: ['Line','Curve','Spiral','Helix','Fractal','Mandala','Tesseract','Vortex','Nexus','Lattice','Matrix','Cipher','Code','Hash','Bloom'],
      },
    ],
  },
  {
    id: 'clasico',
    label: '🌟 Clásico',
    desc: 'Ilustración humana',
    color: '#FC651F',
    variants: [
      {
        style: 'micah',
        seeds: ['Alex','Sam','Jordan','Casey','River','Quinn','Blake','Sage','Sky','Reed'],
        extra: ['Morgan','Avery','Riley','Taylor','Dakota','Rowan','Finley','Hayden','Emery','Kendall','Oakley','Peyton','Shiloh','Skyler','Cameron','Reese','Harlow','Marlowe','Lennon','Indigo'],
      },
      {
        style: 'adventurer-neutral',
        seeds: ['Scout','Hunter','Ranger','Rider','Pilot','Diver','Climber','Sailor','Archer','Fisher'],
        extra: [
          'Hiker','Surfer','Skater','Boxer','Fencer','Jogger','Dancer','Coder','Maker','Builder',
          'Dreamer','Thinker','Seeker','Finder','Leader','Helper','Mentor','Artist','Writer','Singer',
          'Rowan','Avery','Finley','Reeve','Heath','Wren','Teal','Flint','Stone','Brook',
        ],
      },
      {
        style: 'adventurer',
        seeds: ['Max','Leo','Mia','Zoe','Kai','Ava','Eli','Ivy','Owen','Nora'],
        extra: [
          'Liam','Emma','Noah','Olivia','Aiden','Sophia','Lucas','Isabella','Mason','Amelia',
          'Ethan','Harper','James','Evelyn','Logan','Abigail','Jackson','Ella','Sebastian','Grace',
          'Carter','Chloe','Wyatt','Penelope','Henry','Layla','Alexander','Riley','Daniel','Zoey',
          'Michael','Nora','Benjamin','Lily','Jack','Eleanor','Samuel','Hannah','David','Lillian',
          'Joseph','Addison','Ryan','Aubrey','Luke','Ellie','Anthony','Stella','Joshua','Natalie',
          'Andrew','Zoe','Christopher','Leah','Isaac','Hazel','Gabriel','Violet','Julian','Aurora',
          'Levi','Savannah','Nathan','Audrey','Dylan','Brooklyn','Caleb','Bella','Isaiah','Claire',
        ],
      },
    ],
  },
  {
    id: 'pixel',
    label: '👾 Pixel Art',
    desc: 'Retro y game-style',
    color: '#EC4899',
    variants: [
      {
        style: 'pixel-art',
        seeds: ['Hero','Rogue','Mage','Tank','Archer','Bard','Paladin','Monk','Druid','Cleric'],
        extra: ['Ranger','Warlock','Sorcerer','Fighter','Barbarian','Wizard','Shaman','Necromancer','Berserker','Assassin','Ninja','Samurai','Knight','Templar','Sentinel'],
      },
      {
        style: 'pixel-art-neutral',
        seeds: ['Sprite','Tile','Block','Chip','Byte','Voxel','Bit','Ram','Rom','Cpu'],
        extra: ['Gpu','Alu','Cache','Fetch','Decode','Execute','Pipeline','Register','Interrupt','Thread','Process','Stack','Heap','Queue','Buffer'],
      },
    ],
  },
]

function dicebearUrl(style, seed, size = 80) {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=transparent`
}

// ─── Single avatar option ───────────────────────────────────────────────────
function AvatarOption({ style, seed, selected, onSelect }) {
  const url = dicebearUrl(style, seed)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <button
      onClick={() => onSelect(url)}
      className="relative rounded-xl overflow-hidden transition-all duration-150 group"
      style={{
        background: selected ? 'rgba(252,101,31,0.15)' : 'rgba(255,255,255,0.03)',
        border: selected ? '2px solid #FC651F' : '2px solid rgba(255,255,255,0.07)',
        width: 64,
        height: 64,
      }}
      title={`${style} • ${seed}`}
    >
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/10 border-t-white/30 rounded-full animate-spin" />
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">?</div>
      ) : (
        <img
          src={url}
          alt={seed}
          className={`w-full h-full object-contain p-1.5 transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          draggable={false}
        />
      )}
      {selected && (
        <div className="absolute bottom-0.5 right-0.5 w-4 h-4 rounded-full bg-[#FC651F] flex items-center justify-center">
          <FiCheck size={9} className="text-white" />
        </div>
      )}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: 'rgba(255,255,255,0.04)' }} />
    </button>
  )
}

// ─── Expandable variant section ─────────────────────────────────────────────
function VariantSection({ variant, selected, onSelect }) {
  const allSeeds = [...variant.seeds, ...(variant.extra || [])]
  const [expanded, setExpanded] = useState(false)
  // Show first 20 by default so users see more variety and pick unique avatars
  const initialCount = 20
  const visibleSeeds = expanded ? allSeeds : allSeeds.slice(0, initialCount)
  const hasExtra = allSeeds.length > initialCount

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold">
          {variant.style}
        </p>
        {hasExtra && (
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-[9px] text-white/25 hover:text-white/50 transition-colors"
          >
            {expanded ? <><FiChevronUp size={10} /> Menos</> : <><FiChevronDown size={10} /> +{allSeeds.length - initialCount} más</>}
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleSeeds.map(seed => (
          <AvatarOption
            key={`${variant.style}-${seed}`}
            style={variant.style}
            seed={seed}
            selected={selected === dicebearUrl(variant.style, seed)}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Main modal ─────────────────────────────────────────────────────────────
export default function AvatarPickerModal({ open, currentUrl, onSelect, onClose }) {
  const [activeStyle, setActiveStyle] = useState('futurista')
  const [selected, setSelected] = useState(currentUrl || null)
  const [customSeed, setCustomSeed] = useState('')

  const styleMeta = STYLES.find(s => s.id === activeStyle)

  const handleConfirm = useCallback(() => {
    if (selected) onSelect(selected)
    onClose()
  }, [selected, onSelect, onClose])

  const randomize = () => {
    const word = Math.random().toString(36).slice(2, 8)
    setCustomSeed(word)
  }

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
          style={{ background: '#0c0508', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh' }}
          initial={{ scale: 0.93, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.93, opacity: 0, y: 12 }}
          transition={{ duration: 0.2, type: 'spring', bounce: 0.15 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.07]">
            <div>
              <h2 className="text-sm font-bold text-white/90">Elige tu avatar</h2>
              <p className="text-[10px] text-white/30 mt-0.5">Animados, DiceBear y seeds personalizados</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            >
              <FiX size={15} />
            </button>
          </div>

          {/* Style tabs */}
          <div className="flex overflow-x-auto gap-1.5 px-4 py-3 border-b border-white/[0.06] shrink-0">
            {STYLES.map(s => (
              <button
                key={s.id}
                onClick={() => setActiveStyle(s.id)}
                className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl shrink-0 transition-all text-left"
                style={activeStyle === s.id
                  ? { background: `${s.color}18`, border: `1px solid ${s.color}40`, color: s.color }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)' }}
              >
                <span className="text-sm font-medium whitespace-nowrap">{s.label}</span>
                <span className="text-[9px] whitespace-nowrap" style={{ opacity: 0.6 }}>{s.desc}</span>
              </button>
            ))}
          </div>

          {/* Avatar grid */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {activeStyle === ANIMATED_STYLE_ID ? (
              /* ── Animated avatars tab ── */
              <div>
                <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-3">
                  Avatares canvas animados — se muestran en tiempo real
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {AVATAR_ANIM_TYPES.map(anim => {
                    const val = `animated::${anim.id}`
                    const isSel = selected === val
                    return (
                      <button
                        key={anim.id}
                        onClick={() => setSelected(val)}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl transition-all"
                        style={{
                          background: isSel ? 'rgba(0,209,255,0.1)' : 'rgba(255,255,255,0.03)',
                          border: isSel ? '2px solid #00D1FF' : '2px solid rgba(255,255,255,0.07)',
                        }}
                      >
                        <div className="relative">
                          <DynamicAvatar type={anim.id} size={72} />
                          {isSel && (
                            <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[#00D1FF] flex items-center justify-center">
                              <FiCheck size={10} className="text-black" />
                            </div>
                          )}
                        </div>
                        <span className="text-[11px] text-white/60 font-medium">{anim.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              /* ── DiceBear tabs ── */
              <>
                {styleMeta?.variants.map(variant => (
                  <VariantSection
                    key={variant.style}
                    variant={variant}
                    selected={selected}
                    onSelect={setSelected}
                  />
                ))}

                {/* Custom seed */}
                <div className="border-t border-white/[0.06] pt-4">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider font-semibold mb-2.5">
                    Seed personalizado — genera el tuyo
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      value={customSeed}
                      onChange={e => setCustomSeed(e.target.value)}
                      placeholder="Escribe cualquier palabra..."
                      className="flex-1 px-3 py-2 rounded-xl text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#FC651F]/40 transition-colors placeholder-white/20"
                    />
                    <button
                      onClick={randomize}
                      className="p-2.5 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
                      title="Aleatorio"
                    >
                      <FiRefreshCw size={13} />
                    </button>
                  </div>
                  {customSeed.trim() && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {styleMeta?.variants.map(v => (
                        <AvatarOption
                          key={`custom-${v.style}-${customSeed}`}
                          style={v.style}
                          seed={customSeed.trim()}
                          selected={selected === dicebearUrl(v.style, customSeed.trim())}
                          onSelect={setSelected}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.07]">
            {/* Preview of selected */}
            <div className="flex items-center gap-3">
              {selected ? (
                <>
                  <div
                    className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)' }}
                  >
                    {selected.startsWith('animated::') ? (
                      <DynamicAvatar type={selected.slice('animated::'.length)} size={40} style={{ borderRadius: 8 }} />
                    ) : (
                      <img src={selected} alt="Seleccionado" className="w-full h-full object-contain p-1" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-white/60 font-medium">Seleccionado</p>
                    <p className="text-[10px] text-white/25 truncate max-w-[200px]">
                      {selected.startsWith('animated::')
                        ? AVATAR_ANIM_TYPES.find(a => `animated::${a.id}` === selected)?.label || 'animado'
                        : selected.match(/\/([^/]+)\/svg/)?.[1] || 'avatar'}
                    </p>
                  </div>
                </>
              ) : (
                <p className="text-xs text-white/25">Selecciona un avatar</p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40"
                style={{ background: selected ? 'linear-gradient(135deg, #FC651F, #FC651F99)' : undefined }}
              >
                Usar este avatar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
