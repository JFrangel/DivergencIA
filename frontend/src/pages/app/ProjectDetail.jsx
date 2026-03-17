import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiArrowLeft, FiPlus, FiEdit2, FiActivity, FiClock, FiGitBranch } from 'react-icons/fi'
import { useProject, useAdvances, useTasks } from '../../hooks/useProjects'
import { useAuth } from '../../context/AuthContext'
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
import { timeAgo } from '../../lib/utils'

export default function ProjectDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const { project, loading, setProject } = useProject(id)
  const { advances, create: createAdvance } = useAdvances(id)
  const { tasks, setTasks, create: createTask, updateTask, removeTask } = useTasks(id)

  const [tab, setTab] = useState('overview')
  const [showAdvForm, setShowAdvForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [metrics, setMetrics] = useState(project?.metricas || [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!project) return <div className="text-center py-20 text-white/30">Proyecto no encontrado</div>

  const totalTareas = tasks.length
  const done = tasks.filter(t => t.estado === 'completada').length
  const progress = totalTareas ? Math.round((done / totalTareas) * 100) : 0
  const isOwner = project.creador_id === user?.id

  const tabs = [
    { id: 'overview', label: 'Resumen' },
    { id: 'tasks', label: 'Kanban', count: totalTareas },
    { id: 'advances', label: 'Avances', count: advances.length },
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
        <Card>
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
                    <Avatar key={m.usuario?.id} name={m.usuario?.nombre || ''} area={m.usuario?.area_investigacion} size="sm" className="ring-2 ring-[#060304]" />
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
              {isOwner && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEditForm(true)}>
                  <FiEdit2 size={12} /> Editar
                </Button>
              )}
            </div>
          </div>
        </Card>
      </motion.div>

      <Tabs tabs={tabs} defaultTab="overview" onChange={setTab} />

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TeamSection members={project.miembros?.filter(m => m.activo) || []} canInvite={isOwner} />
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

      {tab === 'workflow' && (
        <WorkflowEditor projectId={id} initialData={project.workflow_data} />
      )}

      {tab === 'diagrams' && (
        <DiagramEditor projectId={id} />
      )}

      <AdvanceForm open={showAdvForm} onClose={() => setShowAdvForm(false)} onSubmit={createAdvance} />
      <ProjectForm open={showEditForm} onClose={() => setShowEditForm(false)} defaultValues={project}
        onSubmit={async (data) => { setProject(p => ({ ...p, ...data })); setShowEditForm(false) }} />
    </div>
  )
}
