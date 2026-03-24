import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiArrowLeft, FiPlus, FiEdit2, FiActivity, FiClock, FiTrash2, FiAlertTriangle, FiCamera, FiPaperclip, FiSearch, FiX, FiFile, FiImage, FiFilm, FiCode, FiDatabase, FiFileText } from 'react-icons/fi'
import { useProject, useAdvances, useTasks } from '../../hooks/useProjects'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { useLibrary } from '../../hooks/useLibrary'
import { timeAgo, formatBytes } from '../../lib/utils'
import ProjectKanban from '../../components/projects/ProjectKanban'
import WorkflowEditor from '../../components/workflow/WorkflowEditor'
import DiagramEditor from '../../components/diagrams/DiagramEditor'
import AdvanceForm from '../../components/projects/AdvanceForm'
import ProjectForm from '../../components/projects/ProjectForm'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import ProgressBar from '../../components/ui/ProgressBar'
import Spinner from '../../components/ui/Spinner'
import CommentSection from '../../components/ui/CommentSection'
import TeamSection from '../../components/projects/TeamSection'
import MetricsEditor from '../../components/projects/MetricsEditor'
import FileAttachments from '../../components/projects/FileAttachments'
import DynamicProjectCover from '../../components/projects/DynamicProjectCover'

const FILE_TYPE_META = {
  pdf:     { Icon: FiFileText, color: '#EF4444' },
  ppt:     { Icon: FiFile,     color: '#F59E0B' },
  dataset: { Icon: FiDatabase, color: '#22c55e' },
  code:    { Icon: FiCode,     color: '#00D1FF' },
  video:   { Icon: FiFilm,     color: '#8B5CF6' },
  imagen:  { Icon: FiImage,    color: '#FC651F' },
  general: { Icon: FiFile,     color: '#6b7280' },
}

