import { useState } from 'react'
import { FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'

const CATEGORIA_OPTIONS = [
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'NLP' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General' },
]

const NIVEL_OPTIONS = [
  { value: 'basico', label: 'Basico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
]

const SECTION_TYPE_OPTIONS = [
  { value: 'texto', label: 'Texto' },
  { value: 'codigo', label: 'Codigo' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'imagen', label: 'Imagen (URL)' },
  { value: 'video', label: 'Video (URL)' },
]

const emptySection = () => ({ tipo: 'texto', contenido: '', orden: 0 })
const emptyResource = () => ({ titulo: '', url: '', tipo: 'enlace' })

export default function TopicForm({ open, onClose, onSave, initialData, loading }) {
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [categoria, setCategoria] = useState(initialData?.categoria || '')
  const [nivel, setNivel] = useState(initialData?.nivel || '')
  const [sections, setSections] = useState(
    initialData?.contenido?.length ? initialData.contenido : [emptySection()]
  )
  const [recursos, setRecursos] = useState(
    initialData?.recursos?.length ? initialData.recursos : []
  )

  const addSection = () => {
    setSections(s => [...s, { ...emptySection(), orden: s.length }])
  }

  const removeSection = (idx) => {
    setSections(s => s.filter((_, i) => i !== idx).map((sec, i) => ({ ...sec, orden: i })))
  }

  const moveSection = (idx, dir) => {
    const next = idx + dir
    if (next < 0 || next >= sections.length) return
    const copy = [...sections]
    ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
    setSections(copy.map((s, i) => ({ ...s, orden: i })))
  }

  const updateSection = (idx, field, value) => {
    setSections(s => s.map((sec, i) => i === idx ? { ...sec, [field]: value } : sec))
  }

  const addResource = () => setRecursos(r => [...r, emptyResource()])
  const removeResource = (idx) => setRecursos(r => r.filter((_, i) => i !== idx))
  const updateResource = (idx, field, value) => {
    setRecursos(r => r.map((res, i) => i === idx ? { ...res, [field]: value } : res))
  }

  const handleSubmit = () => {
    if (!titulo.trim() || !categoria || !nivel) return
    onSave({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria,
      nivel,
      contenido: sections,
      recursos: recursos.filter(r => r.titulo && r.url),
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Editar Tema' : 'Nuevo Tema de Aprendizaje'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {initialData ? 'Guardar cambios' : 'Crear Tema'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Basic info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Titulo"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Ej: Introduccion a Redes Neuronales"
            containerClass="md:col-span-2"
          />
          <Select
            label="Categoria"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
            options={CATEGORIA_OPTIONS}
          />
          <Select
            label="Nivel"
            value={nivel}
            onChange={e => setNivel(e.target.value)}
            options={NIVEL_OPTIONS}
          />
        </div>

        <Textarea
          label="Descripcion"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Breve descripcion del tema..."
          rows={3}
        />

        {/* Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/70">Secciones de contenido</p>
            <Button variant="ghost" size="xs" icon={<FiPlus size={14} />} onClick={addSection}>
              Agregar seccion
            </Button>
          </div>

          <div className="space-y-3">
            {sections.map((sec, idx) => (
              <div
                key={idx}
                className="rounded-lg p-4 space-y-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center gap-2">
                  <Select
                    value={sec.tipo}
                    onChange={e => updateSection(idx, 'tipo', e.target.value)}
                    options={SECTION_TYPE_OPTIONS}
                    placeholder=""
                    containerClass="flex-1"
                  />
                  <button
                    onClick={() => moveSection(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded text-white/30 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <FiArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveSection(idx, 1)}
                    disabled={idx === sections.length - 1}
                    className="p-1.5 rounded text-white/30 hover:text-white disabled:opacity-30 transition-colors"
                  >
                    <FiArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => removeSection(idx)}
                    className="p-1.5 rounded text-white/30 hover:text-[#EF4444] transition-colors"
                  >
                    <FiTrash2 size={14} />
                  </button>
                </div>

                {sec.tipo === 'quiz' ? (
                  <div className="space-y-2">
                    <p className="text-xs text-white/40">
                      Formato JSON: {`{"pregunta": "...", "opciones": ["A","B","C","D"], "respuesta_correcta": 0}`}
                    </p>
                    <Textarea
                      value={typeof sec.contenido === 'string' ? sec.contenido : JSON.stringify(sec.contenido, null, 2)}
                      onChange={e => updateSection(idx, 'contenido', e.target.value)}
                      rows={5}
                      placeholder='{"pregunta": "...", "opciones": [...], "respuesta_correcta": 0}'
                    />
                  </div>
                ) : (
                  <Textarea
                    value={sec.contenido}
                    onChange={e => updateSection(idx, 'contenido', e.target.value)}
                    rows={sec.tipo === 'codigo' ? 8 : 4}
                    placeholder={
                      sec.tipo === 'codigo' ? 'Escribe o pega codigo aqui...' :
                      sec.tipo === 'imagen' ? 'URL de la imagen' :
                      sec.tipo === 'video'  ? 'URL del video (YouTube, etc.)' :
                      'Escribe el contenido aqui...'
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Resources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/70">Recursos adicionales</p>
            <Button variant="ghost" size="xs" icon={<FiPlus size={14} />} onClick={addResource}>
              Agregar recurso
            </Button>
          </div>

          <div className="space-y-2">
            {recursos.map((res, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  value={res.titulo}
                  onChange={e => updateResource(idx, 'titulo', e.target.value)}
                  placeholder="Titulo del recurso"
                  containerClass="flex-1"
                />
                <Input
                  value={res.url}
                  onChange={e => updateResource(idx, 'url', e.target.value)}
                  placeholder="https://..."
                  containerClass="flex-1"
                />
                <button
                  onClick={() => removeResource(idx)}
                  className="p-2 rounded text-white/30 hover:text-[#EF4444] transition-colors shrink-0"
                >
                  <FiTrash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
