import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDownload, FiFile, FiImage, FiCode, FiExternalLink, FiMaximize2, FiX, FiUser, FiCalendar, FiHardDrive, FiTag, FiDatabase, FiPlay, FiMusic, FiAlertCircle, FiTable, FiStar, FiLink, FiGlobe, FiLock, FiUsers, FiShield, FiPackage, FiCheckSquare, FiSquare } from 'react-icons/fi'
import { TbFileWord, TbPresentation, TbFileZip } from 'react-icons/tb'
import Modal from '../ui/Modal'
import VersionHistory from './VersionHistory'
import CommentSection from '../ui/CommentSection'
import { formatBytes, formatDate } from '../../lib/utils'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.json', '.css', '.html', '.yml', '.yaml', '.toml', '.sh', '.sql', '.r', '.rmd', '.xml', '.tex', '.bib', '.dart', '.go', '.rs', '.java', '.kt', '.swift', '.c', '.cpp', '.h', '.cs', '.php', '.rb', '.scala', '.lua', '.vim', '.dockerfile', '.graphql', '.proto', '.srt', '.vtt', '.env']
const DATASET_EXTENSIONS = ['.csv', '.tsv', '.ndjson', '.jsonl']
const EXCEL_EXTENSIONS = ['.xls', '.xlsx', '.xlsm', '.ods']
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.webm']
const WORD_EXTENSIONS = ['.doc', '.docx', '.odt', '.rtf']
const PPT_EXTENSIONS = ['.ppt', '.pptx', '.odp']
const ARCHIVE_EXTENSIONS = ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz']
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.avif', '.heic']
const TEXT_EXTENSIONS = ['.txt', '.log', '.ini', '.cfg', '.conf', '.md', '.markdown', '.rst', '.nfo', '.readme']
const NOTEBOOK_EXTENSIONS = ['.ipynb']
const MODEL_EXTENSIONS = ['.obj', '.stl', '.glb', '.gltf', '.fbx', '.dae', '.ply', '.3ds']
const FONT_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2']