function ProjectFileItem({ file, canUnlink, onUnlink }) {
  const meta = FILE_TYPE_META[file.tipo] || FILE_TYPE_META.general
  const { Icon, color } = meta
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.07] hover:border-white/15 transition-colors group"
      style={{ background: 'rgba(255,255,255,0.02)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
        <Icon size={16} style={{ color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 font-medium truncate">{file.nombre}</p>
        <p className="text-[11px] text-white/30">{file.tipo?.toUpperCase()} · {formatBytes(file.tamanio_bytes)}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <a href={file.url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.06] transition-colors" title="Abrir">
          <FiFile size={13} />
        </a>
        {canUnlink && (
          <button onClick={onUnlink}
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100" title="Desvincular">
            <FiX size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

function LibraryPickerModal({ open, projectId, onClose, onLinked }) {
  const [allFiles, setAllFiles] = useState([])
  const [search, setSearch] = useState('')
  const [linking, setLinking] = useState(null)

  useEffect(() => {
    if (!open) return
    supabase.from('archivos').select('id,nombre,tipo,tamanio_bytes,url,proyecto_id')
      .is('proyecto_id', null).order('fecha_subida', { ascending: false }).limit(100)
      .then(({ data }) => setAllFiles(data || []))
  }, [open])

  const filtered = allFiles.filter(f => f.nombre?.toLowerCase().includes(search.toLowerCase()))

  const handleLink = async (fileId) => {
    setLinking(fileId)
    await supabase.from('archivos').update({ proyecto_id: projectId }).eq('id', fileId)
    setLinking(null)
    setAllFiles(prev => prev.filter(f => f.id !== fileId))
    onLinked()
  }

  if (!open) return null
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div className="relative w-full max-w-lg rounded-2xl border border-white/10 shadow-2xl flex flex-col"
          style={{ background: 'rgba(12,6,8,0.97)', maxHeight: '80vh' }}
          initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
          <div className="flex items-center justify-between p-4 border-b border-white/[0.07]">
            <h3 className="text-sm font-semibold text-white/80">Adjuntar desde Biblioteca</h3>
            <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"><FiX size={15} /></button>
          </div>
          <div className="px-4 py-3 border-b border-white/[0.04]">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
              <FiSearch size={13} className="text-white/30 shrink-0" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar archivo..."
                className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/20 outline-none" autoFocus />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-white/25 text-sm">Sin archivos disponibles</div>
            ) : filtered.map(file => {
              const meta = FILE_TYPE_META[file.tipo] || FILE_TYPE_META.general
              return (
                <button key={file.id} onClick={() => handleLink(file.id)} disabled={linking === file.id}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.05] transition-colors text-left group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${meta.color}18` }}>
                    <meta.Icon size={14} style={{ color: meta.color }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white/75 font-medium truncate">{file.nombre}</p>
                    <p className="text-[10px] text-white/25">{file.tipo?.toUpperCase()} · {formatBytes(file.tamanio_bytes)}</p>
                  </div>
                  <span className="text-[11px] text-white/30 group-hover:text-white/60 transition-colors shrink-0">
                    {linking === file.id ? 'Vinculando...' : 'Adjuntar →'}
                  </span>
                </button>
              )
            })}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default function ProjectDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const { project, loading, setProject, updateProject, addMember, removeMember, updateMemberRole, deleteProject } = useProject(id)
  const { advances, create: createAdvance } = useAdvances(id)
  const { tasks, setTasks, create: createTask, updateTask, removeTask } = useTasks(id)

  const { files: projectFiles, loading: filesLoading, refetch: refetchFiles } = useLibrary({ projectId: id })
  const [showLibraryPicker, setShowLibraryPicker] = useState(false)

  const coverInputRef = useRef(null)
  const [tab, setTab] = useState('overview')
  const [showAdvForm, setShowAdvForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [metrics, setMetrics] = useState(project?.metricas || [])
  const [coverUploading, setCoverUploading] = useState(false)

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!project) return <div className="text-center py-20 text-white/30">Proyecto no encontrado</div>

  const totalTareas = tasks.length
  const done = tasks.filter(t => t.estado === 'completada').length
  const progress = totalTareas ? Math.round((done / totalTareas) * 100) : 0
  const isOwner = project.creador_id === user?.id
  const canManageTeam = isOwner || isAdmin

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 4 * 1024 * 1024) { alert('Máximo 4MB'); return }

    setCoverUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `covers/${id}/cover_${Date.now()}.${ext}`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      await supabase.from('proyectos').update({ cover_url: publicUrl }).eq('id', id)
      setProject(p => ({ ...p, cover_url: publicUrl }))
    } catch (err) {
      console.error('Cover upload error:', err)
    } finally {
      setCoverUploading(false)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteProject()
    setDeleting(false)
    if (!result?.error) {
      setShowDeleteConfirm(false)
      navigate('/projects')
    }
  }

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'tasks', label: 'Kanban', count: totalTareas },
    { id: 'advances', label: 'Avances', count: advances.length },
    { id: 'biblioteca', label: 'Biblioteca', count: projectFiles.length || undefined },
    { id: 'metrics', label: 'Métricas' },
    { id: 'workflow', label: 'Workflow' },
    { id: 'diagrams', label: 'Diagramas' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors">
        <FiArrowLeft size={14} /> Proyectos
      </Link>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card padding={false} className="overflow-hidden">
          {/* Cover */}
          <input ref={coverInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleCoverUpload} />
          <div
            className="relative h-28 group cursor-pointer"
            onClick={() => canManageTeam && coverInputRef.current?.click()}
          >
            {project.cover_url ? (
              <img src={project.cover_url} alt="" className="w-full h-full object-cover" />
            ) : project.area ? (
              <DynamicProjectCover area={project.area} height={112} />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <span className="text-6xl select-none" style={{ opacity: 0.12 }}>📁</span>
              </div>
            )}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.6))' }} />
            {canManageTeam && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  {coverUploading
                    ? <span className="text-xs">Subiendo...</span>
                    : <><FiCamera size={15} /><span>Cambiar portada</span></>
                  }
                </div>
              </div>
            )}
          </div>

          <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl font-bold font-title text-white">{project.titulo}</h1>
                <Badge estado={project.estado} />
              </div>
              {project.descripcion && (
                <p className="text-white/50 text-sm leading-relaxed mb-4">{project.descripcion}</p>
              )}
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {project.miembros?.filter(m => m.activo).slice(0, 6).map(m => (
                    <Avatar key={m.usuario?.id} name={m.usuario?.nombre || ''} src={m.usuario?.foto_url} area={m.usuario?.area_investigacion} size="sm" className="ring-2 ring-[#060304]" />
                  ))}
                </div>
                <span className="text-xs text-white/30">{project.miembros?.length || 0} miembro{project.miembros?.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2 items-end">
              {totalTareas > 0 && (
                <div className="text-right w-36">
                  <div className="flex justify-between text-[11px] text-white/30 mb-1">
                    <span>Progreso</span><span>{progress}%</span>
                  </div>
                  <ProgressBar value={progress} max={100} height={5} />
                </div>
              )}
              {canManageTeam && (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditForm(true)}>
                    <FiEdit2 size={12} /> Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-[#EF4444]/60 hover:text-[#EF4444] hover:bg-[#EF4444]/5"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <FiTrash2 size={12} /> Eliminar
                  </Button>
                </div>
              )}
            </div>
          </div>
          </div>
        </Card>
      </motion.div>

      <Tabs tabs={tabs} defaultTab="overview" onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamSection
              members={project.miembros?.filter(m => m.activo) || []}
              canInvite={canManageTeam}
              isOwner={canManageTeam}
              creadorId={project.creador_id}
              onAddMember={addMember}
              onRemoveMember={removeMember}
              onUpdateRole={updateMemberRole}
            />
            <Card>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">Estadísticas</h3>
              <div className="space-y-3">
                {[
                  { label: 'Tareas completadas', value: `${done}/${totalTareas}`, color: '#22c55e' },
                  { label: 'Avances registrados', value: advances.length, color: '#FC651F' },
                  { label: 'Progreso general', value: `${progress}%`, color: '#8B5CF6' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between">
                    <span className="text-sm text-white/40">{s.label}</span>
                    <span className="text-sm font-semibold" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card>
            <MetricsEditor metrics={metrics} onChange={setMetrics} area={project.area} />
          </Card>
        </div>
      )}

      {tab === 'tasks' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-white/40">{totalTareas} tareas · {done} completadas</p>
            <Button variant="outline" size="sm" className="gap-1.5"
              onClick={async () => {
                const { data } = await createTask({ titulo: 'Nueva tarea', estado: 'pendiente', prioridad: 'media' })
                if (data) {
                  const event = new CustomEvent('kanban:edit-task', { detail: data })
                  window.dispatchEvent(event)
                }
              }}>
              <FiPlus size={13} /> Tarea
            </Button>
          </div>
          <ProjectKanban
            tasks={tasks}
            setTasks={setTasks}
            onUpdateTask={updateTask}
            onDeleteTask={removeTask}
            members={project.miembros?.filter(m => m.activo) || []}
            onAddTask={async (estado) => {
              const { data } = await createTask({ titulo: 'Nueva tarea', estado, prioridad: 'media' })
              if (data) {
                // Open edit modal immediately for the new task
                const event = new CustomEvent('kanban:edit-task', { detail: data })
                window.dispatchEvent(event)
              }
            }}
          />
        </div>
      )}

      {tab === 'advances' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="solid" size="sm" className="gap-1.5" onClick={() => setShowAdvForm(true)}>
              <FiPlus size={13} /> Registrar avance
            </Button>
          </div>
          {advances.length === 0 ? (
            <Card className="text-center py-10">
              <FiActivity size={28} className="mx-auto text-white/10 mb-3" />
              <p className="text-white/30 text-sm">No hay avances aún</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {advances.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FC651F]/10 flex items-center justify-center shrink-0 text-[#FC651F]">
                        <FiActivity size={14} />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white text-sm">{a.titulo}</p>
                        {a.descripcion && <p className="text-white/40 text-sm mt-1">{a.descripcion}</p>}
                        {a.proximos_pasos && <p className="text-white/30 text-xs mt-2 border-l-2 border-white/10 pl-2">{a.proximos_pasos}</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <Avatar name={a.autor?.nombre || ''} size="xs" />
                          <span className="text-[11px] text-white/30">{a.autor?.nombre}</span>
                          <span className="text-[11px] text-white/20 flex items-center gap-0.5">
                            <FiClock size={9} /> {timeAgo(a.fecha)}
                          </span>
                        </div>
                        {/* Comments on this advance */}
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <CommentSection avanceId={a.id} maxHeight={180} />
                        </div>
                        <div className="mt-3 pt-3 border-t border-white/[0.04]">
                          <FileAttachments avanceId={a.id} attachments={a.adjuntos || []} />
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'metrics' && (
        <Card>
          <MetricsEditor metrics={metrics} onChange={setMetrics} area={project.area} />
        </Card>
      )}

      {tab === 'biblioteca' && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white/70">Archivos del proyecto</h3>
            {canManageTeam && (
              <Button size="sm" onClick={() => setShowLibraryPicker(true)}>
                <FiPaperclip size={13} /> Adjuntar de Biblioteca
              </Button>
            )}
          </div>
          {filesLoading ? (
            <div className="text-white/30 text-sm py-6 text-center">Cargando archivos...</div>
          ) : projectFiles.length === 0 ? (
            <div className="text-white/20 text-sm py-10 text-center flex flex-col items-center gap-2">
              <FiPaperclip size={24} />
              <span>No hay archivos adjuntos a este proyecto.</span>
              {canManageTeam && <span className="text-white/15">Usa el botón "Adjuntar de Biblioteca" para vincular archivos.</span>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {projectFiles.map(file => (
                <ProjectFileItem
                  key={file.id}
                  file={file}
                  canUnlink={canManageTeam}
                  onUnlink={async () => {
                    await supabase.from('archivos').update({ proyecto_id: null }).eq('id', file.id)
                    refetchFiles()
                  }}
                />
              ))}
            </div>
          )}
        </Card>
      )}

      {tab === 'workflow' && (
        <WorkflowEditor projectId={id} initialData={project.workflow_data} tasks={tasks} />
      )}

      {tab === 'diagrams' && (
        <DiagramEditor projectId={id} />
      )}

      <LibraryPickerModal
        open={showLibraryPicker}
        projectId={id}
        onClose={() => setShowLibraryPicker(false)}
        onLinked={refetchFiles}
      />

      <AdvanceForm open={showAdvForm} onClose={() => setShowAdvForm(false)} onSubmit={createAdvance} />
      <ProjectForm open={showEditForm} onClose={() => setShowEditForm(false)} defaultValues={project}
        onSubmit={async (data) => { await updateProject(data); setShowEditForm(false) }} />

      {/* Delete confirm modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !deleting && setShowDeleteConfirm(false)} />
            <motion.div
              className="relative w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl"
              style={{ background: 'rgba(12,6,8,0.97)' }}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                  <FiAlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Eliminar proyecto</h3>
                  <p className="text-xs text-white/40">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <p className="mb-5 text-sm text-white/50">
                Se eliminarán permanentemente el proyecto <span className="font-medium text-white">"{project.titulo}"</span>, sus tareas y sus avances.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} disabled={deleting}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border-0"
                  onClick={handleDelete}
                  loading={deleting}
                >
                  <FiTrash2 size={12} /> Eliminar proyecto
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
