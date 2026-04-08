import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiImage,
  FiEye, FiEyeOff, FiStar, FiTag, FiCalendar, FiUpload,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Spinner from '../ui/Spinner'
import { toast } from 'sonner'

const TIPOS = ['evento', 'reunion', 'logro', 'taller', 'conferencia', 'otro']
const TIPO_COLORS = {
  evento: '#FC651F',
  reunion: '#8B5CF6',
  logro: '#F59E0B',
  taller: '#00D1FF',
  conferencia: '#22c55e',
  otro: '#6b7280',
}

const EMPTY_FORM = {
  titulo: '',
  descripcion: '',
  contenido: '',
  imagen_url: '',
  tipo: 'evento',
  tags: [],
  fecha_evento: '',
  publicado: false,
  destacado: false,
}

function TagInput({ tags, onChange }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const t = input.trim().toLowerCase()
    if (t && !tags.includes(t)) {
      onChange([...tags, t])
    }
    setInput('')
  }

  const removeTag = (tag) => onChange(tags.filter(t => t !== tag))

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder="Agregar tag..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40"
        />
        <Button variant="ghost" size="xs" onClick={addTag} className="gap-1">
          <FiPlus size={11} /> Add
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/[0.06] text-white/60">
              <FiTag size={9} />
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors ml-0.5">
                <FiX size={9} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function ImageUploader({ value, onChange }) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef()

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return }
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5 MB por imagen'); return }
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `galeria/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
    const { error: upErr } = await supabase.storage.from('archivos').upload(path, file, { upsert: false })
    if (upErr) { toast.error('Error al subir imagen'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('archivos').getPublicUrl(path)
    onChange(publicUrl)
    setUploading(false)
    toast.success('Imagen subida')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="URL de imagen o sube una..."
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 transition-all flex items-center gap-1.5 text-xs"
        >
          {uploading ? <Spinner size="xs" /> : <FiUpload size={12} />}
          Subir
        </button>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      {value && (
        <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/[0.08]">
          <img src={value} alt="preview" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white/70 hover:text-red-400 transition-colors"
          >
            <FiX size={11} />
          </button>
        </div>
      )}
    </div>
  )
}

function GaleriaForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors'
  const labelClass = 'block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.titulo.trim()) { toast.error('El título es obligatorio'); return }
    setSaving(true)
    const payload = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || null,
      contenido: form.contenido.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      tipo: form.tipo,
      tags: form.tags.length ? form.tags : null,
      fecha_evento: form.fecha_evento || null,
      publicado: form.publicado,
      destacado: form.destacado,
      updated_at: new Date().toISOString(),
    }
    let error
    if (initial?.id) {
      ;({ error } = await supabase.from('galeria_eventos').update(payload).eq('id', initial.id))
    } else {
      ;({ error } = await supabase.from('galeria_eventos').insert({ ...payload, creado_por: user?.id }))
    }
    setSaving(false)
    if (error) { toast.error('Error al guardar'); return }
    toast.success(initial?.id ? 'Entrada actualizada' : 'Entrada creada')
    onSave()
  }

  return (
    <Card className="!p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Título *</label>
          <input className={inputClass} value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Título de la entrada" required />
        </div>

        <div>
          <label className={labelClass}>Descripción corta</label>
          <input className={inputClass} value={form.descripcion} onChange={e => set('descripcion', e.target.value)} placeholder="Resumen visible en la card" />
        </div>

        <div>
          <label className={labelClass}>Contenido (markdown)</label>
          <textarea
            className={`${inputClass} resize-none font-mono text-xs leading-relaxed`}
            value={form.contenido}
            onChange={e => set('contenido', e.target.value)}
            placeholder="# Título&#10;&#10;Contenido completo en markdown..."
            rows={8}
          />
        </div>

        <div>
          <label className={labelClass}>Imagen principal</label>
          <ImageUploader value={form.imagen_url} onChange={val => set('imagen_url', val)} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Tipo</label>
            <select className={inputClass} value={form.tipo} onChange={e => set('tipo', e.target.value)}>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha del evento</label>
            <input type="date" className={inputClass} value={form.fecha_evento} onChange={e => set('fecha_evento', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Tags</label>
          <TagInput tags={form.tags} onChange={val => set('tags', val)} />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.publicado}
              onChange={e => set('publicado', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-[#22c55e]"
            />
            <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors flex items-center gap-1">
              <FiEye size={12} className="text-[#22c55e]" /> Publicado
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={form.destacado}
              onChange={e => set('destacado', e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-[#F59E0B]"
            />
            <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors flex items-center gap-1">
              <FiStar size={12} className="text-[#F59E0B]" /> Destacado
            </span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-white/[0.06]">
          <Button variant="ghost" size="sm" type="button" onClick={onCancel}>Cancelar</Button>
          <Button variant="solid" size="sm" type="submit" className="gap-1.5" disabled={saving}>
            {saving ? <Spinner size="xs" /> : <FiCheck size={13} />}
            {initial?.id ? 'Guardar cambios' : 'Crear entrada'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

export default function GaleriaManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [mode, setMode] = useState('list') // 'list' | 'create' | 'edit'
  const [editing, setEditing] = useState(null)

  const fetch = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('galeria_eventos')
      .select('*')
      .order('created_at', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [])

  const handleDelete = async (id) => {
    const { error } = await supabase.from('galeria_eventos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return }
    setItems(prev => prev.filter(i => i.id !== id))
    toast.success('Entrada eliminada')
  }

  const handleTogglePublish = async (item) => {
    const { error } = await supabase
      .from('galeria_eventos')
      .update({ publicado: !item.publicado, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error'); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, publicado: !i.publicado } : i))
  }

  const handleToggleFeatured = async (item) => {
    const { error } = await supabase
      .from('galeria_eventos')
      .update({ destacado: !item.destacado, updated_at: new Date().toISOString() })
      .eq('id', item.id)
    if (error) { toast.error('Error'); return }
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, destacado: !i.destacado } : i))
  }

  const handleSave = async () => {
    setMode('list')
    setEditing(null)
    await fetch()
  }

  if (loading && mode === 'list') {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    )
  }

  if (mode === 'create') {
    return <GaleriaForm onSave={handleSave} onCancel={() => setMode('list')} />
  }

  if (mode === 'edit' && editing) {
    return <GaleriaForm initial={editing} onSave={handleSave} onCancel={() => { setMode('list'); setEditing(null) }} />
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/40">
            {items.length} entradas · {items.filter(i => i.publicado).length} publicadas · {items.filter(i => i.destacado).length} destacadas
          </p>
        </div>
        <Button variant="solid" size="xs" className="gap-1.5" onClick={() => setMode('create')}>
          <FiPlus size={12} /> Nueva entrada
        </Button>
      </div>

      {/* List */}
      {items.length === 0 ? (
        <Card className="text-center py-16">
          <FiImage size={32} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">Sin entradas de galería todavía</p>
          <p className="text-white/20 text-xs mt-1">Crea la primera para que aparezca en el Landing</p>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {items.map((item, i) => {
              const color = TIPO_COLORS[item.tipo] || '#6b7280'
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <Card className="flex gap-4 items-center !py-3">
                    {/* Thumbnail */}
                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 flex items-center justify-center" style={{ background: `${color}15` }}>
                      {item.imagen_url ? (
                        <img src={item.imagen_url} alt={item.titulo} className="w-full h-full object-cover" />
                      ) : (
                        <FiImage size={18} style={{ color: `${color}60` }} />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-white/80 truncate">{item.titulo}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0" style={{ background: `${color}15`, color }}>
                          {item.tipo}
                        </span>
                        {item.destacado && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 bg-[#F59E0B]/15 text-[#F59E0B]">
                            ⭐ Destacado
                          </span>
                        )}
                        {!item.publicado && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 bg-white/[0.05] text-white/30">
                            Borrador
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {item.descripcion && (
                          <p className="text-[10px] text-white/30 truncate flex-1">{item.descripcion}</p>
                        )}
                        {item.fecha_evento && (
                          <span className="text-[10px] text-white/25 shrink-0 flex items-center gap-1">
                            <FiCalendar size={9} />
                            {new Date(item.fecha_evento + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      {item.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {item.tags.slice(0, 4).map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/30">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleToggleFeatured(item)}
                        title={item.destacado ? 'Quitar destacado' : 'Marcar como destacado'}
                        className="p-1.5 rounded transition-all"
                        style={item.destacado
                          ? { color: '#F59E0B', background: 'rgba(245,158,11,0.12)' }
                          : { color: 'rgba(255,255,255,0.2)' }}
                      >
                        <FiStar size={13} />
                      </button>
                      <button
                        onClick={() => handleTogglePublish(item)}
                        title={item.publicado ? 'Despublicar' : 'Publicar'}
                        className="p-1.5 rounded transition-all"
                        style={item.publicado
                          ? { color: '#22c55e', background: 'rgba(34,197,94,0.12)' }
                          : { color: 'rgba(255,255,255,0.2)' }}
                      >
                        {item.publicado ? <FiEye size={13} /> : <FiEyeOff size={13} />}
                      </button>
                      <button
                        onClick={() => { setEditing(item); setMode('edit') }}
                        title="Editar"
                        className="p-1.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                      >
                        <FiEdit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Eliminar"
                        className="p-1.5 rounded text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