function getFileCategory(tipo = '', nombre = '') {
  const lower = nombre.toLowerCase()
  if (tipo === 'imagen' || IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'image'
  if (tipo.includes('pdf') || tipo === 'pdf') return 'pdf'
  if (tipo.includes('video') || VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'video'
  if (tipo.includes('audio') || AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'audio'
  if (NOTEBOOK_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'notebook'
  if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.rst')) return 'markdown'
  if (DATASET_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'dataset'
  if (EXCEL_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'excel'
  if (WORD_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'word'
  if (tipo === 'ppt' || PPT_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'presentation'
  if (ARCHIVE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'archive'
  if (MODEL_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'model'
  if (FONT_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'font'
  if (tipo === 'code' || CODE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'code'
  if (TEXT_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'text'
  return 'other'
}

function getLanguageFromName(nombre = '') {
  const lower = nombre.toLowerCase()
  if (lower.endsWith('.py') || lower.endsWith('.rmd')) return 'python'
  if (lower.endsWith('.sql')) return 'sql'
  if (lower.endsWith('.json')) return 'json'
  if (lower.endsWith('.css')) return 'css'
  if (lower.endsWith('.html')) return 'html'
  if (lower.match(/\.(js|jsx|ts|tsx)$/)) return 'javascript'
  if (lower.match(/\.(yml|yaml)$/)) return 'yaml'
  if (lower.match(/\.(sh|bash|zsh)$/)) return 'shell'
  if (lower.match(/\.(rs)$/)) return 'rust'
  if (lower.match(/\.(go)$/)) return 'go'
  if (lower.match(/\.(java|kt|scala)$/)) return 'java'
  if (lower.match(/\.(c|cpp|h|cs)$/)) return 'cpp'
  if (lower.match(/\.(rb|rake)$/)) return 'ruby'
  if (lower.match(/\.(php)$/)) return 'php'
  if (lower.match(/\.(tex|bib)$/)) return 'latex'
  if (lower.match(/\.(xml|graphql|proto)$/)) return 'xml'
  if (lower.match(/\.(srt|vtt)$/)) return 'subtitle'
  return 'generic'
}

/* ── Loading Spinner ───────────────────────────────────────────── */
function PreviewSpinner() {
  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] p-4 h-72 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-white/20 border-t-[var(--c-accent)] rounded-full animate-spin" />
        <span className="text-xs text-white/30">Cargando vista previa...</span>
      </div>
    </div>
  )
}

/* ── Error State ───────────────────────────────────────────────── */
function PreviewError({ message }) {
  return (
    <div className="rounded-xl bg-black/40 border border-red-500/20 p-6 flex flex-col items-center justify-center gap-3">
      <FiAlertCircle size={28} className="text-red-400/60" />
      <p className="text-sm text-white/50 text-center">{message || 'No se pudo cargar la vista previa.'}</p>
    </div>
  )
}

/* ── Syntax Highlighting ───────────────────────────────────────── */
function highlightCode(text, language) {
  // Escape HTML first
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Common patterns by language
  const rules = []

  // Comments — must come first to avoid conflicts
  if (['javascript', 'css', 'sql', 'json'].includes(language)) {
    rules.push({ pattern: /(\/\/.*$)/gm, cls: 'code-comment' })
    rules.push({ pattern: /(\/\*[\s\S]*?\*\/)/gm, cls: 'code-comment' })
  }
  if (['python', 'shell', 'yaml'].includes(language)) {
    rules.push({ pattern: /(#.*$)/gm, cls: 'code-comment' })
  }
  if (language === 'sql') {
    rules.push({ pattern: /(--.*$)/gm, cls: 'code-comment' })
  }
  if (language === 'html') {
    rules.push({ pattern: /(&lt;!--[\s\S]*?--&gt;)/gm, cls: 'code-comment' })
  }

  // Strings
  rules.push({ pattern: /("(?:[^"\\]|\\.)*")/g, cls: 'code-string' })
  rules.push({ pattern: /('(?:[^'\\]|\\.)*')/g, cls: 'code-string' })
  rules.push({ pattern: /(`(?:[^`\\]|\\.)*`)/g, cls: 'code-string' })

  // Numbers
  rules.push({ pattern: /\b(\d+\.?\d*)\b/g, cls: 'code-number' })

  // Keywords by language
  const kwMap = {
    javascript: /\b(const|let|var|function|return|if|else|for|while|class|import|export|from|default|async|await|new|this|try|catch|throw|switch|case|break|continue|typeof|instanceof|null|undefined|true|false|of|in|yield)\b/g,
    python: /\b(def|class|return|if|elif|else|for|while|import|from|as|with|try|except|raise|finally|pass|break|continue|lambda|yield|and|or|not|in|is|None|True|False|self|print|async|await)\b/g,
    sql: /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|INTO|VALUES|SET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AND|OR|NOT|NULL|IN|AS|ORDER|BY|GROUP|HAVING|LIMIT|OFFSET|UNION|EXISTS|BETWEEN|LIKE|DISTINCT|COUNT|SUM|AVG|MAX|MIN|CASE|WHEN|THEN|ELSE|END|PRIMARY|KEY|FOREIGN|REFERENCES|CASCADE|CONSTRAINT|DEFAULT|CHECK|UNIQUE|VIEW|TRIGGER|FUNCTION|RETURNS|BEGIN|DECLARE|IF|BOOLEAN|INTEGER|TEXT|VARCHAR|TIMESTAMP|SERIAL|BIGINT|FLOAT|NUMERIC|select|from|where|insert|update|delete|create|alter|drop|table|index|into|values|set|join|left|right|inner|outer|on|and|or|not|null|in|as|order|by|group|having|limit|offset|union|exists|between|like|distinct|count|sum|avg|max|min|case|when|then|else|end)\b/g,
    css: /\b(color|background|margin|padding|border|display|flex|grid|position|width|height|font|text|align|justify|gap|overflow|opacity|transition|transform|animation|z-index|top|left|right|bottom|content|cursor|visibility|box-shadow|border-radius)\b/g,
    html: /(&lt;\/?)([\w-]+)/g,
    yaml: /^([\w-]+)(?=:)/gm,
    shell: /\b(echo|cd|ls|mkdir|rm|cp|mv|cat|grep|sed|awk|curl|wget|sudo|apt|npm|yarn|git|docker|export|source|if|then|fi|else|elif|for|do|done|while|case|esac|function)\b/g,
    json: null,
    markdown: null,
    generic: /\b(function|return|if|else|for|while|class|import|export|const|let|var|true|false|null)\b/g,
  }

  if (language === 'html') {
    rules.push({ pattern: /(&lt;\/?)([\w-]+)/g, cls: 'code-keyword', replacer: (_, bracket, tag) => `${bracket}<span class="code-keyword">${tag}</span>` })
  } else if (kwMap[language]) {
    rules.push({ pattern: kwMap[language], cls: 'code-keyword' })
  }

  // Apply rules in order — use placeholder tokens to avoid double-replacing
  const tokens = []
  let tokenized = html

  for (const rule of rules) {
    if (rule.replacer) {
      tokenized = tokenized.replace(rule.pattern, rule.replacer)
    } else {
      tokenized = tokenized.replace(rule.pattern, (match) => {
        const idx = tokens.length
        tokens.push(`<span class="${rule.cls}">${match}</span>`)
        return `\x00TOKEN_${idx}\x00`
      })
    }
  }

  // Replace tokens back
  for (let i = 0; i < tokens.length; i++) {
    tokenized = tokenized.replace(`\x00TOKEN_${i}\x00`, tokens[i])
  }

  return tokenized
}

function MetaRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-white/30 flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-white/20" />}
        {label}
      </span>
      <span className="text-xs text-white/60">{value}</span>
    </div>
  )
}

/* ── Image Lightbox ───────────────────────────────────────────── */
function ImageLightbox({ src, alt, open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 max-w-[90vw] max-h-[90vh]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button
              onClick={onClose}
              className="absolute -top-10 right-0 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            >
              <FiX size={20} />
            </button>
            <img
              src={src}
              alt={alt}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Code Preview (with syntax highlighting + inline editing) ──── */
function CodePreview({ url, fallback, fileName, canEdit, onSaveContent }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  const language = useMemo(() => getLanguageFromName(fileName || ''), [fileName])

  useEffect(() => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(false)
    setEditMode(false)

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('fetch failed')
        return res.text()
      })
      .then(text => {
        const lines = text.split('\n')
        const truncated = lines.length > 200
        setContent({ text: lines.slice(0, 200).join('\n'), truncated, totalLines: lines.length, fullText: text })
        setEditText(text)
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  const highlighted = useMemo(() => {
    if (!content?.text) return ''
    return highlightCode(content.text, language)
  }, [content?.text, language])

  const handleSave = async () => {
    setSaving(true)
    await onSaveContent?.(editText)
    setContent(prev => ({
      ...prev,
      text: editText.split('\n').slice(0, 200).join('\n'),
      totalLines: editText.split('\n').length,
      fullText: editText,
      truncated: editText.split('\n').length > 200,
    }))
    setEditMode(false)
    setSaving(false)
  }

  if (loading) return <PreviewSpinner />
  if (error || !content) return <PreviewError message={fallback || 'No se pudo cargar la vista previa del archivo.'} />

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 font-mono">{content.totalLines} líneas</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono uppercase">{language}</span>
        </div>
        <div className="flex items-center gap-2">
          {content.truncated && !editMode && (
            <span className="text-[10px] text-[var(--c-accent)] opacity-60">Mostrando primeras 200 líneas</span>
          )}
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)}
              className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-[var(--c-primary)] hover:border-[var(--c-primary)]/30 transition-all">
              Editar
            </button>
          )}
          {editMode && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => setEditMode(false)} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-white/60 transition-all">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                className="text-[10px] px-2.5 py-1 rounded-lg text-white font-medium disabled:opacity-40 hover:brightness-110 transition-all"
                style={{ background: 'var(--c-primary)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </div>
      </div>
      {editMode ? (
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          className="w-full h-80 p-4 text-xs font-mono text-white/80 bg-transparent resize-none outline-none leading-relaxed"
          spellCheck={false}
        />
      ) : (
        <div className="overflow-auto max-h-80 p-4">
          <pre
            className="text-xs font-mono whitespace-pre-wrap leading-relaxed text-white/70 [&_.code-keyword]:text-[var(--c-primary)] [&_.code-keyword]:font-semibold [&_.code-string]:text-emerald-400 [&_.code-comment]:text-white/25 [&_.code-comment]:italic [&_.code-number]:text-[var(--c-accent)]"
            dangerouslySetInnerHTML={{ __html: highlighted }}
          />
        </div>
      )}
    </div>
  )
}

/* ── Dataset Preview (CSV/TSV) ─────────────────────────────────── */
function DatasetPreview({ url, fileName }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const delimiter = useMemo(() => {
    return (fileName || '').toLowerCase().endsWith('.tsv') ? '\t' : ','
  }, [fileName])

  useEffect(() => {
    if (!url) { setLoading(false); return }
    setLoading(true)
    setError(false)

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error('fetch failed')
        return res.text()
      })
      .then(text => {
        const lines = text.split('\n').filter(l => l.trim())
        const totalRows = lines.length - 1 // minus header
        const previewLines = lines.slice(0, 21) // header + 20 rows

        const parsed = previewLines.map(line => {
          // Simple CSV parse (handles basic quoting)
          const result = []
          let current = ''
          let inQuotes = false
          for (let i = 0; i < line.length; i++) {
            const ch = line[i]
            if (ch === '"') {
              inQuotes = !inQuotes
            } else if (ch === delimiter && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += ch
            }
          }
          result.push(current.trim())
          return result
        })

        const headers = parsed[0] || []
        const rows = parsed.slice(1)

        setData({ headers, rows, totalRows, totalCols: headers.length, truncated: totalRows > 20 })
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url, delimiter])

  if (loading) return <PreviewSpinner />
  if (error || !data) return <PreviewError message="No se pudo cargar el dataset." />

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      {/* Stats bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
            <FiTable size={10} />
            {data.totalRows.toLocaleString()} filas
          </span>
          <span className="text-[10px] text-white/30 font-mono">
            {data.totalCols} columnas
          </span>
        </div>
        {data.truncated && (
          <span className="text-[10px] text-[var(--c-accent)] opacity-60">Mostrando primeras 20 filas</span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-96">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="bg-[var(--c-surface-2)]">
              <th className="px-3 py-2 text-left text-[10px] text-white/25 font-medium border-b border-white/[0.06] w-8">#</th>
              {data.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left text-[10px] text-[var(--c-primary)] font-semibold border-b border-white/[0.06] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.04] ${ri % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'}`}
              >
                <td className="px-3 py-1.5 text-white/20">{ri + 1}</td>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-white/60 max-w-48 truncate" title={cell}>
                    {cell || <span className="text-white/15 italic">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ── Download-only placeholder ─────────────────────────────────── */
function DownloadOnlyPreview({ icon: Icon, iconColor, iconBg, borderColor, title, subtitle, onDownload }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 rounded-xl bg-black/20 border border-white/[0.06]">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: iconBg, border: `1px solid ${borderColor}` }}>
        <Icon size={24} style={{ color: iconColor, opacity: 0.8 }} />
      </div>
      <div className="text-center">
        <p className="text-sm text-white/50 mb-1">{title}</p>
        <p className="text-xs text-white/25">{subtitle}</p>
      </div>
      <button
        onClick={onDownload}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--c-primary)] text-white text-sm font-medium hover:brightness-110 transition-all"
      >
        <FiDownload size={15} />
        Descargar archivo
      </button>
    </div>
  )
}

function ExcelPreview({ onDownload }) {
  return <DownloadOnlyPreview icon={FiTable} iconColor="#22c55e" iconBg="rgba(34,197,94,0.1)" borderColor="rgba(34,197,94,0.2)" title="Vista previa no disponible para archivos Excel." subtitle="Descarga para ver el contenido completo." onDownload={onDownload} />
}

function WordPreview({ onDownload }) {
  return <DownloadOnlyPreview icon={TbFileWord} iconColor="#3B82F6" iconBg="rgba(59,130,246,0.1)" borderColor="rgba(59,130,246,0.2)" title="Vista previa no disponible para documentos Word." subtitle="Descarga para ver el contenido completo." onDownload={onDownload} />
}

function PresentationPreview({ onDownload }) {
  return <DownloadOnlyPreview icon={TbPresentation} iconColor="#F59E0B" iconBg="rgba(245,158,11,0.1)" borderColor="rgba(245,158,11,0.2)" title="Vista previa no disponible para presentaciones." subtitle="Descarga para ver las diapositivas." onDownload={onDownload} />
}

function ArchivePreview({ onDownload }) {
  return <DownloadOnlyPreview icon={TbFileZip} iconColor="#8B5CF6" iconBg="rgba(139,92,246,0.1)" borderColor="rgba(139,92,246,0.2)" title="Vista previa no disponible para archivos comprimidos." subtitle="Descarga y descomprime para ver el contenido." onDownload={onDownload} />
}

function ModelPreview({ onDownload }) {
  return <DownloadOnlyPreview icon={FiPackage} iconColor="#00D1FF" iconBg="rgba(0,209,255,0.1)" borderColor="rgba(0,209,255,0.2)" title="Vista previa no disponible para modelos 3D." subtitle="Descarga para abrirlo en tu visualizador 3D." onDownload={onDownload} />
}

function FontPreview({ file, onDownload }) {
  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      <div className="px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] text-white/30 font-mono uppercase">Fuente tipográfica</span>
      </div>
      <style>{`@font-face { font-family: "PreviewFont"; src: url("${file.url}"); }`}</style>
      <div className="p-6 space-y-4">
        {['Aa Bb Cc Dd Ee Ff Gg', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz', '0123456789 !@#$%^&*()', 'El semillero DivergencIA investiga inteligencia artificial'].map((sample, i) => (
          <p key={i} className="text-white/70" style={{ fontFamily: '"PreviewFont", sans-serif', fontSize: [32, 14, 14, 14, 18][i] }}>
            {sample}
          </p>
        ))}
      </div>
    </div>
  )
}

/* ── Plain Text Preview ────────────────────────────────────────── */
function TextPreview({ url, fileName, canEdit, onSaveContent }) {
  const [content, setContent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!url) { setLoading(false); return }
    setLoading(true); setError(false); setEditMode(false)
    fetch(url).then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => { setContent(text); setEditText(text) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  const handleSave = async () => {
    setSaving(true)
    await onSaveContent?.(editText)
    setContent(editText)
    setEditMode(false)
    setSaving(false)
  }

  if (loading) return <PreviewSpinner />
  if (error || content === null) return <PreviewError message="No se pudo cargar el archivo de texto." />

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] text-white/30 font-mono">{content.split('\n').length} líneas · {formatBytes(new Blob([content]).size)}</span>
        <div className="flex items-center gap-1.5">
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-[var(--c-primary)] hover:border-[var(--c-primary)]/30 transition-all">Editar</button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-white/60 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="text-[10px] px-2.5 py-1 rounded-lg text-white font-medium disabled:opacity-40 hover:brightness-110 transition-all" style={{ background: 'var(--c-primary)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
      {editMode
        ? <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full h-80 p-4 text-xs font-mono text-white/80 bg-transparent resize-none outline-none leading-relaxed" spellCheck={false} />
        : <pre className="overflow-auto max-h-80 p-4 text-xs font-mono whitespace-pre-wrap leading-relaxed text-white/65">{content.length > 20000 ? content.slice(0, 20000) + '\n\n[Archivo truncado — descarga para ver el resto]' : content}</pre>
      }
    </div>
  )
}

/* ── Markdown Preview ──────────────────────────────────────────── */
function mdToHtml(md) {
  return md
    // Code blocks first (```lang\n...\n```)
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre class="md-code-block"><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`)
    // Headings
    .replace(/^#{6}\s+(.+)$/gm, '<h6 class="md-h6">$1</h6>')
    .replace(/^#{5}\s+(.+)$/gm, '<h5 class="md-h5">$1</h5>')
    .replace(/^#{4}\s+(.+)$/gm, '<h4 class="md-h4">$1</h4>')
    .replace(/^#{3}\s+(.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^#{2}\s+(.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^#{1}\s+(.+)$/gm, '<h1 class="md-h1">$1</h1>')
    // Blockquotes
    .replace(/^>\s+(.+)$/gm, '<blockquote class="md-quote">$1</blockquote>')
    // HR
    .replace(/^(-{3,}|\*{3,}|_{3,})$/gm, '<hr class="md-hr" />')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="md-img" />')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="md-link" target="_blank" rel="noopener">$1</a>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    // Unordered lists
    .replace(/^[\-\*]\s+(.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li class="md-li">.*<\/li>\n?)+/g, m => `<ul class="md-ul">${m}</ul>`)
    // Ordered lists
    .replace(/^\d+\.\s+(.+)$/gm, '<li class="md-oli">$1</li>')
    .replace(/(<li class="md-oli">.*<\/li>\n?)+/g, m => `<ol class="md-ol">${m}</ol>`)
    // Paragraphs
    .replace(/^(?!<[hbuoilp]|<blockquote|<pre|<hr)(.+)$/gm, '<p class="md-p">$1</p>')
    // Clean up blank lines
    .replace(/\n{3,}/g, '\n\n')
}

function MarkdownPreview({ url, canEdit, onSaveContent }) {
  const [raw, setRaw] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!url) { setLoading(false); return }
    setLoading(true); setError(false); setEditMode(false)
    fetch(url).then(r => { if (!r.ok) throw new Error(); return r.text() })
      .then(text => { setRaw(text); setEditText(text) })
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  const html = useMemo(() => raw ? mdToHtml(raw) : '', [raw])

  const handleSave = async () => {
    setSaving(true)
    await onSaveContent?.(editText)
    setRaw(editText)
    setEditMode(false)
    setSaving(false)
  }

  if (loading) return <PreviewSpinner />
  if (error || raw === null) return <PreviewError message="No se pudo cargar el documento Markdown." />

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 font-mono uppercase">Markdown</span>
        <div className="flex items-center gap-1.5">
          {canEdit && !editMode && (
            <button onClick={() => setEditMode(true)} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-[var(--c-primary)] hover:border-[var(--c-primary)]/30 transition-all">Editar</button>
          )}
          {editMode && (
            <>
              <button onClick={() => setEditMode(false)} className="text-[10px] px-2.5 py-1 rounded-lg border border-white/10 text-white/40 hover:text-white/60 transition-all">Cancelar</button>
              <button onClick={handleSave} disabled={saving} className="text-[10px] px-2.5 py-1 rounded-lg text-white font-medium disabled:opacity-40 hover:brightness-110 transition-all" style={{ background: 'var(--c-primary)' }}>
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          )}
        </div>
      </div>
      {editMode
        ? <textarea value={editText} onChange={e => setEditText(e.target.value)} className="w-full h-80 p-4 text-xs font-mono text-white/80 bg-transparent resize-none outline-none leading-relaxed" spellCheck={false} />
        : (
          <div className="overflow-auto max-h-[500px] p-5 prose-md"
            dangerouslySetInnerHTML={{ __html: html }}
            style={{ color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, fontSize: 14 }}
          />
        )
      }
      <style>{`
        .md-h1{font-size:1.6em;font-weight:700;color:#fff;margin:1em 0 .4em;border-bottom:1px solid rgba(255,255,255,.1);padding-bottom:.3em}
        .md-h2{font-size:1.3em;font-weight:700;color:#fff;margin:.8em 0 .4em;border-bottom:1px solid rgba(255,255,255,.06);padding-bottom:.2em}
        .md-h3{font-size:1.1em;font-weight:600;color:rgba(255,255,255,.9);margin:.7em 0 .3em}
        .md-h4,.md-h5,.md-h6{font-size:1em;font-weight:600;color:rgba(255,255,255,.8);margin:.6em 0 .2em}
        .md-p{margin:.5em 0}
        .md-quote{border-left:3px solid rgba(252,101,31,.5);padding:.3em .8em;color:rgba(255,255,255,.4);font-style:italic;margin:.5em 0}
        .md-hr{border:none;border-top:1px solid rgba(255,255,255,.1);margin:1em 0}
        .md-code-block{background:rgba(0,0,0,.5);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:12px;overflow-x:auto;font-size:12px;font-family:monospace;color:rgba(255,255,255,.7);margin:.5em 0}
        .md-inline-code{background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px;font-family:monospace;font-size:12px;color:#FC651F}
        .md-link{color:#00D1FF;text-decoration:none}.md-link:hover{text-decoration:underline}
        .md-ul,.md-ol{padding-left:1.5em;margin:.4em 0}
        .md-li,.md-oli{margin:.2em 0;list-style:disc}.md-oli{list-style:decimal}
        .md-img{max-width:100%;border-radius:8px;margin:.5em 0}
      `}</style>
    </div>
  )
}

/* ── Jupyter Notebook Preview ──────────────────────────────────── */
function NotebookPreview({ url, onDownload }) {
  const [nb, setNb] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) { setLoading(false); return }
    setLoading(true); setError(false)
    fetch(url).then(r => { if (!r.ok) throw new Error(); return r.json() })
      .then(data => setNb(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [url])

  if (loading) return <PreviewSpinner />
  if (error || !nb) return <PreviewError message="No se pudo cargar el notebook." />

  const cells = (nb.cells || []).slice(0, 30)
  const kernelName = nb.metadata?.kernelspec?.display_name || nb.metadata?.language_info?.name || 'Python'
  const nbFormat = `${nb.nbformat || 4}.${nb.nbformat_minor || 0}`

  const getCellOutput = (cell) => {
    if (!cell.outputs?.length) return null
    return cell.outputs.map((out, i) => {
      if (out.output_type === 'stream') {
        return <pre key={i} className="text-[10px] font-mono text-emerald-400/70 whitespace-pre-wrap mt-1 px-2">{(out.text || []).join('')}</pre>
      }
      if (out.output_type === 'error') {
        return <pre key={i} className="text-[10px] font-mono text-red-400/70 whitespace-pre-wrap mt-1 px-2">{out.ename}: {out.evalue}</pre>
      }
      if (out.data?.['text/plain']) {
        return <pre key={i} className="text-[10px] font-mono text-white/40 whitespace-pre-wrap mt-1 px-2">{(out.data['text/plain'] || []).join('').slice(0, 500)}</pre>
      }
      if (out.data?.['image/png']) {
        return <img key={i} src={`data:image/png;base64,${out.data['image/png']}`} alt="output" className="max-w-full rounded mt-1" />
      }
      return null
    })
  }

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/30 font-mono">{cells.length} celdas{cells.length < (nb.cells?.length || 0) ? ` (de ${nb.cells?.length})` : ''}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--c-primary)]/10 text-[var(--c-primary)] font-mono">{kernelName}</span>
          <span className="text-[10px] text-white/20 font-mono">v{nbFormat}</span>
        </div>
        <button onClick={onDownload} className="text-[10px] text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
          <FiDownload size={10} /> Descargar .ipynb
        </button>
      </div>

      {/* Cells */}
      <div className="overflow-auto max-h-[520px] divide-y divide-white/[0.04]">
        {cells.map((cell, i) => {
          const src = Array.isArray(cell.source) ? cell.source.join('') : (cell.source || '')
          const isCode = cell.cell_type === 'code'
          const isMd = cell.cell_type === 'markdown'
          const execCount = cell.execution_count
          return (
            <div key={i} className={`px-4 py-3 ${isCode ? '' : 'bg-white/[0.015]'}`}>
              <div className="flex gap-3">
                {/* Gutter */}
                <div className="shrink-0 w-10 text-right">
                  {isCode && (
                    <span className="text-[10px] font-mono text-white/20">{execCount != null ? `[${execCount}]` : '[ ]'}</span>
                  )}
                  {isMd && <span className="text-[10px] text-[var(--c-secondary)]/40 font-bold">M</span>}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isCode
                    ? <pre className="text-[11px] font-mono whitespace-pre-wrap text-white/70 leading-relaxed">{src.slice(0, 2000)}{src.length > 2000 ? '\n...' : ''}</pre>
                    : <div className="text-xs text-white/60 leading-relaxed whitespace-pre-wrap">{src.slice(0, 1000)}</div>
                  }
                  {/* Outputs */}
                  {getCellOutput(cell)}
                </div>
              </div>
            </div>
          )
        })}
        {(nb.cells?.length || 0) > 30 && (
          <div className="px-4 py-3 text-center text-[11px] text-white/25">
            Mostrando 30 de {nb.cells.length} celdas · Descarga para ver el notebook completo
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Video Preview ─────────────────────────────────────────────── */
function VideoPreview({ url, fileName }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (error) {
    return <PreviewError message="No se pudo cargar el video. Intenta descargar el archivo." />
  }

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden">
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-[var(--c-accent)] rounded-full animate-spin" />
            <span className="text-xs text-white/30">Cargando video...</span>
          </div>
        </div>
      )}
      <video
        src={url}
        controls
        preload="metadata"
        className={`w-full max-h-96 rounded-xl bg-black ${loading ? 'hidden' : 'block'}`}
        onLoadedData={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true) }}
      >
        <p className="text-sm text-white/40 p-4">Tu navegador no soporta la reproduccion de este video.</p>
      </video>
    </div>
  )
}

/* ── Audio Preview ─────────────────────────────────────────────── */
function AudioPreview({ url, fileName }) {
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(true)

  if (error) {
    return <PreviewError message="No se pudo cargar el audio. Intenta descargar el archivo." />
  }

  return (
    <div className="rounded-xl bg-black/40 border border-white/[0.08] overflow-hidden p-6">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--c-primary)]/10 border border-[var(--c-primary)]/20 flex items-center justify-center">
          <FiMusic size={28} className="text-[var(--c-primary)] opacity-70" />
        </div>
        <p className="text-sm text-white/50 truncate max-w-full">{fileName}</p>
        {loading && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white/20 border-t-[var(--c-accent)] rounded-full animate-spin" />
            <span className="text-xs text-white/30">Cargando audio...</span>
          </div>
        )}
        <audio
          src={url}
          controls
          preload="metadata"
          className={`w-full max-w-md ${loading ? 'opacity-0 h-0' : 'opacity-100'} transition-opacity`}
          onLoadedData={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true) }}
        />
      </div>
    </div>
  )
}

/* ── Preview Area ─────────────────────────────────────────────── */
function ImagePreviewArea({ file, onImageClick, onDownload }) {
  const [imgError, setImgError] = useState(false)

  if (imgError) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-black/20 border border-white/[0.06]">
        <FiImage size={36} className="text-white/15" />
        <p className="text-sm text-white/30">No se pudo cargar la imagen</p>
        <button onClick={onDownload} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-all"
          style={{ background: 'var(--c-primary)' }}>
          <FiDownload size={14} /> Descargar imagen
        </button>
      </div>
    )
  }

  return (
    <div className="relative group">
      <div className="flex items-center justify-center rounded-xl overflow-hidden bg-black/30 max-h-80">
        <img
          src={file.url}
          alt={file.nombre}
          className="max-w-full max-h-80 object-contain rounded-xl cursor-pointer transition-opacity hover:opacity-90"
          onClick={onImageClick}
          onError={() => setImgError(true)}
        />
      </div>
      <button
        onClick={onImageClick}
        className="absolute top-2 right-2 p-2 rounded-lg bg-black/50 text-white/60 hover:text-white hover:bg-black/70 transition-all opacity-0 group-hover:opacity-100"
        title="Ver en pantalla completa"
      >
        <FiMaximize2 size={14} />
      </button>
    </div>
  )
}

function PreviewArea({ file, category, onImageClick, onDownload, canEdit, onSaveContent }) {
  switch (category) {
    case 'image':
      return <ImagePreviewArea file={file} onImageClick={onImageClick} onDownload={onDownload} />

    case 'pdf':
      return (
        <div className="flex flex-col gap-3">
          <iframe
            src={file.url}
            title={file.nombre}
            className="w-full h-96 rounded-xl border border-white/[0.08] bg-black/30"
          />
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--c-accent)] hover:underline"
          >
            <FiExternalLink size={13} />
            Abrir en nueva pestaña
          </a>
        </div>
      )

    case 'code':
      return <CodePreview url={file.url} fallback={file.descripcion} fileName={file.nombre} canEdit={canEdit} onSaveContent={onSaveContent} />

    case 'dataset':
      return <DatasetPreview url={file.url} fileName={file.nombre} />

    case 'excel':
      return <ExcelPreview onDownload={onDownload} />

    case 'word':
      return <WordPreview onDownload={onDownload} />

    case 'presentation':
      return <PresentationPreview onDownload={onDownload} />

    case 'archive':
      return <ArchivePreview onDownload={onDownload} />

    case 'video':
      return <VideoPreview url={file.url} fileName={file.nombre} />

    case 'audio':
      return <AudioPreview url={file.url} fileName={file.nombre} />

    case 'text':
      return <TextPreview url={file.url} fileName={file.nombre} canEdit={canEdit} onSaveContent={onSaveContent} />

    case 'markdown':
      return <MarkdownPreview url={file.url} canEdit={canEdit} onSaveContent={onSaveContent} />

    case 'notebook':
      return <NotebookPreview url={file.url} onDownload={onDownload} />

    case 'model':
      return <ModelPreview onDownload={onDownload} />

    case 'font':
      return <FontPreview file={file} onDownload={onDownload} />

    default:
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl bg-black/20 border border-white/[0.06]">
          <FiFile size={40} className="text-white/15" />
          <p className="text-sm text-white/30">Vista previa no disponible</p>
          <p className="text-xs text-white/15">Descarga el archivo para verlo</p>
        </div>
      )
  }
}

const CATEGORY_ICONS = {
  image: FiImage,
  pdf: FiFile,
  code: FiCode,
  text: FiFile,
  markdown: FiCode,
  notebook: FiCode,
  dataset: FiDatabase,
  excel: FiTable,
  word: TbFileWord,
  presentation: TbPresentation,
  archive: TbFileZip,
  model: FiPackage,
  font: FiFile,
  video: FiPlay,
  audio: FiMusic,
  other: FiFile,
}

const VISIBILIDAD_OPTIONS = [
  { value: 'todos',          label: 'Todos',          icon: FiGlobe,  desc: 'Cualquier persona con acceso al sistema' },
  { value: 'miembros',       label: 'Todos los miembros', icon: FiUsers, desc: 'Todos los miembros del semillero' },
  { value: 'seleccionados',  label: 'Miembros específicos', icon: FiUsers, desc: 'Solo los miembros que elijas' },
  { value: 'fundadores',     label: 'Fundadores',     icon: FiStar,   desc: 'Solo miembros fundadores' },
  { value: 'privado',        label: 'Privado',        icon: FiLock,   desc: 'Solo tú y los admins' },
]

function VisibilidadPanel({ file, onUpdate }) {
  const [selected, setSelected] = useState(file.visibilidad || 'miembros')
  const [selectedIds, setSelectedIds] = useState(() => new Set(file.visibilidad_usuarios || []))
  const [allMembers, setAllMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load all members when 'seleccionados' is chosen
  useEffect(() => {
    if (selected !== 'seleccionados') return
    if (allMembers.length > 0) return
    setLoadingMembers(true)
    supabase
      .from('usuarios')
      .select('id, nombre, area_investigacion')
      .eq('activo', true)
      .order('nombre', { ascending: true })
      .limit(50)
      .then(({ data }) => { setAllMembers(data || []); setLoadingMembers(false) })
  }, [selected])

  const toggleUser = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return allMembers
    const q = memberSearch.toLowerCase()
    return allMembers.filter(u => u.nombre?.toLowerCase().includes(q) || u.area_investigacion?.toLowerCase().includes(q))
  }, [allMembers, memberSearch])

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(file.id, selected, selected === 'seleccionados' ? [...selectedIds] : [])
    setSaving(false)
  }

  const origIds = (file.visibilidad_usuarios || []).slice().sort().join(',')
  const currIds = [...selectedIds].sort().join(',')
  const changed = selected !== (file.visibilidad || 'miembros') ||
    (selected === 'seleccionados' && currIds !== origIds)

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FiShield size={13} className="text-white/30" />
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">Visibilidad del archivo</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
        {VISIBILIDAD_OPTIONS.map(opt => {
          const Icon = opt.icon
          const active = selected === opt.value
          return (
            <button key={opt.value} onClick={() => setSelected(opt.value)}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg border text-xs transition-all text-left ${
                active
                  ? 'border-[var(--c-primary)]/30 bg-[var(--c-primary)]/10 text-[var(--c-primary)]'
                  : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/60'
              }`}>
              <Icon size={11} />
              <span className="font-medium truncate">{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Member picker for 'seleccionados' */}
      {selected === 'seleccionados' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-white/30">
              {selectedIds.size > 0 ? `${selectedIds.size} seleccionado${selectedIds.size > 1 ? 's' : ''}` : 'Selecciona quién puede ver este archivo'}
            </p>
            {selectedIds.size > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-red-400/60 hover:text-red-400 transition-colors">
                Limpiar selección
              </button>
            )}
          </div>
          <input
            type="text"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="Filtrar miembros..."
            className="w-full text-xs rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/70 placeholder-white/25 outline-none focus:border-[var(--c-primary)]/40"
          />
          {loadingMembers ? (
            <p className="text-[10px] text-white/25 text-center py-2">Cargando miembros...</p>
          ) : (
            <div className="space-y-0.5 max-h-48 overflow-y-auto rounded-lg border border-white/[0.06] bg-black/20">
              {filteredMembers.length === 0 ? (
                <p className="text-[10px] text-white/25 text-center py-3">Sin resultados</p>
              ) : filteredMembers.map(u => {
                const isSelected = selectedIds.has(u.id)
                return (
                  <button key={u.id} onClick={() => toggleUser(u.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      isSelected ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'hover:bg-white/[0.04] text-white/50'
                    }`}>
                    {isSelected
                      ? <FiCheckSquare size={13} className="shrink-0" />
                      : <FiSquare size={13} className="shrink-0 text-white/20" />
                    }
                    <span className="flex-1 text-left font-medium">{u.nombre}</span>
                    {u.area_investigacion && <span className="text-[10px] text-white/25 shrink-0">{u.area_investigacion}</span>}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/20">{VISIBILIDAD_OPTIONS.find(o => o.value === selected)?.desc}</p>
        {changed && (
          <button onClick={handleSave} disabled={saving}
            className="text-[11px] px-3 py-1 rounded-lg font-medium transition-all disabled:opacity-50"
            style={{ background: 'var(--c-primary)', color: '#fff' }}>
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function FilePreview({ file, open, onClose, isFavorite, onToggleFavorite, canManage, onUpdateVisibilidad, onUpdateContent }) {
  const [lightbox, setLightbox] = useState(false)

  if (!file) return null

  const category = getFileCategory(file.tipo, file.nombre)
  const Icon = CATEGORY_ICONS[category]
  const fileTags = file.tags || []

  const handleDownload = () => {
    // Force download via anchor with download attribute
    const a = document.createElement('a')
    a.href = file.url
    a.download = file.nombre || 'archivo'
    a.target = '_blank'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('Descargando...')
  }

  const handleCopyLink = () => {
    const platformUrl = `${window.location.origin}/library?file=${file.id}`
    const doCopy = () => {
      const el = document.createElement('textarea')
      el.value = platformUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      toast.success('Enlace copiado')
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(platformUrl).then(() => toast.success('Enlace copiado')).catch(doCopy)
    } else {
      doCopy()
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={
          <span className="flex items-center gap-2">
            <Icon size={16} className="text-[var(--c-primary)]" />
            <span className="truncate">{file.nombre}</span>
          </span>
        }
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(file.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all"
                style={isFavorite
                  ? { borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)', color: '#F59E0B' }
                  : { borderColor: 'rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
              >
                <FiStar size={14} fill={isFavorite ? 'currentColor' : 'none'} />
                {isFavorite ? 'Favorito' : 'Añadir a favoritos'}
              </button>
            )}
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-[var(--c-accent)] hover:border-[var(--c-accent)]/30 text-sm transition-all"
            >
              <FiLink size={14} /> Copiar enlace
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium hover:brightness-110 transition-all ml-auto"
              style={{ background: 'var(--c-primary)' }}
            >
              <FiDownload size={15} /> Descargar
            </button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          {/* Preview */}
          <PreviewArea
            file={file}
            category={category}
            onImageClick={() => setLightbox(true)}
            onDownload={handleDownload}
            canEdit={canManage}
            onSaveContent={onUpdateContent ? (text) => onUpdateContent(file.id, file.url, text) : undefined}
          />

          {/* Description */}
          {file.descripcion && category !== 'code' && (
            <p className="text-sm text-white/50 leading-relaxed">{file.descripcion}</p>
          )}

          {/* Metadata */}
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2">
            <MetaRow icon={FiFile} label="Nombre" value={file.nombre} />
            <MetaRow icon={FiTag} label="Tipo" value={file.tipo} />
            <MetaRow icon={FiHardDrive} label="Tamaño" value={file.tamanio_bytes ? formatBytes(file.tamanio_bytes) : null} />
            <MetaRow icon={FiCalendar} label="Subido" value={formatDate(file.fecha_subida || file.created_at)} />
            <MetaRow icon={FiUser} label="Autor" value={file.subido?.nombre || null} />
            {file.descargas != null && (
              <MetaRow icon={FiDownload} label="Descargas" value={`${file.descargas}`} />
            )}
          </div>

          {/* Tags */}
          {fileTags.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Etiquetas</p>
              <div className="flex flex-wrap gap-1.5">
                {fileTags.map(t => (
                  <span key={t} className="text-[11px] px-2 py-1 rounded-full bg-white/[0.05] text-white/40 border border-white/[0.06]">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Visibility control */}
          {canManage && onUpdateVisibilidad && (
            <VisibilidadPanel file={file} onUpdate={onUpdateVisibilidad} />
          )}

          {/* Comments */}
          <div className="border-t border-white/[0.06] pt-4">
            <p className="text-[10px] uppercase tracking-wider text-white/25 mb-3">Comentarios</p>
            <CommentSection archivoId={file.id} maxHeight={220} />
          </div>

          {/* Version History */}
          <VersionHistory fileId={file.id} fileName={file.nombre} />
        </div>
      </Modal>

      {category === 'image' && (
        <ImageLightbox
          src={file.url}
          alt={file.nombre}
          open={lightbox}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  )
}
